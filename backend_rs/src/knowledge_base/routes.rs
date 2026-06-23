use axum::{
    extract::{Multipart, Path as AxumPath},
    http::StatusCode,
    response::IntoResponse,
    Json,
};
use serde_json::json;
use std::collections::HashMap;
use std::fs;
use std::path::Path;

use crate::knowledge_base::schemas::DocumentDetails;

fn get_db_path() -> String {
    "src/knowledge_base/data/documents.json".to_string()
}

fn load_db() -> HashMap<String, DocumentDetails> {
    let path_str = get_db_path();
    let path = Path::new(&path_str);
    if let Some(parent) = path.parent() {
        let _ = fs::create_dir_all(parent);
    }

    if path.exists() {
        if let Ok(content) = fs::read_to_string(path) {
            if let Ok(db) = serde_json::from_str::<HashMap<String, DocumentDetails>>(&content) {
                return db;
            }
        }
    }
    HashMap::new()
}

fn save_db(db: &HashMap<String, DocumentDetails>) -> Result<(), String> {
    let path_str = get_db_path();
    let path = Path::new(&path_str);
    if let Some(parent) = path.parent() {
        let _ = fs::create_dir_all(parent);
    }

    let content = match serde_json::to_string_pretty(db) {
        Ok(c) => c,
        Err(e) => return Err(format!("Serialization failed: {}", e)),
    };

    if let Err(e) = fs::write(path, content) {
        return Err(format!("Write failed: {}", e));
    }
    Ok(())
}

pub async fn ingest_file(mut multipart: Multipart) -> Result<impl IntoResponse, (StatusCode, Json<serde_json::Value>)> {
    let mut file_bytes = Vec::new();
    let mut filename = String::new();
    let mut scope = "team".to_string();
    let mut owner_id = String::new();
    let mut team_id = String::new();
    let mut chunk_size_tokens = 3000;
    let mut chunk_overlap_tokens = 300;

    while let Ok(Some(field)) = multipart.next_field().await {
        let name = field.name().unwrap_or_default().to_string();
        if name == "file" {
            filename = field.file_name().unwrap_or_default().to_string();
            file_bytes = match field.bytes().await {
                Ok(b) => b.to_vec(),
                Err(e) => return Err((
                    StatusCode::BAD_REQUEST,
                    Json(json!({ "detail": format!("Failed to read file bytes: {}", e) })),
                )),
            };
        } else if let Ok(val) = field.text().await {
            match name.as_str() {
                "scope" => scope = val,
                "owner_id" => owner_id = val,
                "team_id" => team_id = val,
                "chunk_size_tokens" => chunk_size_tokens = val.parse().unwrap_or(3000),
                "chunk_overlap_tokens" => chunk_overlap_tokens = val.parse().unwrap_or(300),
                _ => {}
            }
        }
    }

    if file_bytes.is_empty() || filename.is_empty() {
        return Err((
            StatusCode::BAD_REQUEST,
            Json(json!({ "detail": "Missing file payload" })),
        ));
    }
    if owner_id.is_empty() || team_id.is_empty() {
        return Err((
            StatusCode::BAD_REQUEST,
            Json(json!({ "detail": "Missing owner_id or team_id" })),
        ));
    }

    // Extract text
    let text = match crate::knowledge_base::parser::extract_text_from_bytes(&file_bytes, &filename) {
        Ok(t) => t,
        Err(e) => return Err((
            StatusCode::BAD_REQUEST,
            Json(json!({ "detail": e })),
        )),
    };

    if text.trim().is_empty() {
        return Err((
            StatusCode::BAD_REQUEST,
            Json(json!({ "detail": "Extracted text is empty" })),
        ));
    }

    // Split text
    let splitter = crate::knowledge_base::chunker::RecursiveTextSplitter::new(chunk_size_tokens, chunk_overlap_tokens);
    let chunks = splitter.split_text(&text);

    let document_id = uuid::Uuid::new_v4().to_string();
    let created_at = chrono::Utc::now().to_rfc3339_opts(chrono::SecondsFormat::Secs, true); // formats as YYYY-MM-DDTHH:MM:SSZ

    let mut processed_chunks = Vec::new();
    let mut all_tags = std::collections::HashSet::new();

    for (idx, content) in chunks.into_iter().enumerate() {
        let chunk_id = format!("{}_chunk_{}", document_id, idx);
        let tags = crate::knowledge_base::tagger::generate_semantic_tags(&content).await;
        for t in &tags {
            all_tags.insert(t.clone());
        }

        let metadata = crate::knowledge_base::schemas::ChunkMetadata {
            document_id: document_id.clone(),
            scope: scope.clone(),
            owner_id: owner_id.clone(),
            team_id: team_id.clone(),
            tags,
            source_type: "file".to_string(),
            file_name: Some(filename.clone()),
            created_at: created_at.clone(),
        };

        let token_count = std::cmp::max(1, (content.split_whitespace().count() as f64 * 1.3) as u32);

        let chunk = crate::knowledge_base::schemas::DocumentChunk {
            chunk_id,
            document_id: document_id.clone(),
            content,
            tokens_count: token_count,
            metadata,
        };

        processed_chunks.push(chunk);
    }

    let mut db = load_db();
    let doc_details = crate::knowledge_base::schemas::DocumentDetails {
        document_id: document_id.clone(),
        source_type: "file".to_string(),
        file_name: Some(filename.clone()),
        scope: scope.clone(),
        owner_id: owner_id.clone(),
        team_id: team_id.clone(),
        created_at: created_at.clone(),
        all_tags: all_tags.iter().cloned().collect(),
        chunks: processed_chunks.clone(),
    };

    db.insert(document_id.clone(), doc_details);
    if let Err(e) = save_db(&db) {
        return Err((
            StatusCode::INTERNAL_SERVER_ERROR,
            Json(json!({ "detail": format!("Failed to save DB: {}", e) })),
        ));
    }

    Ok(Json(json!({
        "status": "success",
        "document_id": document_id,
        "file_name": filename,
        "total_chunks": processed_chunks.len(),
        "tags": all_tags.into_iter().collect::<Vec<String>>(),
        "chunks": processed_chunks
    })))
}

pub async fn ingest_slack(
    Json(payload): Json<crate::knowledge_base::schemas::SlackThreadIngestionRequest>,
) -> Result<impl IntoResponse, (StatusCode, Json<serde_json::Value>)> {
    if payload.messages.is_empty() {
        return Err((
            StatusCode::BAD_REQUEST,
            Json(json!({ "detail": "Slack thread must contain at least one message" })),
        ));
    }

    let thread_text = crate::knowledge_base::parser::format_slack_thread(&payload.messages);

    let splitter = crate::knowledge_base::chunker::RecursiveTextSplitter::new(3000, 300);
    let chunks = splitter.split_text(&thread_text);

    let document_id = format!("slack_thread_{}", payload.thread_ts);
    let created_at = chrono::Utc::now().to_rfc3339_opts(chrono::SecondsFormat::Secs, true);

    let mut processed_chunks = Vec::new();
    let mut all_tags = std::collections::HashSet::new();

    for (idx, content) in chunks.into_iter().enumerate() {
        let chunk_id = format!("{}_chunk_{}", document_id, idx);
        let tags = crate::knowledge_base::tagger::generate_semantic_tags(&content).await;
        for t in &tags {
            all_tags.insert(t.clone());
        }

        let metadata = crate::knowledge_base::schemas::ChunkMetadata {
            document_id: document_id.clone(),
            scope: payload.scope.clone(),
            owner_id: payload.owner_id.clone(),
            team_id: payload.team_id.clone(),
            tags,
            source_type: "slack_thread".to_string(),
            file_name: None,
            created_at: created_at.clone(),
        };

        let token_count = std::cmp::max(1, (content.split_whitespace().count() as f64 * 1.3) as u32);

        let chunk = crate::knowledge_base::schemas::DocumentChunk {
            chunk_id,
            document_id: document_id.clone(),
            content,
            tokens_count: token_count,
            metadata,
        };

        processed_chunks.push(chunk);
    }

    let mut db = load_db();
    let doc_details = crate::knowledge_base::schemas::DocumentDetails {
        document_id: document_id.clone(),
        source_type: "slack_thread".to_string(),
        file_name: None,
        scope: payload.scope.clone(),
        owner_id: payload.owner_id.clone(),
        team_id: payload.team_id.clone(),
        created_at: created_at.clone(),
        all_tags: all_tags.iter().cloned().collect(),
        chunks: processed_chunks.clone(),
    };

    db.insert(document_id.clone(), doc_details);
    if let Err(e) = save_db(&db) {
        return Err((
            StatusCode::INTERNAL_SERVER_ERROR,
            Json(json!({ "detail": format!("Failed to save DB: {}", e) })),
        ));
    }

    Ok(Json(json!({
        "status": "success",
        "document_id": document_id,
        "total_chunks": processed_chunks.len(),
        "tags": all_tags.into_iter().collect::<Vec<String>>(),
        "chunks": processed_chunks
    })))
}

pub async fn list_documents() -> impl IntoResponse {
    let db = load_db();
    let mut summaries = Vec::new();

    for (doc_id, doc) in db {
        summaries.push(crate::knowledge_base::schemas::DocumentSummary {
            document_id: doc_id,
            source_type: doc.source_type,
            file_name: doc.file_name,
            scope: doc.scope,
            owner_id: doc.owner_id,
            team_id: doc.team_id,
            created_at: doc.created_at,
            tags: doc.all_tags,
            total_chunks: doc.chunks.len(),
        });
    }

    Json(summaries)
}

pub async fn get_document(
    AxumPath(document_id): AxumPath<String>,
) -> Result<impl IntoResponse, (StatusCode, Json<serde_json::Value>)> {
    let db = load_db();
    match db.get(&document_id) {
        Some(doc) => Ok(Json(doc.clone())),
        None => Err((
            StatusCode::NOT_FOUND,
            Json(json!({ "detail": format!("Document with ID {} not found", document_id) })),
        )),
    }
}

pub async fn delete_document(
    AxumPath(document_id): AxumPath<String>,
) -> Result<impl IntoResponse, (StatusCode, Json<serde_json::Value>)> {
    let mut db = load_db();
    if db.remove(&document_id).is_some() {
        if let Err(e) = save_db(&db) {
            return Err((
                StatusCode::INTERNAL_SERVER_ERROR,
                Json(json!({ "detail": format!("Failed to save DB: {}", e) })),
            ));
        }
        Ok(Json(json!({ "status": "success", "message": format!("Document {} deleted", document_id) })))
    } else {
        Err((
            StatusCode::NOT_FOUND,
            Json(json!({ "detail": format!("Document with ID {} not found", document_id) })),
        ))
    }
}

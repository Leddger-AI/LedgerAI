use serde::{Deserialize, Serialize};

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct ChunkMetadata {
    pub document_id: String,
    pub scope: String, // "personal" | "team" | "org"
    pub owner_id: String,
    pub team_id: String,
    pub tags: Vec<String>,
    pub source_type: String, // "file" | "slack_thread"
    pub file_name: Option<String>,
    pub created_at: String,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct DocumentChunk {
    pub chunk_id: String,
    pub document_id: String,
    pub content: String,
    pub tokens_count: u32,
    pub metadata: ChunkMetadata,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct SlackMessage {
    pub user_id: String,
    pub text: String,
    pub timestamp: String,
    pub thread_ts: Option<String>,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct SlackThreadIngestionRequest {
    pub thread_ts: String,
    pub messages: Vec<SlackMessage>,
    #[serde(default = "default_scope")]
    pub scope: String,
    pub owner_id: String,
    pub team_id: String,
}

fn default_scope() -> String {
    "team".to_string()
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct DocumentDetails {
    pub document_id: String,
    pub source_type: String,
    pub file_name: Option<String>,
    pub scope: String,
    pub owner_id: String,
    pub team_id: String,
    pub created_at: String,
    pub all_tags: Vec<String>,
    pub chunks: Vec<DocumentChunk>,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct DocumentSummary {
    pub document_id: String,
    pub source_type: String,
    pub file_name: Option<String>,
    pub scope: String,
    pub owner_id: String,
    pub team_id: String,
    pub created_at: String,
    pub tags: Vec<String>,
    pub total_chunks: usize,
}

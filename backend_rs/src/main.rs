pub mod ai_engine;
pub mod auth;
pub mod routes;
pub mod knowledge_base;

use axum::{
    http::{Method, StatusCode},
    routing::{get, post},
    Json, Router,
};
use serde::Deserialize;
use std::env;
use std::net::SocketAddr;
use tower_http::cors::{Any, CorsLayer};

use ai_engine::attribute_meeting;
use routes::{get_calendar_events, github_callback};
use knowledge_base::routes::{ingest_file, ingest_slack, list_documents, get_document, delete_document};

#[derive(Deserialize)]
pub struct MeetingPayload {
    pub title: String,
    pub description: String,
    pub duration_minutes: u32,
    pub attendees_count: u32,
}

async fn attribute_meeting_endpoint(
    Json(payload): Json<MeetingPayload>,
) -> Result<Json<ai_engine::AttributionResponse>, StatusCode> {
    let response = attribute_meeting(
        &payload.title,
        &payload.description,
        payload.duration_minutes,
        payload.attendees_count,
    )
    .await;
    Ok(Json(response))
}

#[tokio::main]
async fn main() {
    // Load environment variables from root .env file (since backend/ will be deleted)
    let _ = dotenvy::from_path(".env");
    let _ = dotenvy::dotenv();

    // Enable CORS for frontend client-side calls
    let cors = CorsLayer::new()
        .allow_origin(Any)
        .allow_methods(vec![Method::GET, Method::POST, Method::DELETE, Method::OPTIONS])
        .allow_headers(Any);

    let app = Router::new()
        .route("/api/calendar/events", get(get_calendar_events))
        .route("/api/github/callback", get(github_callback))
        .route("/ai/attribute-meeting", post(attribute_meeting_endpoint))
        // Knowledge Base Routes
        .route("/api/kb/ingest/file", post(ingest_file))
        .route("/api/kb/ingest/slack", post(ingest_slack))
        .route("/api/kb/documents", get(list_documents))
        .route("/api/kb/documents/:document_id", get(get_document).delete(delete_document))
        .layer(cors);

    let port = env::var("PORT")
        .ok()
        .and_then(|p| p.parse::<u16>().ok())
        .unwrap_or(8000);
    let addr = SocketAddr::from(([0, 0, 0, 0], port));
    println!("Ledger AI Rust Backend listening on {}", addr);

    let listener = tokio::net::TcpListener::bind(addr).await.unwrap();
    axum::serve(listener, app).await.unwrap();
}

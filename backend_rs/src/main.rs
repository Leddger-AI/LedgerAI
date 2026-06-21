pub mod ai_engine;
pub mod auth;
pub mod routes;

use axum::{
    http::{Method, StatusCode},
    routing::{get, post},
    Json, Router,
};
use serde::Deserialize;
use std::net::SocketAddr;
use tower_http::cors::{Any, CorsLayer};

use ai_engine::attribute_meeting;
use routes::{get_calendar_events, github_callback};

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
    // Load environment variables from .env file
    let _ = dotenvy::from_path("../backend/.env");
    let _ = dotenvy::dotenv();

    // Enable CORS for frontend client-side calls
    let cors = CorsLayer::new()
        .allow_origin(Any)
        .allow_methods(vec![Method::GET, Method::POST, Method::OPTIONS])
        .allow_headers(Any);

    let app = Router::new()
        .route("/api/calendar/events", get(get_calendar_events))
        .route("/api/github/callback", get(github_callback))
        .route("/ai/attribute-meeting", post(attribute_meeting_endpoint))
        .layer(cors);

    let addr = SocketAddr::from(([0, 0, 0, 0], 8000));
    println!("Ledger AI Rust Backend listening on {}", addr);

    let listener = tokio::net::TcpListener::bind(addr).await.unwrap();
    axum::serve(listener, app).await.unwrap();
}

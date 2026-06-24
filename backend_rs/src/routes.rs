use axum::{
    extract::Query,
    response::{IntoResponse, Redirect},
    Json,
};
use chrono::{DateTime, Duration, Utc};
use reqwest::Client;
use serde::{Deserialize, Serialize};
use serde_json::json;
use std::env;

use crate::{ai_engine::attribute_meeting, auth::AuthUser};

#[derive(Deserialize)]
pub struct CalendarQuery {
    google_token: String,
}

#[derive(Serialize)]
pub struct FormattedEvent {
    #[serde(rename = "eventId")]
    event_id: String,
    title: String,
    description: String,
    #[serde(rename = "startTime")]
    start_time: String,
    #[serde(rename = "endTime")]
    end_time: String,
    #[serde(rename = "durationMinutes")]
    duration_minutes: i64,
    attendees: Vec<serde_json::Value>,
    organizer: Option<String>,
    #[serde(rename = "aiProject")]
    ai_project: String,
    #[serde(rename = "aiConfidence")]
    ai_confidence: u32,
    #[serde(rename = "aiReasoning")]
    ai_reasoning: String,
    cost: f64,
    #[serde(rename = "requiresHumanReview")]
    requires_human_review: bool,
}

pub async fn get_calendar_events(
    auth_user: AuthUser,
    Query(query): Query<CalendarQuery>,
) -> impl IntoResponse {
    let client = Client::new();

    let now = Utc::now();
    let time_min = (now - Duration::days(7)).to_rfc3339();
    let time_max = now.to_rfc3339();

    let url = format!(
        "https://www.googleapis.com/calendar/v3/calendars/primary/events?timeMin={}&timeMax={}&singleEvents=true&orderBy=startTime",
        urlencoding::encode(&time_min),
        urlencoding::encode(&time_max)
    );

    let res = client
        .get(&url)
        .bearer_auth(&query.google_token)
        .send()
        .await;

    let res = match res {
        Ok(r) if r.status().is_success() => r,
        _ => {
            return (
                axum::http::StatusCode::UNAUTHORIZED,
                Json(json!({"detail": "Google Access Token is expired or invalid. Please re-authenticate."})),
            ).into_response();
        }
    };

    let calendar_data: serde_json::Value = res.json().await.unwrap_or(json!({}));
    let items = calendar_data["items"].as_array().unwrap_or(&vec![]).clone();

    let mut formatted_events = Vec::new();

    for event in items {
        let summary = event["summary"].as_str().unwrap_or("Untitled Meeting");
        let description = event["description"].as_str().unwrap_or("");
        
        let start_str = event["start"]["dateTime"].as_str().or(event["start"]["date"].as_str()).unwrap_or("");
        let end_str = event["end"]["dateTime"].as_str().or(event["end"]["date"].as_str()).unwrap_or("");

        let mut duration_minutes = 0;
        if let (Ok(start_dt), Ok(end_dt)) = (DateTime::parse_from_rfc3339(start_str), DateTime::parse_from_rfc3339(end_str)) {
            duration_minutes = (end_dt - start_dt).num_minutes();
        }

        let attendees_array = event["attendees"].as_array().unwrap_or(&vec![]).clone();
        let mut attendees = Vec::new();
        for att in attendees_array.iter() {
            attendees.push(json!({
                "email": att["email"].as_str(),
                "name": att["displayName"].as_str().unwrap_or("Unknown"),
                "response": att["responseStatus"].as_str(),
            }));
        }

        let attribution = attribute_meeting(
            summary,
            description,
            duration_minutes.max(0) as u32,
            attendees.len() as u32,
        ).await;

        let attendees_count = attendees.len();
        let total_attendee_hourly_rate = (attendees_count.max(1) as f64) * 75.0;
        let duration_hours = (duration_minutes as f64) / 60.0;
        let total_cost = duration_hours * total_attendee_hourly_rate;
        let requires_human_review = attribution.confidence_score < 60;

        formatted_events.push(FormattedEvent {
            event_id: event["id"].as_str().unwrap_or("").to_string(),
            title: summary.to_string(),
            description: description.to_string(),
            start_time: start_str.to_string(),
            end_time: end_str.to_string(),
            duration_minutes,
            attendees,
            organizer: event["organizer"]["email"].as_str().map(|s| s.to_string()),
            ai_project: attribution.project_name,
            ai_confidence: attribution.confidence_score,
            ai_reasoning: attribution.reasoning,
            cost: total_cost,
            requires_human_review,
        });
    }

    Json(json!({
        "status": "success",
        "firebaseUid": auth_user.0.get_uid(),
        "email": auth_user.0.email,
        "range": "Past 7 Days",
        "count": formatted_events.len(),
        "events": formatted_events
    })).into_response()
}

#[derive(Deserialize)]
pub struct GithubCallbackQuery {
    code: String,
    state: Option<String>,
    installation_id: Option<String>,
}

pub async fn github_callback(Query(query): Query<GithubCallbackQuery>) -> impl IntoResponse {
    let client_id = env::var("GITHUB_CLIENT_ID").unwrap_or_default();
    let client_secret = env::var("GITHUB_CLIENT_SECRET").unwrap_or_default();
    let frontend_base = env::var("FRONTEND_URL").unwrap_or_else(|_| "http://localhost:5173".to_string());

    if client_id.is_empty() || client_secret.is_empty() {
        return Redirect::to(&format!("{}/candidate-flow?error=missing_credentials", frontend_base));
    }

    let client = Client::new();
    let token_res = client
        .post("https://github.com/login/oauth/access_token")
        .header("Accept", "application/json")
        .form(&[
            ("client_id", client_id.as_str()),
            ("client_secret", client_secret.as_str()),
            ("code", query.code.as_str()),
        ])
        .send()
        .await;

    let token = match token_res {
        Ok(res) => {
            if let Ok(json_body) = res.json::<serde_json::Value>().await {
                json_body["access_token"].as_str().unwrap_or("").to_string()
            } else {
                return Redirect::to(&format!("{}/candidate-flow?error=no_token", frontend_base));
            }
        }
        Err(_) => return Redirect::to(&format!("{}/candidate-flow?error=token_request_failed", frontend_base)),
    };

    if token.is_empty() {
        return Redirect::to(&format!("{}/candidate-flow?error=no_token", frontend_base));
    }

    let user_res = client
        .get("https://api.github.com/user")
        .bearer_auth(&token)
        .header("User-Agent", "LedgerAI-App")
        .send()
        .await;

    let github_username = match user_res {
        Ok(res) => {
            if let Ok(json_body) = res.json::<serde_json::Value>().await {
                json_body["login"].as_str().unwrap_or("").to_string()
            } else {
                "".to_string()
            }
        }
        Err(_) => "".to_string(),
    };

    println!(
        "MOCK: Saving to Firestore for user {} -> username {}, token {}",
        query.state.unwrap_or("unknown".to_string()),
        github_username,
        token
    );

    let mut redirect_url = format!(
        "{}/candidate-flow?status=connected&githubUsername={}&githubToken={}",
        frontend_base,
        urlencoding::encode(&github_username),
        urlencoding::encode(&token)
    );

    if let Some(inst_id) = query.installation_id {
        redirect_url.push_str(&format!("&installation_id={}", urlencoding::encode(&inst_id)));
    }

    Redirect::to(&redirect_url)
}

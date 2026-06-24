use serde::{Deserialize, Serialize};
use std::env;
use reqwest::Client;
use serde_json::json;

#[derive(Debug, Serialize, Deserialize)]
pub struct AttributionResponse {
    pub project_name: String,
    pub confidence_score: u32,
    pub reasoning: String,
}

pub async fn attribute_meeting(
    title: &str,
    description: &str,
    duration_minutes: u32,
    attendees_count: u32,
) -> AttributionResponse {
    let api_key = env::var("GEMINI_API_KEY").unwrap_or_default();

    if api_key.is_empty() {
        return fallback_attribute_meeting(title, description);
    }

    let prompt = format!(
        "You are an expert HR cost intelligence agent. Your job is to analyze a calendar meeting's context and assign it to the most appropriate project from the provided taxonomy list.\n\
        \n\
        Available Projects:\n\
        1. \"Project Phoenix\" - Core database upgrades and backend architecture.\n\
        2. \"Client ABC Onboarding\" - Frontend integration, user feedback, and client calls for ABC.\n\
        3. \"Q4 Marketing Strategy\" - Social media campaigns, ad design, and growth metrics.\n\
        4. \"Internal Operations\" - General standups, HR syncs, 1-on-1s, and administrative work.\n\
        \n\
        Rules:\n\
        - Select exactly ONE project from the list. If it does not match 1, 2, or 3, default to \"Internal Operations\".\n\
        - Provide a confidence score between 0 and 100 based on keyword match strength.\n\
        - If the meeting context is highly ambiguous, set a low confidence score (< 50).\n\
        \n\
        Meeting Context to Analyze:\n\
        Title: {}\n\
        Description: {}\n\
        Duration: {} minutes\n\
        Attendees Count: {}",
        title, description, duration_minutes, attendees_count
    );

    let client = Client::new();
    let url = format!("https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key={}", api_key);

    let request_body = json!({
        "contents": [{
            "parts": [{"text": prompt}]
        }],
        "systemInstruction": {
            "parts": [{"text": "You are an expert HR cost intelligence agent. Your job is to analyze a calendar meeting's context and assign it to the most appropriate project from the provided taxonomy list. Set temperature to 0.1 for deterministic results. Respond in JSON with schema: {project_name: string, confidence_score: int, reasoning: string}"}]
        },
        "generationConfig": {
            "responseMimeType": "application/json",
            "temperature": 0.1
        }
    });

    match client.post(&url).json(&request_body).send().await {
        Ok(res) if res.status().is_success() => {
            if let Ok(json_res) = res.json::<serde_json::Value>().await {
                if let Some(text) = json_res["candidates"][0]["content"]["parts"][0]["text"].as_str() {
                    if let Ok(parsed) = serde_json::from_str::<AttributionResponse>(text) {
                        return parsed;
                    }
                }
            }
        }
        _ => {}
    }

    AttributionResponse {
        project_name: "Internal Operations".to_string(),
        confidence_score: 30,
        reasoning: "AI Engine API request failed or parsing failed. Defaulted to Internal Operations.".to_string(),
    }
}

fn fallback_attribute_meeting(title: &str, description: &str) -> AttributionResponse {
    let title_lower = title.to_lowercase();
    let desc_lower = description.to_lowercase();
    
    let match_any = |keywords: &[&str]| -> bool {
        keywords.iter().any(|kw| title_lower.contains(kw) || desc_lower.contains(kw))
    };

    if match_any(&["phoenix", "database", "backend", "db", "migration", "architecture"]) {
        return AttributionResponse {
            project_name: "Project Phoenix".to_string(),
            confidence_score: 92,
            reasoning: "Matching technical keyword detected in meeting details.".to_string(),
        };
    }

    if match_any(&["abc", "onboarding", "client sync", "feedback", "client call"]) {
        return AttributionResponse {
            project_name: "Client ABC Onboarding".to_string(),
            confidence_score: 89,
            reasoning: "Matching client/onboarding keyword detected in meeting details.".to_string(),
        };
    }

    if match_any(&["marketing", "campaign", "ad design", "social media", "growth"]) {
        return AttributionResponse {
            project_name: "Q4 Marketing Strategy".to_string(),
            confidence_score: 85,
            reasoning: "Matching marketing/growth keyword detected in meeting details.".to_string(),
        };
    }

    AttributionResponse {
        project_name: "Internal Operations".to_string(),
        confidence_score: 75,
        reasoning: "Defaulted to Internal Operations as the meeting details do not contain project-specific keywords.".to_string(),
    }
}

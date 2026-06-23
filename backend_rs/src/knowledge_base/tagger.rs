use std::collections::HashMap;
use std::env;
use serde::{Deserialize, Serialize};
use reqwest::Client;
use serde_json::json;

#[derive(Serialize, Deserialize)]
struct TagResponse {
    tags: Vec<String>,
}

pub async fn generate_semantic_tags(text: &str) -> Vec<String> {
    let api_key = env::var("GEMINI_API_KEY").unwrap_or_default();

    if api_key.is_empty() {
        return fallback_generate_tags(text);
    }

    let prompt = format!(
        "Analyze the following snippet of a document or Slack conversation. Extract 3 to 5 precise, lowercase semantic tags representing the key topics, tools, technologies, departments, or project codes discussed.\n\n\
        Text snippet:\n\
        ---\n\
        {}\n\
        ---",
        if text.len() > 4000 { &text[..4000] } else { text }
    );

    let client = Client::new();
    let url = format!(
        "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key={}",
        api_key
    );

    let request_body = json!({
        "contents": [{
            "parts": [{"text": prompt}]
        }],
        "systemInstruction": {
            "parts": [{"text": "You are a precise technical document categorizer. Generate between 3 and 5 short, lowercase tags that summarize the core themes. Do not output anything else. Respond in JSON schema: {tags: [string]}"}]
        },
        "generationConfig": {
            "responseMimeType": "application/json",
            "temperature": 0.1
        }
    });

    match client.post(&url).json(&request_body).send().await {
        Ok(res) if res.status().is_success() => {
            if let Ok(json_res) = res.json::<serde_json::Value>().await {
                if let Some(text_content) = json_res["candidates"][0]["content"]["parts"][0]["text"].as_str() {
                    if let Ok(parsed) = serde_json::from_str::<TagResponse>(text_content) {
                        return parsed.tags.into_iter()
                            .map(|t| t.to_lowercase().trim().to_string())
                            .filter(|t| !t.is_empty())
                            .take(5)
                            .collect();
                    }
                }
            }
        }
        _ => {}
    }

    fallback_generate_tags(text)
}

fn fallback_generate_tags(text: &str) -> Vec<String> {
    let stopwords: std::collections::HashSet<&str> = [
        "about", "above", "after", "again", "against", "all", "and", "any", "are", 
        "because", "been", "before", "being", "below", "between", "both", "but", 
        "could", "did", "does", "doing", "down", "during", "each", "few", "for", 
        "from", "further", "had", "has", "have", "having", "here", "hers", "him", 
        "his", "how", "into", "itself", "more", "most", "once", "only", "other", 
        "ours", "out", "over", "own", "same", "she", "should", "some", "such", 
        "than", "that", "the", "their", "them", "then", "there", "these", "they", 
        "this", "those", "through", "under", "until", "very", "was", "were", 
        "what", "when", "where", "which", "while", "who", "whom", "why", "with", 
        "would", "your", "yours", "yourself", "yourselves", "slack", "message", 
        "thread", "channel", "conversation", "document", "ingest", "chunk"
    ].iter().cloned().collect();

    let text_lower = text.to_lowercase();
    
    // Simple word extractor using standard character check
    let mut words = Vec::new();
    let mut current_word = String::new();
    for c in text_lower.chars() {
        if c.is_ascii_alphabetic() {
            current_word.push(c);
        } else if !current_word.is_empty() {
            if current_word.len() >= 5 && current_word.len() <= 15 {
                words.push(current_word.clone());
            }
            current_word.clear();
        }
    }
    if !current_word.is_empty() && current_word.len() >= 5 && current_word.len() <= 15 {
        words.push(current_word);
    }

    let mut freq = HashMap::new();
    for w in words {
        if !stopwords.contains(w.as_str()) {
            *freq.entry(w).or_insert(0) += 1;
        }
    }

    let mut freq_vec: Vec<(String, u32)> = freq.into_iter().collect();
    freq_vec.sort_by(|a, b| b.1.cmp(&a.1));

    let mut tags: Vec<String> = freq_vec.into_iter().take(4).map(|item| item.0).collect();
    if tags.is_empty() {
        tags = vec!["general".to_string(), "knowledge".to_string()];
    }

    tags
}

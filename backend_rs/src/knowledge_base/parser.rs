use std::io::{Cursor, Read};
use crate::knowledge_base::schemas::SlackMessage;
use chrono::TimeZone;

pub fn extract_text_from_bytes(file_bytes: &[u8], filename: &str) -> Result<String, String> {
    let lower_filename = filename.to_lowercase();
    if lower_filename.ends_with(".txt") {
        Ok(String::from_utf8_lossy(file_bytes).to_string())
    } else if lower_filename.ends_with(".docx") || lower_filename.ends_with(".doc") {
        extract_docx_text(file_bytes)
    } else if lower_filename.ends_with(".pdf") {
        extract_pdf_text(file_bytes)
    } else {
        Err(format!("Unsupported file type. Supported types: .txt, .pdf, .docx"))
    }
}

fn extract_docx_text(bytes: &[u8]) -> Result<String, String> {
    let cursor = Cursor::new(bytes);
    let mut archive = match zip::ZipArchive::new(cursor) {
        Ok(a) => a,
        Err(e) => return Err(format!("Failed to open docx ZIP archive: {}", e)),
    };

    let mut file = match archive.by_name("word/document.xml") {
        Ok(f) => f,
        Err(e) => return Err(format!("docx missing word/document.xml: {}", e)),
    };

    let mut xml_content = String::new();
    if let Err(e) = file.read_to_string(&mut xml_content) {
        return Err(format!("Failed to read word/document.xml: {}", e));
    }

    Ok(extract_xml_text(&xml_content))
}

fn extract_xml_text(xml: &str) -> String {
    let mut result = String::new();
    let chars = xml.chars().collect::<Vec<char>>();
    let mut i = 0;
    
    while i < chars.len() {
        if i + 4 < chars.len() && chars[i..i+4] == ['<', 'w', ':', 't'] {
            i += 4;
            while i < chars.len() && chars[i] != '>' {
                i += 1;
            }
            i += 1; // skip '>'
            
            let start_collect = i;
            while i < chars.len() {
                if i + 6 < chars.len() && chars[i..i+6] == ['<', '/', 'w', ':', 't', '>'] {
                    let text: String = chars[start_collect..i].iter().collect();
                    result.push_str(&text);
                    result.push(' ');
                    i += 6;
                    break;
                }
                i += 1;
            }
        } else {
            i += 1;
        }
    }
    result.trim().to_string()
}

fn extract_pdf_text(bytes: &[u8]) -> Result<String, String> {
    match pdf_extract::extract_text_from_mem(bytes) {
        Ok(text) => Ok(text),
        Err(e) => Err(format!("PDF extraction failed: {}", e)),
    }
}

pub fn format_slack_thread(messages: &[SlackMessage]) -> String {
    let mut sorted_messages = messages.to_vec();
    
    // Sort messages chronologically by timestamp
    sorted_messages.sort_by(|a, b| {
        let ts_a: f64 = a.timestamp.parse().unwrap_or(0.0);
        let ts_b: f64 = b.timestamp.parse().unwrap_or(0.0);
        ts_a.partial_cmp(&ts_b).unwrap_or(std::cmp::Ordering::Equal)
    });

    let mut thread_lines = Vec::new();
    thread_lines.push("=== SLACK MULTI-TURN CONVERSATION THREAD ===".to_string());

    for msg in sorted_messages {
        let ts_float: f64 = msg.timestamp.parse().unwrap_or(0.0);
        let seconds = ts_float as i64;
        let nanoseconds = ((ts_float - seconds as f64) * 1_000_000_000.0) as u32;

        let datetime_str = match chrono::Utc.timestamp_opt(seconds, nanoseconds) {
            chrono::LocalResult::Single(dt) => dt.format("%Y-%m-%d %H:%M:%S").to_string(),
            _ => msg.timestamp.clone(),
        };

        thread_lines.push(format!("[{}] User {}: {}", datetime_str, msg.user_id, msg.text.trim()));
    }

    thread_lines.join("\n\n")
}

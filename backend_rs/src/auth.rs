use axum::{
    async_trait,
    extract::FromRequestParts,
    http::{request::Parts, StatusCode},
    Json,
};
use serde::{Deserialize, Serialize};

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct Claims {
    pub uid: Option<String>,
    pub user_id: Option<String>,
    pub email: Option<String>,
    pub sub: Option<String>,
}

impl Claims {
    pub fn get_uid(&self) -> String {
        self.uid.clone()
            .or_else(|| self.user_id.clone())
            .or_else(|| self.sub.clone())
            .unwrap_or_else(|| "unknown_uid".to_string())
    }
}

pub struct AuthUser(pub Claims);

#[async_trait]
impl<S> FromRequestParts<S> for AuthUser
where
    S: Send + Sync,
{
    type Rejection = (StatusCode, Json<serde_json::Value>);

    async fn from_request_parts(parts: &mut Parts, _state: &S) -> Result<Self, Self::Rejection> {
        let auth_header = parts
            .headers
            .get(axum::http::header::AUTHORIZATION)
            .and_then(|value| value.to_str().ok());

        let auth_header = match auth_header {
            Some(header) => header,
            None => {
                return Err((
                    StatusCode::UNAUTHORIZED,
                    Json(serde_json::json!({ "detail": "Missing Authorization header" })),
                ));
            }
        };

        if !auth_header.starts_with("Bearer ") {
            return Err((
                StatusCode::UNAUTHORIZED,
                Json(serde_json::json!({ "detail": "Invalid authorization schema. Header must begin with 'Bearer '" })),
            ));
        }

        let token = &auth_header["Bearer ".len()..];

        let parts: Vec<&str> = token.split('.').collect();
        if parts.len() != 3 {
            return Err((
                StatusCode::UNAUTHORIZED,
                Json(serde_json::json!({ "detail": "Invalid token format" })),
            ));
        }

        let payload_b64 = parts[1];
        let payload_b64 = payload_b64.replace('-', "+").replace('_', "/");
        let decoded = match data_encoding::BASE64URL_NOPAD.decode(payload_b64.as_bytes()) {
            Ok(d) => d,
            Err(_) => match data_encoding::BASE64URL.decode(payload_b64.as_bytes()) {
                Ok(d) => d,
                Err(_) => match data_encoding::BASE64.decode(payload_b64.as_bytes()) {
                    Ok(d) => d,
                    Err(_) => return Err((
                        StatusCode::UNAUTHORIZED,
                        Json(serde_json::json!({ "detail": "Failed to decode payload base64" })),
                    )),
                }
            }
        };

        match serde_json::from_slice::<Claims>(&decoded) {
            Ok(claims) => {
                println!("WARNING: Using unverified decoded Firebase ID token for local development.");
                Ok(AuthUser(claims))
            }
            Err(err) => {
                println!("Fallback JWT decoding failed: {}", err);
                Err((
                    StatusCode::UNAUTHORIZED,
                    Json(serde_json::json!({ "detail": "Invalid or expired credentials, and unverified fallback decoding failed." })),
                ))
            }
        }
    }
}

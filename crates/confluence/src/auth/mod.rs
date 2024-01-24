use crate::api::AppState;
use crate::config::AuthConfig;
use crate::error::AppError;
use axum::{
    extract::{Request, State},
    http,
    middleware::Next,
    response::Response,
};
use biscuit::{jwk, jws, Validation, ValidationOptions, JWT};
use serde::{Deserialize, Serialize};
use std::sync::Arc;

#[derive(Clone)]
pub struct CurrentUser {
    pub user_id: String,
}

#[derive(Debug, PartialEq, Clone, Serialize, Deserialize)]
pub struct ScopedClaims {
    pub scope: String,
}

const BEARER_TOKEN_PREFIX: &str = "Bearer";
const READ_SCOPE: &str = "read:confluence";
const WRITE_SCOPE: &str = "write:confluence";

pub async fn auth(
    State(state): State<Arc<AppState>>,
    mut req: Request,
    next: Next,
) -> Result<Response, AppError> {
    let auth_header = req
        .headers()
        .get(http::header::AUTHORIZATION)
        .and_then(|header| header.to_str().ok());

    let current_user = authorize_current_user(auth_header, state).await?;
    req.extensions_mut().insert(current_user);
    Ok(next.run(req).await)
}

pub async fn authorize_current_user(
    auth_header: Option<&str>,
    state: Arc<AppState>,
) -> Result<CurrentUser, AppError> {
    match state.config.auth {
        AuthConfig::JWT {
            ref jwks_uri,
            ref issuer,
            ref audience,
        } => {
            let auth_header = if let Some(auth_header) = auth_header {
                auth_header
            } else {
                return Err(AppError::Unauthorized);
            };

            if !auth_header.starts_with(BEARER_TOKEN_PREFIX) {
                return Err(AppError::Unauthorized);
            }
            let auth_token = &auth_header[(BEARER_TOKEN_PREFIX.len() + 1)..];

            let jwks_res = reqwest::get(jwks_uri)
                .await
                .map_err(|e| AppError::Other(e.into()))?
                .text()
                .await
                .map_err(|e| AppError::Other(e.into()))?;

            let jwk_set: jwk::JWKSet<biscuit::Empty> =
                serde_json::from_str(&jwks_res).map_err(|e| AppError::Other(e.into()))?;

            let token = JWT::<ScopedClaims, biscuit::Empty>::new_encoded(auth_token);
            let header: &jws::Header<biscuit::Empty> = &token
                .unverified_header()
                .map_err(|_| AppError::Unauthorized)?;

            let algorithm = header.registered.algorithm;

            let claims = token
                .decode_with_jwks(&jwk_set, Some(algorithm))
                .map_err(|_| AppError::Unauthorized)?;

            let validation_options = ValidationOptions {
              issuer: Validation::Validate(issuer.clone()),
              audience: Validation::Validate(audience.clone()),
              ..ValidationOptions::default()
            };

            claims
                .validate(validation_options)
                .map_err(|_| AppError::Unauthorized)?;

            let payload = claims.payload().map_err(|_| AppError::Unauthorized)?;

            let sub = payload
                .registered
                .subject
                .clone()
                .ok_or_else(|| AppError::Unauthorized)?;

            if !payload.private.scope.contains(READ_SCOPE)
                || !payload.private.scope.contains(WRITE_SCOPE)
            {
                return Err(AppError::Unauthorized);
            }

            Ok(CurrentUser { user_id: sub })
        }
        AuthConfig::DevNoAuth { ref user_id } => Ok(CurrentUser {
            user_id: user_id.clone(),
        }),
    }
}

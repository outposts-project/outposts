use crate::confluence::api::AppState;
use crate::confluence::error::AppError;
use axum::extract::State;
use axum::{
    http::{self, Request},
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

pub async fn auth<B>(
    State(state): State<Arc<AppState>>,
    mut req: Request<B>,
    next: Next<B>,
) -> Result<Response, AppError> {
    let auth_header = req
        .headers()
        .get(http::header::AUTHORIZATION)
        .and_then(|header| header.to_str().ok());

    let auth_header = if let Some(auth_header) = auth_header {
        auth_header
    } else {
        return Err(AppError::Unauthorized);
    };

    let current_user = authorize_current_user(auth_header, state).await?;
    req.extensions_mut().insert(current_user);
    Ok(next.run(req).await)
}

pub async fn authorize_current_user(
    auth_token: &str,
    state: Arc<AppState>,
) -> Result<CurrentUser, AppError> {
    if !auth_token.starts_with(BEARER_TOKEN_PREFIX) {
        return Err(AppError::Unauthorized);
    }
    let token = &auth_token[(BEARER_TOKEN_PREFIX.len() + 1)..];

    let jwks_res = reqwest::get(&state.jwks_uri)
        .await
        .map_err(|e| AppError::Other(e.into()))?
        .text()
        .await
        .map_err(|e| AppError::Other(e.into()))?;

    let jwk_set: jwk::JWKSet<biscuit::Empty> =
        serde_json::from_str(&jwks_res).map_err(|e| AppError::Other(e.into()))?;

    let token = JWT::<ScopedClaims, biscuit::Empty>::new_encoded(token);
    let header: &jws::Header<biscuit::Empty> = &token
        .unverified_header()
        .map_err(|_| AppError::Unauthorized)?;

    let algorithm = header.registered.algorithm;

    let claims = token
        .decode_with_jwks(&jwk_set, Some(algorithm))
        .map_err(|_| AppError::Unauthorized)?;

    let mut validation_options = ValidationOptions::default();
    validation_options.issuer = Validation::Validate(state.issuer.clone());
    validation_options.audience = Validation::Validate(state.audience.clone());

    claims
        .validate(validation_options)
        .map_err(|_| AppError::Unauthorized)?;

    let payload = claims.payload().map_err(|_| AppError::Unauthorized)?;

    let sub = payload
        .registered
        .subject
        .clone()
        .ok_or_else(|| AppError::Unauthorized)?;

    if !payload.private.scope.contains(READ_SCOPE) || !payload.private.scope.contains(WRITE_SCOPE) {
        return Err(AppError::Unauthorized);
    }

    Ok(CurrentUser { user_id: sub })
}

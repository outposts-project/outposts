use axum::http::StatusCode;
use axum::response::{IntoResponse, Response};
use reqwest::Error as FetchError;
use sea_orm::DbErr;
use std::fmt::Debug;
use thiserror::Error;

#[derive(Error, Debug)]
pub enum ConfigError {
    #[error("invalid server format {server} from source config {config_name}, caused by {source_kind:?}")]
    ProxyServerInvalid {
        config_name: String,
        server: String,
        source_kind: addr::error::Kind,
    },
    #[error(transparent)]
    Format(#[from] serde_yaml::Error),
    #[error(transparent)]
    Other(#[from] anyhow::Error),
}

#[derive(Error, Debug)]
pub enum AppError {
    #[error(transparent)]
    Db(#[from] DbErr),
    #[error("{0}")]
    DbNotFound(String),
    #[error(transparent)]
    Config(#[from] ConfigError),
    #[error(transparent)]
    Fetch(#[from] FetchError),
    #[error("UNAUTHORIZED")]
    Unauthorized,
    #[error("{message}")]
    BadRequest { message: String },
    #[error(transparent)]
    Other(#[from] anyhow::Error),
}

const UNAUTHORIZED_MSG: &str = "UNAUTHORIZED";

// Tell axum how to convert `AppError` into a response.
impl IntoResponse for AppError {
    fn into_response(self) -> Response {
        match self {
            Self::Db(e) => (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()),
            Self::DbNotFound(msg) => (StatusCode::NOT_FOUND, msg),
            Self::Config(e) => (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()),
            Self::Other(e) => (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()),
            Self::Unauthorized => (StatusCode::UNAUTHORIZED, UNAUTHORIZED_MSG.to_string()),
            Self::Fetch(e) => (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()),
            Self::BadRequest { message } => (StatusCode::BAD_REQUEST, message),
        }
        .into_response()
    }
}

use axum::http::StatusCode;
use axum::response::{IntoResponse, Response};
use prisma_client_rust::{QueryError as PrismaQueryError};
use std::fmt::Debug;
use thiserror::Error;
use reqwest::Error as FetchError;

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
    Db(#[from] PrismaQueryError),
    #[error(transparent)]
    Config(#[from] ConfigError),
    #[error(transparent)]
    Fetch(#[from] FetchError),
    #[error("UNAUTHORIZED")]
    Unauthorized,
    #[error("NOT_FOUND")]
    NotFound,
    #[error("UNREACHABLE")]
    Unreachable,
    #[error(transparent)]
    Other(#[from] anyhow::Error),
}

const UNAUTHORIZED_MSG: &str = "UNAUTHORIZED";
const NOTFOUND_MSG: &str = "NOT FOUND";
const UNREACHABLE_MSG: &str = "UNREACHABLE";


// Tell axum how to convert `AppError` into a response.
impl IntoResponse for AppError {
    fn into_response(self) -> Response {
        match self {
            Self::Db(e) => (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()),
            Self::Config(e) => (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()),
            Self::Other(e) => (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()),
            Self::Unauthorized => (StatusCode::UNAUTHORIZED, UNAUTHORIZED_MSG.to_string()),
            Self::NotFound => (StatusCode::NOT_FOUND, NOTFOUND_MSG.to_string()),
            Self::Fetch(e) => (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()),
            Self::Unreachable => (StatusCode::INTERNAL_SERVER_ERROR, UNREACHABLE_MSG.to_string())
        }
        .into_response()
    }
}

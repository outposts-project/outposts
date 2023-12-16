#![feature(slice_take)]

use axum::{
    handler::HandlerWithoutStateExt, http::StatusCode, middleware, routing::delete, routing::get,
    routing::post, routing::put, Router,
};
use confluence::api::{
    create_one_confluence, create_one_profile, create_one_subscribe_source, delete_one_confluence,
    delete_one_profile, delete_one_subscribe_source, find_many_confluences, find_one_confluence,
    find_one_profile_by_token, update_one_confluence, update_one_subscribe_source, AppState,
};
use confluence::auth::auth;
use confluence::config::{AppConfig, AuthConfig};
use sea_orm::Database;
use std::env;
use std::net::SocketAddr;
use std::sync::Arc;
use tower_http::trace::TraceLayer;
use tracing_subscriber::{layer::SubscriberExt, util::SubscriberInitExt};

#[tokio::main]
async fn main() {
    tracing_subscriber::registry()
        .with(
            tracing_subscriber::EnvFilter::try_from_default_env()
                .unwrap_or_else(|_| "confluence=debug,tower_http=debug".into()),
        )
        .with(tracing_subscriber::fmt::layer())
        .init();

    dotenvy::dotenv().ok();

    let db_url =
        env::var("CONFLUENCE_DATABASE_URL").expect("CONFLUENCE_DATABASE_URL is not set in env");
    let conn = Database::connect(db_url.clone())
        .await
        .expect("Database connection failed");

    let auth_type = env::var("AUTH_TYPE").expect("AUTH_TYPE is not set in env");
    let port = env::var("CONFLUENCE_PORT").map_or(4001u16, |p| p.parse::<u16>().unwrap());

    let state = Arc::new(AppState {
        conn,
        config: AppConfig {
            port,
            database_url: db_url,
            auth: match &auth_type as &str {
                "DEV_NO_AUTH" => {
                    let user_id = env::var("CONFLUENCE_USER_ID")
                        .expect("CONFLUENCE_USER_ID is not set in env");
                    AuthConfig::DevNoAuth { user_id }
                }
                "JWT" => {
                    let issuer = env::var("AUTH_ISSUER").expect("AUTH_ISSUER is not set in env");
                    let jwks_uri =
                        env::var("AUTH_JWKS_URI").expect("AUTH_JWKS_URI is not set in env");
                    let audience = env::var("CONFLUENCE_AUDIENCE")
                        .expect("CONFLUENCE_AUDIENCE is not set in env");
                    AuthConfig::JWT {
                        jwks_uri,
                        issuer,
                        audience,
                    }
                }
                auth_type => {
                    panic!("unsupported auth type {}", auth_type)
                }
            },
        },
    });

    tokio::join!(serve(handle_confluence(state.clone()), state));
}

async fn handle_404() -> (StatusCode, &'static str) {
    (StatusCode::NOT_FOUND, "Not found")
}

fn handle_confluence(state: Arc<AppState>) -> Router {
    // serve the file in the "assets" directory under `/assets`
    let confluence_api = Router::<Arc<AppState>>::new()
        .route("/", get(find_many_confluences).post(create_one_confluence))
        .route(
            "/:id",
            get(find_one_confluence)
                .delete(delete_one_confluence)
                .put(update_one_confluence),
        )
        .layer(middleware::from_fn_with_state(state.clone(), auth));

    let profile_api = Router::<Arc<AppState>>::new()
        .route("/", post(create_one_profile))
        .route("/:id", delete(delete_one_profile))
        .layer(middleware::from_fn_with_state(state.clone(), auth));

    let subscribe_source_api = Router::<Arc<AppState>>::new()
        .route("/", post(create_one_subscribe_source))
        .route(
            "/:id",
            put(update_one_subscribe_source).delete(delete_one_subscribe_source),
        )
        .layer(middleware::from_fn_with_state(state.clone(), auth));

    let profile_token_api =
        Router::<Arc<AppState>>::new().route("/:token", get(find_one_profile_by_token));

    Router::<Arc<AppState>>::new()
        .nest("/api/profile", profile_api)
        .nest("/api/confluence", confluence_api)
        .nest("/api/subscribe_source", subscribe_source_api)
        .nest("/api/profile_token", profile_token_api)
        .fallback_service(handle_404.into_service())
        .with_state(state)
}

async fn serve(app: Router, state: Arc<AppState>) {
    let addr = SocketAddr::from(([127, 0, 0, 1], state.config.port));
    let listener = tokio::net::TcpListener::bind(addr).await.unwrap();
    tracing::debug!("listening on {}", listener.local_addr().unwrap());
    axum::serve(listener, app.layer(TraceLayer::new_for_http()))
        .await
        .unwrap();
}

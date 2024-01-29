use crate::auth::CurrentUser;
use crate::clash::ClashConfig;
use crate::config::AppConfig;
use crate::dto::{
    ProfileDto,
    ProfileCreationDto,
    SubscribeSourceCreationDto,
    SubscribeSourceDto,
    SubscribeSourceUpdateDto,
    ConfluenceDto,
    ConfluenceUpdateDto,
};
use crate::error::{ ConfigError, AppError };
use crate::mux::mux_configs;
use crate::prisma::{ PrismaClient, subscribe_source, profile, confluence };
use axum::extract::{Path, State};
use axum::http::{header, HeaderName, StatusCode};
use axum::{Extension, Json};
use futures::future::try_join_all;
use std::sync::Arc;
use uuid::Uuid;

pub struct AppState {
    pub config: AppConfig,
    pub names_generator: Arc<rnglib::RNG>,
    pub prisma: PrismaClient
}

impl AppState {
    pub fn new(prisma: PrismaClient, config: AppConfig) -> Self {
        Self {
            prisma,
            config,
            names_generator: Arc::new(rnglib::RNG::from(&rnglib::Language::Elven)),
        }
    }
}

pub async fn find_one_confluence(
    Path(id): Path<i32>,
    Extension(current_user): Extension<CurrentUser>,
    State(state): State<Arc<AppState>>,
) -> Result<Json<ConfluenceDto>, AppError> {
    let db = &state.prisma;

    let cm: confluence::Data = db.confluence()
        .find_first(vec![
            confluence::id::equals(id),
            confluence::creator::equals(current_user.user_id.clone())
        ])
        .with(confluence::profiles::fetch(vec![]))
        .with(confluence::subscribe_sources::fetch(vec![]))
        .exec()
        .await?
        .ok_or(AppError::NotFound)?;

    let confluence_dto = ConfluenceDto::from_orm(cm)?;
    Ok(Json(confluence_dto))
}

pub async fn find_many_confluences(
    Extension(current_user): Extension<CurrentUser>,
    State(state): State<Arc<AppState>>,
) -> Result<Json<Vec<ConfluenceDto>>, AppError> {
    let db = &state.prisma;
    let cms = db.confluence()
        .find_many(vec![
            confluence::creator::equals(current_user.user_id.clone())
        ])
        .exec()
        .await?;

    let mut confluences_dto = vec![];

    for cm in cms {
        confluences_dto.push(ConfluenceDto::from_orm(cm)?);
    }

    Ok(Json(confluences_dto))
}

pub async fn create_one_confluence(
    Extension(current_user): Extension<CurrentUser>,
    State(state): State<Arc<AppState>>,
) -> Result<(StatusCode, Json<ConfluenceDto>), AppError> {
    let db = &state.prisma;

    let name = state.names_generator.generate_name();

    let mut cm: confluence::Data = db.confluence()
        .create(
            name,
            current_user.user_id,
            "".into(),
            "".into(),
            vec![]
        ).exec()
        .await?;

    cm.subscribe_sources = Some(vec![]);
    cm.profiles = Some(vec![]);

    Ok((
        StatusCode::CREATED,
        Json(ConfluenceDto::from_orm(cm)?),
    ))
}

pub async fn update_one_confluence(
    Path(id): Path<i32>,
    State(state): State<Arc<AppState>>,
    Extension(current_user): Extension<CurrentUser>,
    Json(confluence_update_dto): Json<ConfluenceUpdateDto>,
) -> Result<Json<ConfluenceDto>, AppError> {
    let db = &state.prisma;

    db.confluence()
        .find_first(
            vec![
                confluence::id::equals(id),
                confluence::creator::equals(current_user.user_id)
            ],
        )
        .exec()
        .await?
        .ok_or(AppError::NotFound)?;

    let cm: confluence::Data = db.confluence()
        .update(
            confluence::id::equals(id),
            vec![
                confluence::template::set(confluence_update_dto.template)
            ]
        )
        .with(confluence::profiles::fetch(vec![]))
        .with(confluence::subscribe_sources::fetch(vec![]))
        .exec()
        .await?;

    let confluence_dto = ConfluenceDto::from_orm(cm)?;

    Ok(Json(confluence_dto))
}

pub async fn sync_one_confluence(
    Path(id): Path<i32>,
    State(state): State<Arc<AppState>>,
    Extension(current_user): Extension<CurrentUser>,
) -> Result<Json<ConfluenceDto>, AppError> {
    let db = &state.prisma;

    let mut cm = db.confluence()
        .find_first(
            vec![
                confluence::id::equals(id),
                confluence::creator::equals(current_user.user_id)
            ]
        )
        .with(confluence::subscribe_sources::fetch(vec![]))
        .with(confluence::profiles::fetch(vec![]))
        .exec()
        .await?
        .ok_or(AppError::NotFound)?;

    let sync_one_subscribe_source_content =
        async move |sm: subscribe_source::Data, db: &PrismaClient| -> Result<subscribe_source::Data, AppError> {
            let content = reqwest::get(sm.url).await?.text().await?;
            let sm: subscribe_source::Data = db.subscribe_source()
                .update(
                    subscribe_source::id::equals(sm.id),
                    vec![
                        subscribe_source::content::set(content)
                    ]
                ).exec()
                .await?;
            Ok(sm)
        };

    let sms = cm.subscribe_sources.take().ok_or(AppError::Unreachable)?;

    let sms = try_join_all(sms.into_iter().map(|sm| sync_one_subscribe_source_content(sm, db))).await?;

    cm.subscribe_sources = Some(sms);

    let confluence_dto = ConfluenceDto::from_orm(cm)?;

    Ok(Json(confluence_dto))
}

pub async fn mux_one_confluence(
    Path(id): Path<i32>,
    State(state): State<Arc<AppState>>,
    Extension(current_user): Extension<CurrentUser>,
) -> Result<Json<ConfluenceDto>, AppError> {
    let db = &state.prisma;

    let cm = db.confluence()
        .find_first(
            vec![
                confluence::id::equals(id),
                confluence::creator::equals(current_user.user_id)
            ]
        )
        .with(confluence::subscribe_sources::fetch(vec![]))
        .exec()
        .await?
        .ok_or(AppError::NotFound)?;

    let sms = &cm.subscribe_sources.ok_or(AppError::Unreachable)?;

    let mux_content = {
        let template =
            serde_yaml::from_str::<ClashConfig>(&cm.template).map_err(ConfigError::from)?;
        let mut sources = vec![];
        for sm in sms {
            let source = &sm.content as &str;
            let name = &sm.name as &str;
            let config: ClashConfig = serde_yaml::from_str(source).map_err(ConfigError::from)?;
            sources.push((name, config));
        }
        let mux_config = mux_configs(&template, &sources)?;
        serde_yaml::to_string(&mux_config).map_err(ConfigError::from)?
    };

    let cm: confluence::Data = db.confluence()
        .update(
            confluence::id::equals(id),
            vec![
                confluence::mux_content::set(mux_content)
            ]
        )
        .with(confluence::subscribe_sources::fetch(vec![]))
        .with(confluence::profiles::fetch(vec![]))
        .exec()
        .await?;

    let confluence_dto = ConfluenceDto::from_orm(cm)?;

    Ok(Json(confluence_dto))
}

pub async fn delete_one_confluence(
    State(state): State<Arc<AppState>>,
    Extension(current_user): Extension<CurrentUser>,
    Path(id): Path<i32>,
) -> Result<StatusCode, AppError> {
    let db = &state.prisma;
    let del_count = db
        .confluence()
        .delete_many(
            vec![
                confluence::id::equals(id),
                confluence::creator::equals(current_user.user_id)
            ]
        ).exec().await?;

    if del_count == 0 {
        return Err(AppError::NotFound);
    }

    Ok(StatusCode::OK)
}

pub async fn find_one_profile_as_subscription_by_token(
    Path(token): Path<String>,
    State(state): State<Arc<AppState>>,
) -> Result<([(HeaderName, &'static str); 2], String), AppError> {
    let db = &state.prisma;
    let pm: profile::Data = db
        .profile()
        .find_first(
            vec![profile::resource_token::equals(token)]
        )
        .with(profile::confluence::fetch())
        .exec()
        .await?
        .ok_or(AppError::NotFound)?;
    let mux_content = pm.confluence.ok_or(AppError::Unreachable)?.mux_content;
    let headers = [
        (
            header::CONTENT_TYPE,
            "application/octet-stream; charset=utf-8",
        ),
        (
            header::CONTENT_DISPOSITION,
            "attachment; filename=Confluence.yaml",
        ),
    ];
    Ok((headers, mux_content))
}

pub async fn create_one_profile(
    State(state): State<Arc<AppState>>,
    Extension(current_user): Extension<CurrentUser>,
    Json(profile_creation_dto): Json<ProfileCreationDto>,
) -> Result<Json<ProfileDto>, AppError> {
    let db = &state.prisma;

    db.confluence()
        .find_first(
            vec![
                confluence::id::equals(profile_creation_dto.confluence_id),
                confluence::creator::equals(current_user.user_id)
            ]
        )
        .exec()
        .await?
        .ok_or(AppError::NotFound)?;

    let pm: profile::Data = db.profile()
        .create(
            Uuid::new_v4().to_string(),
            confluence::id::equals(profile_creation_dto.confluence_id),
            vec![]
        ).exec().await?;

    Ok(Json(pm.into()))
}

pub async fn delete_one_profile(
    Path(id): Path<i32>,
    State(state): State<Arc<AppState>>,
    Extension(current_user): Extension<CurrentUser>,
) -> Result<(), AppError> {
    let db = &state.prisma;
    db.profile()
        .delete_many(
            vec![
                profile::id::equals(id),
                profile::confluence::is(
                    vec![
                        confluence::creator::equals(current_user.user_id)
                    ]
                )
            ]
        ).exec().await?;

    Ok(())
}

pub async fn create_one_subscribe_source(
    State(state): State<Arc<AppState>>,
    Extension(current_user): Extension<CurrentUser>,
    Json(subscribe_creation_dto): Json<SubscribeSourceCreationDto>,
) -> Result<Json<SubscribeSourceDto>, AppError> {
    let db = &state.prisma;

    db.confluence()
        .find_first(
            vec![
                confluence::id::equals(subscribe_creation_dto.confluence_id),
                confluence::creator::equals(current_user.user_id)
            ]
        )
        .exec()
        .await?
        .ok_or(AppError::NotFound)?;

    let sm: subscribe_source::Data = db.subscribe_source()
        .create(
            subscribe_creation_dto.url,
            subscribe_creation_dto.name,
            String::new(),
            confluence::id::equals(subscribe_creation_dto.confluence_id),
            vec![]
        ).exec().await?;

    Ok(Json(sm.into()))
}

pub async fn update_one_subscribe_source(
    Path(id): Path<i32>,
    State(state): State<Arc<AppState>>,
    Extension(current_user): Extension<CurrentUser>,
    Json(subscribe_update_dto): Json<SubscribeSourceUpdateDto>,
) -> Result<Json<SubscribeSourceDto>, AppError> {
    let db = &state.prisma;
    db
            .subscribe_source()
            .find_first(
                vec![
                    subscribe_source::id::equals(id),
                    subscribe_source::confluence::is(
                        vec![
                            confluence::creator::equals(current_user.user_id)
                        ]
                    )
                ]
            )
        .exec()
        .await?
        .ok_or(AppError::NotFound)?;
    let mut to_update_fields = vec![];
    if let Some(name) = subscribe_update_dto.name {
        to_update_fields.push(
            subscribe_source::name::set(name)
        );
    }
    if let Some(url) = subscribe_update_dto.url {
        to_update_fields.push(
          subscribe_source::url::set(url)
        );
    };
    if let Some(content) = subscribe_update_dto.content {
        to_update_fields.push(
            subscribe_source::content::set(content)
        );
    }
    let sm: subscribe_source::Data = db.subscribe_source()
        .update(
            subscribe_source::id::equals(id),
            to_update_fields
        ).exec().await?;

    Ok(Json(sm.into()))
}

pub async fn delete_one_subscribe_source(
    State(state): State<Arc<AppState>>,
    Extension(current_user): Extension<CurrentUser>,
    Path(id): Path<i32>,
) -> Result<(), AppError> {
    let db = &state.prisma;
    db
        .subscribe_source()
        .find_first(
            vec![
                subscribe_source::id::equals(id),
                subscribe_source::confluence::is(
                    vec![
                        confluence::creator::equals(current_user.user_id)
                    ]
                )
            ]
        )
        .exec()
        .await?
        .ok_or(AppError::NotFound)?;

    db
        .subscribe_source()
        .delete(subscribe_source::id::equals(id))
        .exec()
        .await?;
    Ok(())
}

pub async fn sync_one_subscribe_source(
    State(state): State<Arc<AppState>>,
    Extension(current_user): Extension<CurrentUser>,
    Path(id): Path<i32>,
) -> Result<(), AppError> {
    let db = &state.prisma;
    let sm: subscribe_source::Data = db.subscribe_source()
        .find_first(
            vec![
                subscribe_source::id::equals(id),
                subscribe_source::confluence::is(
                    vec![
                        confluence::creator::equals(current_user.user_id)
                    ]
                )
            ]
        )
        .with(subscribe_source::confluence::fetch())
        .exec()
        .await?
        .ok_or(AppError::NotFound)?;
    let url = &sm.url;
    let content = reqwest::get(url).await?.text().await?;
    db.subscribe_source()
        .update(
            subscribe_source::id::equals(id),
            vec![
                subscribe_source::content::set(content)
            ]
        ).exec().await?;
    Ok(())
}

use crate::auth::CurrentUser;
use crate::clash::ClashConfig;
use crate::config::AppConfig;
use crate::dto::{SubscribeSourceCreationDto, SubscribeSourceDto, SubscribeSourceUpdateDto};
use crate::entities::subscribe_source;
use crate::error::ConfigError;
use crate::mux::mux_configs;
use crate::{
    dto::ProfileCreationDto,
    entities::profile,
    error::AppError,
    {
        dto::{ConfluenceDto, ConfluenceUpdateDto, ProfileDto},
        entities,
        entities::confluence,
        services::{
            find_certain_confluence_profiles_and_subscribe_sources, find_one_confluence_in_db,
        },
    },
};
use axum::extract::{Path, State};
use axum::http::{header, HeaderName, StatusCode};
use axum::{Extension, Json};
use futures::future::try_join_all;
use itertools::izip;
use sea_orm::prelude::*;
use sea_orm::ActiveValue::Set;
use sea_orm::{IntoActiveModel, QuerySelect, TryIntoModel};
use std::sync::Arc;

#[derive(Clone)]
pub struct AppState {
    pub conn: DatabaseConnection,
    pub config: AppConfig,
    pub names_generator: Arc<rnglib::RNG>,
}

impl AppState {
    pub fn new(conn: DatabaseConnection, config: AppConfig) -> Self {
        Self {
            conn,
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
    let db = &state.conn;

    let cm = find_one_confluence_in_db(db, id, &current_user).await?;

    let (pms, sms) = find_certain_confluence_profiles_and_subscribe_sources(db, id).await?;

    let confluence_dto = ConfluenceDto::from_orm(cm, sms, pms);
    Ok(Json(confluence_dto))
}

pub async fn find_many_confluences(
    Extension(current_user): Extension<CurrentUser>,
    State(state): State<Arc<AppState>>,
) -> Result<Json<Vec<ConfluenceDto>>, AppError> {
    let db = &state.conn;
    let cms = confluence::Entity::find()
        .filter(confluence::Column::Creator.eq(&current_user.user_id))
        .all(db)
        .await;

    let cms = cms?;

    let (pms, sms) = tokio::try_join!(
        cms.load_many(entities::profile::Entity, db),
        cms.load_many(entities::subscribe_source::Entity, db)
    )?;

    let confluences_dto = izip!(cms.into_iter(), pms.into_iter(), sms.into_iter())
        .map(|(cm, pms, sms)| ConfluenceDto::from_orm(cm, sms, pms))
        .collect::<Vec<_>>();

    Ok(Json(confluences_dto))
}

pub async fn create_one_confluence(
    Extension(current_user): Extension<CurrentUser>,
    State(state): State<Arc<AppState>>,
) -> Result<(StatusCode, Json<ConfluenceDto>), AppError> {
    let db = &state.conn;

    let name = state.names_generator.generate_name();

    let confluence_model = confluence::ActiveModel {
        mux_content: Set("".into()),
        template: Set("".into()),
        creator: Set(current_user.user_id),
        name: Set(name),
        ..Default::default()
    };

    let confluence_model = confluence_model.insert(db).await?;

    Ok((
        StatusCode::CREATED,
        Json(ConfluenceDto::from_orm(confluence_model, vec![], vec![])),
    ))
}

pub async fn update_one_confluence(
    Path(id): Path<i32>,
    State(state): State<Arc<AppState>>,
    Extension(current_user): Extension<CurrentUser>,
    Json(confluence_update_dto): Json<ConfluenceUpdateDto>,
) -> Result<Json<ConfluenceDto>, AppError> {
    let db = &state.conn;
    let cm = find_one_confluence_in_db(db, id, &current_user).await?;
    let mut cm = cm.into_active_model();
    cm.template = Set(confluence_update_dto.template);
    cm = cm.save(db).await?;
    let cm = cm.try_into_model()?;

    let (pms, sms) = find_certain_confluence_profiles_and_subscribe_sources(db, id).await?;

    let confluence_dto = ConfluenceDto::from_orm(cm, sms, pms);

    Ok(Json(confluence_dto))
}

pub async fn sync_one_confluence(
    Path(id): Path<i32>,
    State(state): State<Arc<AppState>>,
    Extension(current_user): Extension<CurrentUser>,
) -> Result<Json<ConfluenceDto>, AppError> {
    let db = &state.conn;

    let cm = find_one_confluence_in_db(db, id, &current_user).await?;

    let (pms, sms) = find_certain_confluence_profiles_and_subscribe_sources(db, id).await?;

    let sync_one_subscribe_source_content =
        async move |sm: subscribe_source::Model| -> Result<subscribe_source::Model, AppError> {
            let content = reqwest::get(&sm.url).await?.text().await?;
            let mut sm = sm.into_active_model();
            sm.content = Set(content);
            let sm = sm.update(db).await?;
            Ok(sm)
        };

    let sms = try_join_all(sms.into_iter().map(sync_one_subscribe_source_content)).await?;

    let confluence_dto = ConfluenceDto::from_orm(cm, sms, pms);

    Ok(Json(confluence_dto))
}

pub async fn mux_one_confluence(
    Path(id): Path<i32>,
    State(state): State<Arc<AppState>>,
    Extension(current_user): Extension<CurrentUser>,
) -> Result<Json<ConfluenceDto>, AppError> {
    let db = &state.conn;

    let cm = find_one_confluence_in_db(db, id, &current_user).await?;

    let (pms, sms) = find_certain_confluence_profiles_and_subscribe_sources(db, id).await?;

    let mut_content = {
        let template =
            serde_yaml::from_str::<ClashConfig>(&cm.template).map_err(ConfigError::from)?;
        let mut sources = vec![];
        for sm in &sms {
            let source = &sm.content as &str;
            let name = &sm.name as &str;
            let config: ClashConfig = serde_yaml::from_str(source).map_err(ConfigError::from)?;
            sources.push((name, config));
        }
        let mux_config = mux_configs(&template, &sources)?;
        serde_yaml::to_string(&mux_config).map_err(ConfigError::from)?
    };

    let mut cm = cm.into_active_model();
    cm.mux_content = Set(mut_content);
    let cm = cm.update(db).await?;

    let confluence_dto = ConfluenceDto::from_orm(cm, sms, pms);

    Ok(Json(confluence_dto))
}

pub async fn delete_one_confluence(
    State(state): State<Arc<AppState>>,
    Extension(current_user): Extension<CurrentUser>,
    Path(id): Path<i32>,
) -> Result<StatusCode, AppError> {
    let db = &state.conn;
    let cm = find_one_confluence_in_db(db, id, &current_user).await?;
    let cm = cm.into_active_model();
    cm.delete(db).await?;
    Ok(StatusCode::OK)
}

pub async fn find_one_profile_as_subscription_by_token(
    Path(token): Path<String>,
    State(state): State<Arc<AppState>>,
) -> Result<([(HeaderName, &'static str); 2], String), AppError> {
    let db = &state.conn;
    let mut pms = profile::Entity::find()
        .filter(profile::Column::ResourceToken.eq(&token))
        .find_with_related(confluence::Entity)
        .limit(1)
        .all(db)
        .await?;
    if let Some((_, mut cm)) = pms.pop() {
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
        let mux_content = cm
            .pop()
            .ok_or_else(|| AppError::DbNotFound(format!("cannot find profile token = {}", token)))?
            .mux_content;
        Ok((headers, mux_content))
    } else {
        Err(AppError::DbNotFound(format!(
            "cannot find profile token = {}",
            token
        )))
    }
}

pub async fn create_one_profile(
    State(state): State<Arc<AppState>>,
    Extension(current_user): Extension<CurrentUser>,
    Json(profile_creation_dto): Json<ProfileCreationDto>,
) -> Result<Json<ProfileDto>, AppError> {
    let db = &state.conn;
    find_one_confluence_in_db(db, profile_creation_dto.confluence_id, &current_user).await?;
    let mut pms = profile::ActiveModel {
        resource_token: Set(Uuid::new_v4().to_string()),
        confluence_id: Set(profile_creation_dto.confluence_id),
        ..Default::default()
    };
    pms = pms.save(db).await?;
    let pms = pms.try_into_model()?;
    Ok(Json(pms.into()))
}

pub async fn delete_one_profile(
    Path(id): Path<i32>,
    State(state): State<Arc<AppState>>,
    Extension(current_user): Extension<CurrentUser>,
) -> Result<(), AppError> {
    let db = &state.conn;
    let mut pm = profile::Entity::find_by_id(id)
        .find_with_related(confluence::Entity)
        .filter(confluence::Column::Id.eq(&current_user.user_id))
        .limit(1)
        .all(db)
        .await?;
    if let Some(pm) = pm.pop() {
        let pam = pm.0.into_active_model();
        pam.delete(db).await?;
        Ok(())
    } else {
        Err(AppError::DbNotFound(format!(
            "cannot find profile id = {}",
            id
        )))
    }
}

pub async fn create_one_subscribe_source(
    State(state): State<Arc<AppState>>,
    Extension(current_user): Extension<CurrentUser>,
    Json(subscribe_creation_dto): Json<SubscribeSourceCreationDto>,
) -> Result<Json<SubscribeSourceDto>, AppError> {
    let db = &state.conn;
    find_one_confluence_in_db(db, subscribe_creation_dto.confluence_id, &current_user).await?;
    let mut pms = subscribe_source::ActiveModel {
        confluence_id: Set(subscribe_creation_dto.confluence_id),
        url: Set(subscribe_creation_dto.url),
        name: Set(subscribe_creation_dto.name),
        content: Set(String::new()),
        ..Default::default()
    };
    pms = pms.save(db).await?;
    let pms = pms.try_into_model()?;
    Ok(Json(pms.into()))
}

pub async fn update_one_subscribe_source(
    Path(id): Path<i32>,
    State(state): State<Arc<AppState>>,
    Extension(current_user): Extension<CurrentUser>,
    Json(subscribe_update_dto): Json<SubscribeSourceUpdateDto>,
) -> Result<Json<SubscribeSourceDto>, AppError> {
    let db = &state.conn;
    let mut pm = subscribe_source::Entity::find_by_id(id)
        .find_with_related(confluence::Entity)
        .filter(confluence::Column::Id.eq(&current_user.user_id))
        .limit(1)
        .all(db)
        .await?;
    if let Some(pm) = pm.pop() {
        let mut pam = pm.0.into_active_model();
        if let Some(name) = subscribe_update_dto.name {
            pam.name = Set(name);
        }
        if let Some(url) = subscribe_update_dto.url {
            pam.url = Set(url);
        };
        if let Some(content) = subscribe_update_dto.content {
            pam.content = Set(content);
        }
        let pam = pam.save(db).await?;
        let pm = pam.try_into_model()?;
        Ok(Json(pm.into()))
    } else {
        Err(AppError::DbNotFound(format!(
            "cannot find subscribe source id = {}",
            id
        )))
    }
}

pub async fn delete_one_subscribe_source(
    State(state): State<Arc<AppState>>,
    Extension(current_user): Extension<CurrentUser>,
    Path(id): Path<i32>,
) -> Result<(), AppError> {
    let db = &state.conn;
    let mut pm = subscribe_source::Entity::find_by_id(id)
        .find_with_related(confluence::Entity)
        .filter(confluence::Column::Creator.eq(&current_user.user_id))
        .limit(1)
        .all(db)
        .await?;
    if let Some(pm) = pm.pop() {
        let pam = pm.0.into_active_model();
        pam.delete(db).await?;
        Ok(())
    } else {
        Err(AppError::DbNotFound(format!(
            "cannot find subscribe source id = {}",
            id
        )))
    }
}

pub async fn sync_one_subscribe_source(
    State(state): State<Arc<AppState>>,
    Extension(current_user): Extension<CurrentUser>,
    Path(id): Path<i32>,
) -> Result<(), AppError> {
    let db = &state.conn;
    let mut pm = subscribe_source::Entity::find_by_id(id)
        .find_with_related(confluence::Entity)
        .filter(confluence::Column::Creator.eq(&current_user.user_id))
        .limit(1)
        .all(db)
        .await?;
    if let Some(pm) = pm.pop() {
        let pam = pm.0;
        let url = &pam.url;
        let content = reqwest::get(url).await?.text().await?;
        let mut pam = pam.into_active_model();
        pam.content = Set(content);
        pam.save(db).await?;
        Ok(())
    } else {
        Err(AppError::DbNotFound(format!(
            "cannot find subscribe source id = {}",
            id
        )))
    }
}

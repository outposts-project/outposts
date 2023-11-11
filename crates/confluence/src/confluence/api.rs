use crate::confluence::auth::CurrentUser;
use crate::confluence::dto::{
    SubscribeSourceCreationDto, SubscribeSourceDto, SubscribeSourceUpdateDto,
};
use crate::confluence::entities::subscribe_source;
use crate::{
    confluence::dto::ProfileCreationDto,
    confluence::entities::profile,
    confluence::error::AppError,
    confluence::{
        dto::{ConfluenceDto, ConfluenceUpdateDto, ProfileDto},
        entities,
        entities::confluence,
        services::{
            find_certain_confluence_profiles_and_subscribe_sources, find_one_confluence_in_db,
        },
    },
};
use axum::extract::{Path, State};
use axum::http::StatusCode;
use axum::{Extension, Json};
use itertools::izip;
use sea_orm::prelude::*;
use sea_orm::ActiveValue::Set;
use sea_orm::{IntoActiveModel, QuerySelect, TryIntoModel};
use std::sync::Arc;

#[derive(Clone)]
pub struct AppState {
    pub conn: DatabaseConnection,
    pub port: u16,
    pub jwks_uri: String,
    pub issuer: String,
    pub audience: String,
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
        .await?;

    let (pms, sms) = tokio::join!(
        cms.load_many(entities::profile::Entity, db),
        cms.load_many(entities::subscribe_source::Entity, db)
    );

    let (pms, sms) = (pms?, sms?);

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

    let confluence_model = confluence::ActiveModel {
        mux_content: Set("".into()),
        template: Set("".into()),
        creator: Set(current_user.user_id),
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
    let cm = cm.try_into_model()?;

    let (pms, sms) = find_certain_confluence_profiles_and_subscribe_sources(db, id).await?;

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

pub async fn find_one_profile_by_token(
    Path(token): Path<String>,
    State(state): State<Arc<AppState>>,
) -> Result<Json<ProfileDto>, AppError> {
    let db = &state.conn;
    let mut pms = profile::Entity::find()
        .filter(profile::Column::ResourceToken.eq(&token))
        .limit(1)
        .all(db)
        .await?;
    if let Some(pm) = pms.pop() {
        Ok(Json(ProfileDto::from(pm)))
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
    let pms = profile::ActiveModel {
        resource_token: Set(Uuid::new_v4().to_string()),
        confluence_id: Set(profile_creation_dto.confluence_id),
        ..Default::default()
    };
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
    let pms = subscribe_source::ActiveModel {
        confluence_id: Set(subscribe_creation_dto.confluence_id),
        name: Set(subscribe_creation_dto.name),
        ..Default::default()
    };
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
        pam.name = Set(subscribe_update_dto.name);
        pam.url = Set(subscribe_update_dto.url);
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
            "cannot find subscribe source id = {}",
            id
        )))
    }
}

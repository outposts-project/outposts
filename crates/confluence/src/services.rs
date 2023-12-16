use crate::auth::CurrentUser;
use crate::entities::{confluence, profile, subscribe_source};
use crate::error::AppError;
use sea_orm::prelude::*;

pub async fn find_one_confluence_in_db(
    db: &DatabaseConnection,
    id: i32,
    current_user: &CurrentUser,
) -> Result<confluence::Model, AppError> {
    confluence::Entity::find_by_id(id)
        .filter(confluence::Column::Creator.eq(&current_user.user_id))
        .one(db)
        .await?
        .ok_or_else(|| AppError::DbNotFound(format!("cannot find post id = {} for you", id)))
}

pub async fn find_certain_confluence_profiles_and_subscribe_sources(
    db: &DatabaseConnection,
    id: i32,
) -> Result<(Vec<profile::Model>, Vec<subscribe_source::Model>), AppError> {
    let (pms, sms) = tokio::join!(
        profile::Entity::find()
            .filter(profile::Column::ConfluenceId.eq(id))
            .all(db),
        subscribe_source::Entity::find()
            .filter(subscribe_source::Column::ConfluenceId.eq(id))
            .all(db)
    );

    Ok((pms?, sms?))
}

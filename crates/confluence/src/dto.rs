use crate::entities;
use serde::{Deserialize, Serialize};
use ts_rs::TS;

#[derive(Serialize, Deserialize, Clone, Debug, PartialEq, Eq, TS)]
#[ts(export)]
pub struct ProfileDto {
    pub id: i32,
    pub confluence_id: i32,
    #[ts(type = "number")]
    pub created_at: i64,
    #[ts(type = "number")]
    pub updated_at: i64,
    pub resource_token: String,
}

#[derive(Serialize, Deserialize, Clone, Debug, PartialEq, Eq, TS)]
#[ts(export)]
pub struct SubscribeSourceDto {
    pub id: i32,
    pub url: String,
    #[ts(type = "number")]
    pub created_at: i64,
    #[ts(type = "number")]
    pub updated_at: i64,
    pub confluence_id: i32,
    pub name: String,
    pub content: String,
    #[ts(type = "number", optional)]
    pub sub_upload: Option<i64>,
    #[ts(type = "number", optional)]
    pub sub_download: Option<i64>,
    #[ts(type = "number", optional)]
    pub sub_total: Option<i64>,
    #[ts(type = "number", optional)]
    pub sub_expire: Option<i64>,
}

impl From<entities::subscribe_source::Model> for SubscribeSourceDto {
    fn from(value: entities::subscribe_source::Model) -> Self {
        Self {
            id: value.id,
            url: value.url,
            confluence_id: value.confluence_id,
            created_at: value.created_at.timestamp_millis(),
            updated_at: value.updated_at.timestamp_millis(),
            name: value.name,
            content: value.content,
            sub_download: value.sub_download,
            sub_expire: value.sub_expire.map(|s| s.timestamp_millis()),
            sub_total: value.sub_total,
            sub_upload: value.sub_upload,
        }
    }
}

impl From<entities::profile::Model> for ProfileDto {
    fn from(value: entities::profile::Model) -> Self {
        Self {
            id: value.id,
            confluence_id: value.confluence_id,
            created_at: value.created_at.timestamp_millis(),
            updated_at: value.updated_at.timestamp_millis(),
            resource_token: value.resource_token,
        }
    }
}

#[derive(Serialize, Deserialize, Clone, Debug, PartialEq, Eq, TS)]
#[ts(export)]
pub struct ConfluenceDto {
    pub id: i32,
    pub template: String,
    pub creator: String,
    #[ts(type = "number")]
    pub created_at: i64,
    #[ts(type = "number")]
    pub updated_at: i64,
    pub mux_content: String,
    pub subscribe_sources: Vec<SubscribeSourceDto>,
    pub profiles: Vec<ProfileDto>,
    pub name: String,
    #[ts(type = "number", optional)]
    pub sub_upload: Option<i64>,
    #[ts(type = "number", optional)]
    pub sub_download: Option<i64>,
    #[ts(type = "number", optional)]
    pub sub_total: Option<i64>,
    #[ts(type = "number", optional)]
    pub sub_expire: Option<i64>,
    pub cron_expr: Option<String>,
    pub cron_expr_tz: Option<String>,
    #[ts(type = "number", optional)]
    pub cron_prev_at: Option<i64>,
    pub cron_err: Option<String>,
    #[ts(type = "number", optional)]
    pub cron_next_at: Option<i64>,
}

impl ConfluenceDto {
    pub fn from_orm(
        confluence: entities::confluence::Model,
        sms: Vec<entities::subscribe_source::Model>,
        pms: Vec<entities::profile::Model>,
    ) -> Self {
        Self {
            id: confluence.id,
            template: confluence.template,
            created_at: confluence.created_at.timestamp_millis(),
            updated_at: confluence.updated_at.timestamp_millis(),
            creator: confluence.creator,
            mux_content: confluence.mux_content,
            subscribe_sources: sms.into_iter().map(|s| s.into()).collect(),
            profiles: pms.into_iter().map(|s| s.into()).collect(),
            name: confluence.name,
            sub_download: confluence.sub_download,
            sub_expire: confluence.sub_expire.map(|s| s.timestamp_millis()),
            sub_total: confluence.sub_total,
            sub_upload: confluence.sub_upload,
            cron_expr: confluence.cron_expr,
            cron_expr_tz: confluence.cron_expr_tz,
            cron_prev_at: confluence.cron_prev_at.map(|s| s.timestamp_millis()),
            cron_err: confluence.cron_err,
            cron_next_at: confluence.cron_next_at.map(|s| s.timestamp_millis()),
        }
    }
}

#[derive(Serialize, Deserialize, Clone, Debug, PartialEq, Eq, TS)]
#[ts(export)]
pub struct ProfileCreationDto {
    pub confluence_id: i32,
}

#[derive(Serialize, Deserialize, Clone, Debug, PartialEq, Eq, TS)]
#[ts(export)]
pub struct SubscribeSourceCreationDto {
    pub confluence_id: i32,
    pub url: String,
    pub name: String,
}

#[derive(Serialize, Deserialize, Clone, Debug, PartialEq, Eq, TS)]
#[ts(export)]
pub struct SubscribeSourceUpdateDto {
    pub url: Option<String>,
    pub name: Option<String>,
    pub content: Option<String>,
}

#[derive(Serialize, Deserialize, Clone, Debug, PartialEq, Eq, TS)]
#[ts(export)]
pub struct ConfluenceUpdateDto {
    pub template: String,
}

#[derive(Serialize, Deserialize, Clone, Debug, PartialEq, Eq, TS)]
#[ts(export)]
pub struct ConfluenceUpdateCronDto {
    pub cron_expr: String,
    pub cron_expr_tz: String,
}

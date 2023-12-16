use crate::entities;
use serde::{Deserialize, Serialize};

#[derive(Serialize, Deserialize, Clone, Debug, PartialEq, Eq)]
pub struct ProfileDto {
    pub id: i32,
    pub confluence_id: i32,
    pub created_at: i64,
    pub updated_at: i64,
    pub resource_token: String,
}

#[derive(Serialize, Deserialize, Clone, Debug, PartialEq, Eq)]
pub struct SubscribeSourceDto {
    pub id: i32,
    pub url: String,
    pub created_at: i64,
    pub updated_at: i64,
    pub confluence_id: i32,
}

impl From<entities::subscribe_source::Model> for SubscribeSourceDto {
    fn from(value: entities::subscribe_source::Model) -> Self {
        Self {
            id: value.id,
            url: value.url,
            confluence_id: value.confluence_id,
            created_at: value.created_at.timestamp_millis(),
            updated_at: value.updated_at.timestamp_millis(),
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

#[derive(Serialize, Deserialize, Clone, Debug, PartialEq, Eq)]
pub struct ConfluenceDto {
    pub id: i32,
    pub template: String,
    pub creator: String,
    pub created_at: i64,
    pub updated_at: i64,
    pub mux_content: String,
    pub subscribe_sources: Vec<SubscribeSourceDto>,
    pub profiles: Vec<ProfileDto>,
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
        }
    }
}

#[derive(Serialize, Deserialize, Clone, Debug, PartialEq, Eq)]
pub struct ProfileCreationDto {
    pub confluence_id: i32,
}

#[derive(Serialize, Deserialize, Clone, Debug, PartialEq, Eq)]
pub struct SubscribeSourceCreationDto {
    pub confluence_id: i32,
    pub url: String,
    pub name: String,
}

#[derive(Serialize, Deserialize, Clone, Debug, PartialEq, Eq)]
pub struct SubscribeSourceUpdateDto {
    pub url: String,
    pub name: String,
}

#[derive(Serialize, Deserialize, Clone, Debug, PartialEq, Eq)]
pub struct ConfluenceUpdateDto {
    pub template: String,
}

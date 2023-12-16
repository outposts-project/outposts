//! `SeaORM` Entity. Generated by sea-orm-codegen 0.12.4

use sea_orm::entity::prelude::*;

#[derive(Clone, Debug, PartialEq, DeriveEntityModel, Eq)]
#[sea_orm(table_name = "confluence")]
pub struct Model {
    #[sea_orm(primary_key)]
    pub id: i32,
    #[sea_orm(column_type = "Text")]
    pub template: String,
    pub creator: String,
    pub created_at: DateTime,
    pub updated_at: DateTime,
    #[sea_orm(column_type = "Text")]
    pub mux_content: String,
}

#[derive(Copy, Clone, Debug, EnumIter, DeriveRelation)]
pub enum Relation {
    #[sea_orm(has_many = "super::profile::Entity")]
    Profile,
    #[sea_orm(has_many = "super::subscribe_source::Entity")]
    SubscribeSource,
}

impl Related<super::profile::Entity> for Entity {
    fn to() -> RelationDef {
        Relation::Profile.def()
    }
}

impl Related<super::subscribe_source::Entity> for Entity {
    fn to() -> RelationDef {
        Relation::SubscribeSource.def()
    }
}

impl ActiveModelBehavior for ActiveModel {}
use sea_orm_migration::prelude::*;
use super::defs::{Confluence};

#[derive(DeriveMigrationName)]
pub struct Migration;

#[async_trait::async_trait]
impl MigrationTrait for Migration {
    async fn up(&self, manager: &SchemaManager) -> Result<(), DbErr> {
        manager.alter_table(
            Table::alter()
                .table(Confluence::Table)
                .add_column_if_not_exists(
                    ColumnDef::new(Confluence::UserAgent)
                        .text()
                        .not_null()
                        .default("")
                ).to_owned()
        ).await?;
        Ok(())
    }

    async fn down(&self, manager: &SchemaManager) -> Result<(), DbErr> {
        manager.alter_table(
            Table::alter()
                .table(Confluence::Table)
                .drop_column(Confluence::UserAgent)
                .to_owned()
        ).await?;
        Ok(())
    }
}
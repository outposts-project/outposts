use sea_orm::Statement;
use sea_orm_migration::prelude::*;

#[derive(DeriveIden)]
pub enum Confluence {
    Table,
    Id,
    Template,
    Creator,
    CreatedAt,
    UpdatedAt,
    MuxContent,
    Name,
    SubUpload,
    SubDownload,
    SubTotal,
    SubExpire,
}

#[derive(DeriveIden)]
pub enum Profile {
    Table,
    Id,
    ConfluenceId,
    CreatedAt,
    UpdatedAt,
    ResourceToken,
}

#[derive(DeriveIden)]
pub enum SubscribeSource {
    Table,
    Id,
    Url,
    CreatedAt,
    UpdatedAt,
    ConfluenceId,
    Name,
    Content,
    SubUpload,
    SubDownload,
    SubTotal,
    SubExpire,
}

pub async fn create_postgres_auto_update_ts_fn<'a>(
    manager: &SchemaManager<'a>,
    col_name: &str,
) -> Result<(), DbErr> {
    let sql = format!(
        "CREATE OR REPLACE FUNCTION update_{col_name}_column() \
        RETURNS TRIGGER AS $$ \
        BEGIN \
            NEW.{col_name}  = current_timestamp; \
            RETURN NEW; \
        END; \
        $$ language 'plpgsql';"
    );

    manager
        .get_connection()
        .execute(Statement::from_string(manager.get_database_backend(), sql))
        .await?;

    Ok(())
}

pub async fn create_postgres_auto_update_ts_trigger<'a>(
    manager: &SchemaManager<'a>,
    col_name: &str,
    tab_name: &str,
) -> Result<(), DbErr> {
    let sql = format!(
        "CREATE OR REPLACE TRIGGER update_{tab_name}_{col_name}_column_trigger BEFORE UPDATE ON {tab_name} FOR EACH ROW EXECUTE PROCEDURE update_{col_name}_column();"
    );
    manager
        .get_connection()
        .execute(Statement::from_string(manager.get_database_backend(), sql))
        .await?;
    Ok(())
}

pub async fn drop_postgres_auto_update_ts_fn<'a>(
    manager: &SchemaManager<'a>,
    col_name: &str,
) -> Result<(), DbErr> {
    let sql = format!("DROP FUNCTION IF EXISTS update_{col_name}_column();");
    manager
        .get_connection()
        .execute(Statement::from_string(manager.get_database_backend(), sql))
        .await?;
    Ok(())
}

pub async fn drop_postgres_auto_update_ts_trigger<'a>(
    manager: &SchemaManager<'a>,
    col_name: &str,
    tab_name: &str,
) -> Result<(), DbErr> {
    let sql = format!(
        "DROP TRIGGER IF EXISTS update_{tab_name}_{col_name}_column_trigger ON {tab_name};"
    );
    manager
        .get_connection()
        .execute(Statement::from_string(manager.get_database_backend(), sql))
        .await?;
    Ok(())
}

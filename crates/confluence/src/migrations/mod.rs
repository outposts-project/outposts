pub use sea_orm_migration::prelude::*;

mod defs;
mod m20220101_000001_create_table;
mod m20240130_083647_subscribe_source_add_details;
mod m20240130_131930_add_updated_at_triggers;
mod m20240201_061359_cron_confluence_sync_and_mux;
mod m20240213_092818_custom_ua;


pub struct Migrator;

#[async_trait::async_trait]
impl MigratorTrait for Migrator {
    fn migrations() -> Vec<Box<dyn MigrationTrait>> {
        vec![
            Box::new(m20220101_000001_create_table::Migration),
            Box::new(m20240130_083647_subscribe_source_add_details::Migration),
            Box::new(m20240130_131930_add_updated_at_triggers::Migration),
            Box::new(m20240201_061359_cron_confluence_sync_and_mux::Migration),
            Box::new(m20240213_092818_custom_ua::Migration)
        ]
    }
}

#![feature(slice_take)]
#![feature(async_closure)]

pub mod api;
pub mod auth;
pub mod clash;
pub mod dto;
pub mod error;
pub mod mux;
pub mod config;
#[allow(warnings, unused)]
pub mod prisma;
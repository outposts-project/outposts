#![feature(slice_take)]
#![feature(async_closure)]
#![feature(iter_intersperse)]
#![feature(addr_parse_ascii)]
#![feature(assert_matches)]

pub mod auth;
pub mod clash;
pub mod config;
pub mod dto;
pub mod entities;
pub mod error;
pub mod migrations;
pub mod mux;
pub mod services;
pub mod tasks;

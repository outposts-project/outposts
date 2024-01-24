#[derive(Clone, Debug)]
pub enum AuthConfig {
    JWT {
        jwks_uri: String,
        issuer: String,
        audience: String,
    },
    DevNoAuth {
        user_id: String,
    },
}

#[derive(Clone, Debug)]
pub struct AppConfig {
    pub port: u16,
    pub host: String,
    pub auth: AuthConfig,
    pub database_url: String,
}

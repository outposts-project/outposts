use serde::{Deserialize, Serialize};
use serde_yaml::Value;
use std::collections::HashMap;

#[derive(Serialize, Deserialize, Clone, Debug, PartialEq, Eq)]
pub struct Proxy {
    pub name: String,
    pub server: String,
    #[serde(flatten)]
    pub others: HashMap<String, Value>,
}

#[derive(
    serde_enum_str::Deserialize_enum_str,
    serde_enum_str::Serialize_enum_str,
    Debug,
    PartialEq,
    PartialOrd,
    Eq,
    Ord,
    Clone,
)]
#[serde(rename_all = "snake_case")]
pub enum ProxyGroupKind {
    Select,
    #[serde(other)]
    Other(String),
}

#[derive(Serialize, Deserialize, Clone, Debug, PartialEq, Eq)]
pub struct ProxyGroup {
    pub name: String,
    #[serde(rename = "type")]
    pub kind: ProxyGroupKind,
    pub proxies: Vec<String>,
    #[serde(flatten)]
    pub others: HashMap<String, Value>,
}

#[derive(Serialize, Deserialize, Clone, Debug, PartialEq, Eq, Ord, PartialOrd)]
pub struct Rule(pub String);

#[derive(Serialize, Deserialize, Debug, Clone, PartialEq, Eq)]
pub struct ClashConfig {
    pub proxies: Vec<Proxy>,
    #[serde(rename = "proxy-groups")]
    pub proxy_groups: Vec<ProxyGroup>,
    pub rules: Vec<Rule>,
    #[serde(flatten)]
    pub others: HashMap<String, Value>,
}

#[cfg(test)]
mod tests {
    use super::ClashConfig;

    #[test]
    fn test_model() -> anyhow::Result<()> {
        let tmpl = include_str!("../../tests/tmpl.yaml");
        let config: ClashConfig = serde_yaml::from_str(tmpl)?;

        assert_eq!(config.rules.len(), 1usize);
        assert_eq!(config.proxy_groups.len(), 3usize);
        assert_eq!(config.proxies.len(), 0usize);
        assert_eq!(
            config.others.get("port"),
            Some(&serde_yaml::Value::Number(serde_yaml::Number::from(7890)))
        );

        Ok(())
    }
}

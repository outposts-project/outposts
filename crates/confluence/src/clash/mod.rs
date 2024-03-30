pub mod http;
pub mod utils;

pub use http::parse_subscription_userinfo_in_header;
use serde::{Deserialize, Serialize};
use serde_yaml::Value;
use std::collections::HashMap;
use monostate::MustBe;

#[derive(Serialize, Deserialize, Clone, Debug, PartialEq, Eq)]
pub struct HysteriaV1Proxy {
    #[serde(rename = "type")]
    pub kind: MustBe!("hysteria"),
    #[serde(rename = "auth-str", alias = "auth_str")]
    pub auth_str: String,
    pub name: String,
    pub server: String,
    #[serde(flatten)]
    pub others: HashMap<String, Value>,
}

#[derive(Serialize, Deserialize, Clone, Debug, PartialEq, Eq)]
pub struct OtherProxy {
    pub name: String,
    pub server: String,
    #[serde(flatten)]
    pub others: HashMap<String, Value>,
}

#[derive(Serialize, Deserialize, Clone, Debug, PartialEq, Eq)]
#[serde(untagged)]
pub enum Proxy {
    HysteriaV1(HysteriaV1Proxy),
    OtherProxy(OtherProxy)
}

impl Proxy {
    pub fn name(&self) -> &str {
        match self {
            Proxy::HysteriaV1(proxy) => &proxy.name,
            Proxy::OtherProxy(proxy) => &proxy.name,
        }
    }

    pub fn server(&self) -> &str {
        match self {
            Proxy::HysteriaV1(proxy) => &proxy.server,
            Proxy::OtherProxy(proxy) => &proxy.server,
        }
    }
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
    #[serde(flatten)]
    pub others: HashMap<String, Value>,
    pub proxies: Vec<String>,
}

#[derive(Serialize, Deserialize, Clone, Debug, PartialEq, Eq, Ord, PartialOrd)]
pub struct Rule(pub String);

#[derive(Serialize, Deserialize, Debug, Clone, PartialEq, Eq)]
pub struct ClashConfig {
    #[serde(flatten)]
    pub others: HashMap<String, Value>,
    pub proxies: Vec<Proxy>,
    #[serde(rename = "proxy-groups")]
    pub proxy_groups: Vec<ProxyGroup>,
    pub rules: Vec<Rule>,
}

#[cfg(test)]
mod tests {
    use super::{ClashConfig, Proxy};

    #[test]
    fn test_model() -> anyhow::Result<()> {
        let tmpl = include_str!("../tests/tmpl.yaml");
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

    #[test]
    fn test_hysteria_v1_auth_str_polyfill () {
        let proxy_str1 = r#"
            { name: "aaa", type: hysteria, server: "bbb", port: 4430, auth_str: "dddd", alpn: h3, protocol: udp, up: 70, down: 150, fast-open: true, disable_mtu_discovery: true, skip-cert-verify: true, ports: 5000-20000 }
        "#;

        let proxy_str2 = r#"
            { name: "aaa", type: hysteria, server: "bbb", port: 4430, auth-str: "dddd", alpn: h3, protocol: udp, up: 70, down: 150, fast-open: true, disable_mtu_discovery: true, skip-cert-verify: true, ports: 5000-20000 }
        "#;

        let proxy1: Proxy = serde_yaml::from_str(proxy_str1).expect("should parse proxy success");
        let proxy2: Proxy = serde_yaml::from_str(proxy_str2).expect("should parse proxy success");

        assert_eq!(proxy1, proxy2);

        matches!(&proxy1, &Proxy::HysteriaV1(_));

        #[allow(irrefutable_let_patterns)]
        if let Proxy::HysteriaV1(proxy) = proxy1 {
            assert_eq!(&proxy.auth_str, "dddd");
        }
    }
}

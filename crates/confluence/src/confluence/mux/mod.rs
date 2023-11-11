use crate::confluence::clash::{ClashConfig, Proxy, ProxyGroup, ProxyGroupKind, Rule};
use crate::confluence::error::ConfigError;
use addr::parse_domain_name;
use std::collections::{HashMap, HashSet};

const PROXY_SLOT: &str = "<mux>";

pub fn mux_configs(
    template: &ClashConfig,
    sources: &[(&str, ClashConfig)],
) -> anyhow::Result<ClashConfig> {
    let others = &template.others;
    let rules = &template.rules;
    let proxy_groups = &template.proxy_groups;
    let mut name_to_proxies_map = HashMap::<&str, Vec<Proxy>>::new();
    let mut proxy_servers = HashSet::<&str>::new();

    let mut mux_proxies = vec![];
    let mut mux_proxy_groups = vec![];
    let mut mux_rules = vec![];

    for (name, config) in sources {
        for p in &config.proxies {
            {
                // resolve proxy server root domain
                let proxy_server =
                    parse_domain_name(&p.server).map_err(|e| ConfigError::ProxyServerInvalid {
                        config_name: name.to_string(),
                        server: p.server.to_string(),
                        source_kind: e.kind(),
                    })?;
                let proxy_server_root =
                    proxy_server
                        .root()
                        .ok_or_else(|| ConfigError::ProxyServerInvalid {
                            config_name: name.to_string(),
                            server: p.server.to_string(),
                            source_kind: addr::error::Kind::EmptyName,
                        })?;
                proxy_servers.insert(proxy_server_root);
            }

            {
                // group proxies by config name
                name_to_proxies_map
                    .entry(name)
                    .and_modify(|v| v.push(p.clone()))
                    .or_insert_with(|| vec![p.clone()]);
            }

            {
                mux_proxies.push(p.clone());
            }
        }
    }

    {
        let names = sources.iter().map(|e| e.0.to_string()).collect::<Vec<_>>();

        for g in proxy_groups {
            let mut n = g.clone();
            if let Some(index) = n.proxies.iter().position(|f| f.trim() == PROXY_SLOT) {
                n.proxies.splice(index..index + 1, names.clone());
            }
            mux_proxy_groups.push(n);
        }

        mux_proxy_groups.extend(
            name_to_proxies_map
                .iter()
                .map(|(name, proxies)| ProxyGroup {
                    name: name.to_string(),
                    kind: ProxyGroupKind::Select,
                    proxies: proxies.iter().map(|p| p.name.to_string()).collect(),
                    others: HashMap::new(),
                }),
        )
    }

    {
        mux_rules.extend(
            proxy_servers
                .into_iter()
                .map(|s| Rule(format!("DOMAIN-SUFFIX,{},DIRECT", s))),
        );
        mux_rules.extend_from_slice(&rules);
    }

    Ok(ClashConfig {
        others: others.clone(),
        proxies: mux_proxies,
        proxy_groups: mux_proxy_groups,
        rules: mux_rules,
    })
}

#[cfg(test)]
mod tests {
    use crate::confluence::clash::{ClashConfig, Rule};
    use crate::confluence::mux::mux_configs;

    #[test]
    fn test_mux_configs() -> anyhow::Result<()> {
        let rules1 = include_str!("../../tests/profile1.yaml");

        let rules2 = include_str!("../../tests/profile2.yaml");

        let tmpl = include_str!("../../tests/tmpl.yaml");

        let config1: ClashConfig = serde_yaml::from_str(rules1)?;
        let config2: ClashConfig = serde_yaml::from_str(rules2)?;
        let config_tmpl: ClashConfig = serde_yaml::from_str(tmpl)?;
        let sources = vec![("proxy1", config1), ("proxy2", config2)];

        let config_res = mux_configs(&config_tmpl, &sources)?;

        let expected_rules: Vec<Rule> = serde_yaml::from_str(
            r"
- DOMAIN-SUFFIX,proxy1.com,DIRECT
- DOMAIN-SUFFIX,proxy2.com,DIRECT
- DOMAIN-SUFFIX,google.com,Proxy
        ",
        )?;

        let expected_proxies: Vec<String> = serde_yaml::from_str(
            r#"
- "SPEED"
- "QUANTITY"
- "DIRECT"
- "proxy1"
- "proxy2"
- "REJECT"
        "#,
        )?;

        assert_eq!(config_res.rules, expected_rules);
        assert!(&config_res
            .proxy_groups
            .iter()
            .find(|p| p.name == "proxy1")
            .is_some());
        assert_eq!(
            &config_res
                .proxy_groups
                .iter()
                .find(|p| p.name == "PROXY")
                .unwrap()
                .proxies,
            &expected_proxies
        );

        Ok(())
    }
}

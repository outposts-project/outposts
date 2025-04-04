set windows-shell := ["pwsh.exe", "-c"]

dev-confluence:
  cargo watch -w crates/confluence -x "run --bin confluence_server"

dev-webui:
  npx nx serve outposts-web

dev-proxy:
  npm run start -w dev-proxy

container-build:
  docker compose build

container-deploy:
  docker compose up -d

dev-confluence:
  cargo watch -w crates/confluence -x "run --bin confluence_server"

dev-web:
  npm run start -w outposts-web

dev-proxy:
  npm run start -w dev-proxy

container-build:
  docker compose build

container-deploy:
  docker compose up -d
# Init

## Install

see `../compose.yaml`.

## Start

```sh
sudo docker compose up -d
sudo docker exec -it postgres bash
psql -U postgres -W
```

```sql
CREATE ROLE outposts;
ALTER USER outposts WITH ENCRYPTED PASSWORD 'outposts';
ALTER USER outposts WITH LOGIN INHERIT CREATEDB CREATEROLE REPLICATION;
```

## Link Example

[directory."default"]
type = "sql"
"postgresql://outposts:outposts@postgres:5432/db1?sslmode=disable"

```sql
CREATE DATABASE db1;
\c db1;
GRANT ALL PRIVILEGES ON DATABASE db1 TO outposts;
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO outposts;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO outposts;
GRANT ALL PRIVILEGES ON ALL FUNCTIONS IN SCHEMA public TO outposts;
ALTER DATABASE db1 OWNER TO outposts;
```

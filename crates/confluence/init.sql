create table if not exists public.confluence (
  id serial constraint confluence_pk primary key,
  template text not null,
  creator varchar not null,
  created_at timestamp default now() not null,
  updated_at timestamp default now() not null,
  mux_content text not null,
  name varchar not null
);
alter table public.confluence owner to outposts;
create index if not exists confluence_creator_uindex on public.confluence (creator);
create table if not exists public.profile (
  id serial constraint profile_pk primary key,
  confluence_id integer not null constraint profile_confluence_id_fk references public.confluence,
  created_at timestamp default now() not null,
  updated_at timestamp default now() not null,
  resource_token varchar not null
);
alter table public.profile owner to outposts;
create index if not exists profile_confluence_id_index on public.profile (confluence_id);
create index if not exists profile_resource_token_index on public.profile (resource_token);
create table if not exists public.subscribe_source (
  id serial constraint subscribe_source_pk primary key,
  url text not null,
  created_at timestamp default now() not null,
  updated_at timestamp default now() not null,
  confluence_id integer not null constraint subscribe_source_confluence_id_fk references public.confluence,
  name varchar(255) not null,
  content text not null
);
alter table public.subscribe_source owner to outposts;
create index if not exists subscribe_source_confluence_id_index on public.subscribe_source (confluence_id);
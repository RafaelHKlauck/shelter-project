-- AdotaPet — initial schema
-- Extensions, enums and base tables for shelters/animals/people, requests and chat.

-- Extensions
create extension if not exists postgis with schema extensions;

-- Enums
create type user_role      as enum ('user', 'shelter_team');
create type shelter_role   as enum ('admin', 'editor', 'volunteer');
create type animal_size    as enum ('small', 'medium', 'large');
create type animal_species as enum ('dog', 'cat', 'other');
create type housing_type   as enum ('house', 'apartment');
create type request_kind   as enum ('adoption', 'volunteer', 'supply');
create type request_status as enum ('pending', 'accepted', 'rejected', 'finalized', 'cancelled');
create type animal_status  as enum ('available', 'reserved', 'adopted', 'unavailable');
create type supply_status  as enum ('open', 'in_progress', 'fulfilled', 'cancelled');

-- profiles (RF04): 1:1 with auth.users, public-facing pessoa
create table public.profiles (
  id              uuid primary key references auth.users(id) on delete cascade,
  full_name       text not null,
  cpf_hash        text not null,
  cpf_encrypted   text,
  birth_date      date not null,
  housing_type    housing_type not null,
  address_line    text not null,
  address_number  text,
  address_city    text not null,
  address_state   char(2) not null,
  address_zip     text not null,
  location        extensions.geography(Point, 4326),
  avatar_url      text,
  role            user_role not null default 'user',
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);
create unique index profiles_cpf_hash_uniq on public.profiles(cpf_hash);

-- shelters (RF01)
create table public.shelters (
  id              uuid primary key default gen_random_uuid(),
  name            text not null,
  slug            text unique not null,
  description     text,
  phone           text not null,
  email           text,
  address_line    text not null,
  address_city    text not null,
  address_state   char(2) not null,
  address_zip     text not null,
  location        extensions.geography(Point, 4326) not null,
  needs_supplies  boolean not null default false,
  cover_url       text,
  created_by      uuid references auth.users(id),
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

-- shelter_media: galeria (RF01)
create table public.shelter_media (
  id         uuid primary key default gen_random_uuid(),
  shelter_id uuid not null references public.shelters(id) on delete cascade,
  url        text not null,
  position   int  not null default 0,
  created_at timestamptz not null default now()
);

-- shelter_members: papel pessoa↔abrigo (RF06-RF09, RN04)
create table public.shelter_members (
  shelter_id  uuid not null references public.shelters(id) on delete cascade,
  user_id     uuid not null references auth.users(id) on delete cascade,
  role        shelter_role not null,
  promoted_by uuid references auth.users(id),
  created_at  timestamptz not null default now(),
  primary key (shelter_id, user_id)
);

-- animals (RF02, RF03, RN01)
create table public.animals (
  id                   uuid primary key default gen_random_uuid(),
  shelter_id           uuid not null references public.shelters(id) on delete cascade,
  name                 text,
  species              animal_species not null,
  breed                text,
  size                 animal_size not null,
  estimated_age_months int not null check (estimated_age_months >= 0),
  neutered             boolean not null default false,
  temperament          text[],
  health_notes         text,
  status               animal_status not null default 'available',
  cover_url            text,
  created_at           timestamptz not null default now(),
  updated_at           timestamptz not null default now()
);

-- animal_media (RF02)
create table public.animal_media (
  id         uuid primary key default gen_random_uuid(),
  animal_id  uuid not null references public.animals(id) on delete cascade,
  url        text not null,
  position   int  not null default 0,
  created_at timestamptz not null default now()
);

-- supply_needs (RF11)
create table public.supply_needs (
  id                  uuid primary key default gen_random_uuid(),
  shelter_id          uuid not null references public.shelters(id) on delete cascade,
  title               text not null,
  description         text,
  quantity_target     int,
  quantity_fulfilled  int not null default 0,
  unit                text,
  status              supply_status not null default 'open',
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now()
);

-- requests (RF15-RF20, RF24): unified for adoption/volunteer/supply
create table public.requests (
  id              uuid primary key default gen_random_uuid(),
  kind            request_kind not null,
  status          request_status not null default 'pending',
  shelter_id      uuid not null references public.shelters(id),
  requester_id    uuid not null references auth.users(id),
  animal_id       uuid references public.animals(id),
  supply_need_id  uuid references public.supply_needs(id),
  message         text,
  quantity_offered int,
  decided_by      uuid references auth.users(id),
  decided_at      timestamptz,
  finalized_at    timestamptz,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  constraint requests_kind_targets check (
    (kind = 'adoption'  and animal_id is not null and supply_need_id is null) or
    (kind = 'supply'    and supply_need_id is not null and animal_id is null) or
    (kind = 'volunteer' and animal_id is null and supply_need_id is null)
  )
);

-- conversations (RF20)
create table public.conversations (
  id                       uuid primary key default gen_random_uuid(),
  request_id               uuid not null unique references public.requests(id) on delete cascade,
  shelter_id               uuid not null references public.shelters(id),
  requester_id             uuid not null references auth.users(id),
  closed_at                timestamptz,
  last_message_at          timestamptz,
  last_message_preview     text,
  requester_last_read_at   timestamptz,
  shelter_last_read_at     timestamptz,
  created_at               timestamptz not null default now()
);

-- messages (RNF06)
create table public.messages (
  id              uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.conversations(id) on delete cascade,
  sender_id       uuid not null references auth.users(id),
  body            text not null check (length(body) between 1 and 4000),
  created_at      timestamptz not null default now()
);

-- notifications (RF18)
create table public.notifications (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid references auth.users(id),
  shelter_id  uuid references public.shelters(id),
  kind        text not null,
  payload     jsonb not null,
  read_at     timestamptz,
  created_at  timestamptz not null default now(),
  check (user_id is not null or shelter_id is not null)
);

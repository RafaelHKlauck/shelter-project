-- Feed RPCs para /animals e /shelters com cálculo de distância via PostGIS

create or replace function public.animals_feed(
  p_species text default null,
  p_size text default null,
  p_max_km numeric default null,
  p_search text default null
)
returns table (
  id uuid,
  name text,
  species animal_species,
  breed text,
  size animal_size,
  estimated_age_months int,
  neutered boolean,
  cover_url text,
  shelter_id uuid,
  shelter_name text,
  distance_km numeric
)
language sql
stable
security invoker
set search_path = public, extensions
as $$
  with me as (
    select location as loc
    from public.profiles
    where id = auth.uid()
  )
  select
    a.id,
    a.name,
    a.species,
    a.breed,
    a.size,
    a.estimated_age_months,
    a.neutered,
    a.cover_url,
    s.id as shelter_id,
    s.name as shelter_name,
    case
      when (select loc from me) is not null and s.location is not null
        then public.f_distance_km((select loc from me), s.location)
      else null
    end as distance_km
  from public.animals a
  join public.shelters s on s.id = a.shelter_id
  where a.status = 'available'
    and (p_species is null or a.species::text = p_species)
    and (p_size is null or a.size::text = p_size)
    and (
      p_search is null
      or a.name ilike '%' || p_search || '%'
      or a.breed ilike '%' || p_search || '%'
    )
    and (
      p_max_km is null
      or (select loc from me) is null
      or s.location is null
      or public.f_distance_km((select loc from me), s.location) <= p_max_km
    )
  order by
    case
      when (select loc from me) is not null and s.location is not null
        then public.f_distance_km((select loc from me), s.location)
      else 999999
    end,
    a.created_at desc;
$$;

create or replace function public.shelters_feed(
  p_max_km numeric default null,
  p_search text default null
)
returns table (
  id uuid,
  name text,
  description text,
  cover_url text,
  needs_supplies boolean,
  animals_count bigint,
  distance_km numeric
)
language sql
stable
security invoker
set search_path = public, extensions
as $$
  with me as (
    select location as loc
    from public.profiles
    where id = auth.uid()
  ),
  counts as (
    select shelter_id, count(*) as n
    from public.animals
    where status = 'available'
    group by shelter_id
  )
  select
    s.id,
    s.name,
    s.description,
    s.cover_url,
    s.needs_supplies,
    coalesce(c.n, 0) as animals_count,
    case
      when (select loc from me) is not null and s.location is not null
        then public.f_distance_km((select loc from me), s.location)
      else null
    end as distance_km
  from public.shelters s
  left join counts c on c.shelter_id = s.id
  where
    (p_search is null
      or s.name ilike '%' || p_search || '%'
      or s.address_city ilike '%' || p_search || '%')
    and (
      p_max_km is null
      or (select loc from me) is null
      or s.location is null
      or public.f_distance_km((select loc from me), s.location) <= p_max_km
    )
  order by
    case
      when (select loc from me) is not null and s.location is not null
        then public.f_distance_km((select loc from me), s.location)
      else 999999
    end,
    s.name;
$$;

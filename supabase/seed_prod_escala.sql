-- Massa de testes da escala de voluntariado para o ambiente PUBLICADO (seção 9.3 da proposta).
-- Complementa os usuários de demonstração do Grau B (senha de todos: adota123).
--
-- Rodar:  supabase db query --linked -f supabase/seed_prod_escala.sql
-- Conferir: supabase db query --linked -o table -f supabase/seed_prod_escala_check.sql
-- Pode ser executado mais de uma vez: não duplica usuários, vínculos nem turnos.
-- Os turnos T1–T4 (Tabela 12) são criados no próximo sábado a partir da data da execução.
--
-- O que faz:
--   1. cria Jorge Menezes (jorge@adotapet.test) e Lucas Pereira (lucas@adotapet.test)
--   2. aprova candidaturas de voluntariado no Abrigo Esperança para Maria, Jorge e Lucas
--      (a Maria já é voluntária no Refúgio Animal; o João continua com a candidatura pendente)
--   3. cadastra T1–T4

do $$
declare
  v_carla   uuid := (select id from auth.users where email = 'admin@esperanca.test');
  v_rafael  uuid := (select id from auth.users where email = 'admin@refugio.test');
  v_maria   uuid := (select id from auth.users where email = 'voluntaria@adotapet.test');
  v_esperanca uuid := (select id from public.shelters where name = 'Abrigo Esperança');
  v_refugio   uuid := (select id from public.shelters where name = 'Refúgio Animal');
  v_sat date;
  u record;
  v_uid uuid;
  v_req uuid;
begin
  if v_carla is null or v_rafael is null or v_maria is null or v_esperanca is null or v_refugio is null then
    raise exception 'Usuários ou abrigos de demonstração não encontrados. Este script complementa a massa do Grau B.';
  end if;

  -- ===== 1. Usuários novos =====
  for u in
    select * from (values
      ('88888888-8888-8888-8888-888888888888'::uuid, 'jorge@adotapet.test', 'Jorge Menezes', '86288366757', '862.883.667-57', date '1962-01-15', 'house'::housing_type,     'Rua Padre Chagas', '45',   '90570080'),
      ('99999999-9999-9999-9999-999999999999'::uuid, 'lucas@adotapet.test', 'Lucas Pereira', '71428793860', '714.287.938-60', date '2001-11-30', 'apartment'::housing_type, 'Av. Ipiranga',     '6681', '90619900')
    ) as t(id, email, full_name, cpf, cpf_fmt, birth, housing, street, num, zip)
  loop
    select id into v_uid from auth.users where email = u.email;
    if v_uid is null then
      v_uid := u.id;
      insert into auth.users (
        instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
        raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
        confirmation_token, email_change, email_change_token_new, recovery_token
      ) values (
        '00000000-0000-0000-0000-000000000000', v_uid, 'authenticated', 'authenticated', u.email,
        extensions.crypt('adota123', extensions.gen_salt('bf')), now(),
        '{"provider":"email","providers":["email"]}', '{}', now(), now(), '', '', '', ''
      );
      insert into auth.identities (id, user_id, provider_id, identity_data, provider, last_sign_in_at, created_at, updated_at)
      values (gen_random_uuid(), v_uid, v_uid::text,
              jsonb_build_object('sub', v_uid::text, 'email', u.email, 'email_verified', true),
              'email', now(), now(), now());
    end if;

    insert into public.profiles (id, full_name, cpf_hash, cpf_encrypted, birth_date, housing_type,
                                 address_line, address_number, address_city, address_state, address_zip, location)
    values (v_uid, u.full_name, encode(extensions.digest(u.cpf, 'sha256'), 'hex'), u.cpf_fmt, u.birth, u.housing,
            u.street, u.num, 'Porto Alegre', 'RS', u.zip,
            extensions.st_setsrid(extensions.st_makepoint(-51.2177, -30.0346), 4326)::extensions.geography)
    on conflict (id) do nothing;
  end loop;

  -- ===== 2. Voluntários do Abrigo Esperança (Maria, Jorge, Lucas) =====
  for v_uid in
    select id from auth.users where email in ('voluntaria@adotapet.test', 'jorge@adotapet.test', 'lucas@adotapet.test')
  loop
    if not exists (select 1 from public.shelter_members where shelter_id = v_esperanca and user_id = v_uid) then
      select id into v_req from public.requests
       where kind = 'volunteer' and shelter_id = v_esperanca and requester_id = v_uid
       order by created_at desc limit 1;
      if v_req is null then
        insert into public.requests (kind, status, shelter_id, requester_id, message)
        values ('volunteer', 'pending', v_esperanca, v_uid, 'Quero ajudar na escala de voluntariado.')
        returning id into v_req;
      end if;
      -- o trigger requests_on_status_change cria o shelter_members(volunteer) e notifica a pessoa
      update public.requests set status = 'accepted', decided_by = v_carla
       where id = v_req and status <> 'accepted';
      insert into public.shelter_members (shelter_id, user_id, role)
      values (v_esperanca, v_uid, 'volunteer') on conflict do nothing;
    end if;
  end loop;

  -- ===== 3. Turnos T1–T4 no próximo sábado (horário de Brasília) =====
  v_sat := (now() at time zone 'America/Sao_Paulo')::date;
  v_sat := v_sat + ((6 - extract(isodow from v_sat)::int + 7) % 7);
  if v_sat = (now() at time zone 'America/Sao_Paulo')::date then
    v_sat := v_sat + 7;  -- se hoje é sábado, usa o próximo
  end if;

  insert into public.volunteer_shifts (shelter_id, title, task_type, description, starts_at, ends_at, capacity, created_by)
  select x.shelter, x.title, x.task::shift_task, x.descr,
         (v_sat + x.s) at time zone 'America/Sao_Paulo',
         (v_sat + x.e) at time zone 'America/Sao_Paulo',
         x.cap, x.by
    from (values
      (v_esperanca, 'Passeio com os cães', 'walk',     'Passeio com os cães no parque ao lado do abrigo.', time '09:00', time '12:00', 3, v_carla),
      (v_esperanca, 'Limpeza dos canis',   'cleaning', 'Limpeza e troca das caminhas.',                    time '13:00', time '16:00', 1, v_carla),
      (v_refugio,   'Feira de adoção',     'event',    'Feira de adoção na praça central.',                time '10:00', time '14:00', 5, v_rafael),
      (v_esperanca, 'Banho e escovação',   'care',     'Banho e escovação dos cães de pelo longo.',        time '12:00', time '13:00', 2, v_carla)
    ) as x(shelter, title, task, descr, s, e, cap, by)
   where not exists (
     select 1 from public.volunteer_shifts vs
      where vs.shelter_id = x.shelter and vs.title = x.title
        and vs.starts_at = (v_sat + x.s) at time zone 'America/Sao_Paulo'
   );
end $$;

-- Massa de testes da escala de voluntariado (seção 9.3 da proposta, Tabelas 11 e 12)
-- Uso: `supabase db reset` aplica as migrations e este seed no banco LOCAL.
-- NÃO rode em produção.
--
-- Todos os usuários usam a mesma senha de teste: adota123

-- ============ Usuários (Tabela 11) ============
do $$
declare
  u record;
begin
  for u in
    select * from (values
      ('11111111-1111-1111-1111-111111111111'::uuid, 'admin@esperanca.test'),
      ('22222222-2222-2222-2222-222222222222'::uuid, 'admin@refugio.test'),
      ('33333333-3333-3333-3333-333333333333'::uuid, 'voluntaria@adotapet.test'),
      ('44444444-4444-4444-4444-444444444444'::uuid, 'jorge@adotapet.test'),
      ('55555555-5555-5555-5555-555555555555'::uuid, 'lucas@adotapet.test'),
      ('66666666-6666-6666-6666-666666666666'::uuid, 'joao@adotapet.test')
    ) as t(id, email)
  loop
    insert into auth.users (
      instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
      raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
      confirmation_token, email_change, email_change_token_new, recovery_token
    ) values (
      '00000000-0000-0000-0000-000000000000', u.id, 'authenticated', 'authenticated', u.email,
      extensions.crypt('adota123', extensions.gen_salt('bf')), now(),
      '{"provider":"email","providers":["email"]}', '{}', now(), now(), '', '', '', ''
    );
    insert into auth.identities (
      id, user_id, provider_id, identity_data, provider, last_sign_in_at, created_at, updated_at
    ) values (
      gen_random_uuid(), u.id, u.id::text,
      jsonb_build_object('sub', u.id::text, 'email', u.email, 'email_verified', true),
      'email', now(), now(), now()
    );
  end loop;
end $$;

insert into public.profiles (id, full_name, cpf_hash, cpf_encrypted, birth_date, housing_type,
                             address_line, address_number, address_city, address_state, address_zip)
values
  ('11111111-1111-1111-1111-111111111111', 'Carla Ferreira', encode(extensions.digest('52998224725', 'sha256'), 'hex'), '529.982.247-25', '1985-03-10', 'house',     'Rua das Flores', '100', 'Porto Alegre',  'RS', '90010000'),
  ('22222222-2222-2222-2222-222222222222', 'Rafael Lima',    encode(extensions.digest('11144477735', 'sha256'), 'hex'), '111.444.777-35', '1990-07-22', 'apartment', 'Av. Unisinos',   '950', 'São Leopoldo',  'RS', '93022000'),
  ('33333333-3333-3333-3333-333333333333', 'Maria Silva',    encode(extensions.digest('39053344705', 'sha256'), 'hex'), '390.533.447-05', '2004-05-02', 'apartment', 'Rua Voluntários da Pátria', '12', 'Porto Alegre', 'RS', '90230010'),
  ('44444444-4444-4444-4444-444444444444', 'Jorge Menezes',  encode(extensions.digest('86288366757', 'sha256'), 'hex'), '862.883.667-57', '1962-01-15', 'house',     'Rua Padre Chagas', '45', 'Porto Alegre', 'RS', '90570080'),
  ('55555555-5555-5555-5555-555555555555', 'Lucas Pereira',  encode(extensions.digest('71428793860', 'sha256'), 'hex'), '714.287.938-60', '2001-11-30', 'apartment', 'Av. Ipiranga', '6681', 'Porto Alegre', 'RS', '90619900'),
  ('66666666-6666-6666-6666-666666666666', 'João Santos',    encode(extensions.digest('45317828791', 'sha256'), 'hex'), '453.178.287-91', '1998-09-09', 'house',     'Rua da Praia', '300', 'Porto Alegre', 'RS', '90010001');

-- ============ Abrigos ============
-- O trigger shelters_after_insert_trg torna created_by administrador do abrigo.
insert into public.shelters (id, name, slug, description, phone, email, address_line, address_city,
                             address_state, address_zip, created_by)
values
  ('aaaaaaaa-0000-0000-0000-000000000001', 'Abrigo Esperança', 'abrigo-esperanca',
   'Abrigo de cães e gatos em Porto Alegre.', '51999990001', 'contato@esperanca.test',
   'Rua Esperança, 500', 'Porto Alegre', 'RS', '90020000', '11111111-1111-1111-1111-111111111111'),
  ('aaaaaaaa-0000-0000-0000-000000000002', 'Refúgio Animal', 'refugio-animal',
   'Refúgio de animais resgatados em São Leopoldo.', '51999990002', 'contato@refugio.test',
   'Rua do Refúgio, 77', 'São Leopoldo', 'RS', '93010000', '22222222-2222-2222-2222-222222222222');

-- ============ Voluntários (aprovados) e candidatura pendente ============
insert into public.requests (id, kind, status, shelter_id, requester_id, message, decided_at) values
  ('bbbbbbbb-0000-0000-0000-000000000001', 'volunteer', 'pending', 'aaaaaaaa-0000-0000-0000-000000000002', '33333333-3333-3333-3333-333333333333', 'Quero ajudar no Refúgio.', null),
  ('bbbbbbbb-0000-0000-0000-000000000002', 'volunteer', 'pending', 'aaaaaaaa-0000-0000-0000-000000000001', '33333333-3333-3333-3333-333333333333', 'Também posso ajudar no Esperança.', null),
  ('bbbbbbbb-0000-0000-0000-000000000003', 'volunteer', 'pending', 'aaaaaaaa-0000-0000-0000-000000000001', '44444444-4444-4444-4444-444444444444', 'Passeio com os cachorros aos sábados.', null),
  ('bbbbbbbb-0000-0000-0000-000000000004', 'volunteer', 'pending', 'aaaaaaaa-0000-0000-0000-000000000001', '55555555-5555-5555-5555-555555555555', 'Disponível nos fins de semana.', null),
  ('bbbbbbbb-0000-0000-0000-000000000005', 'volunteer', 'pending', 'aaaaaaaa-0000-0000-0000-000000000001', '66666666-6666-6666-6666-666666666666', 'Gostaria de ser voluntário.', null);

-- A aprovação (trigger requests_on_status_change) cria o shelter_members(volunteer).
-- A candidatura do João fica pendente (CT03_03 e CTR_01).
update public.requests set status = 'accepted', decided_by = '11111111-1111-1111-1111-111111111111'
 where id in ('bbbbbbbb-0000-0000-0000-000000000002', 'bbbbbbbb-0000-0000-0000-000000000003',
              'bbbbbbbb-0000-0000-0000-000000000004');
update public.requests set status = 'accepted', decided_by = '22222222-2222-2222-2222-222222222222'
 where id = 'bbbbbbbb-0000-0000-0000-000000000001';

-- ============ Turnos (Tabela 12) — sábado 21/11/2026, horário de Brasília ============
insert into public.volunteer_shifts (id, shelter_id, title, task_type, description, starts_at, ends_at, capacity, created_by)
values
  ('cccccccc-0000-0000-0000-000000000001', 'aaaaaaaa-0000-0000-0000-000000000001', 'Passeio com os cães', 'walk',
   'Passeio com os cães no parque ao lado do abrigo.',
   '2026-11-21 09:00 America/Sao_Paulo', '2026-11-21 12:00 America/Sao_Paulo', 3, '11111111-1111-1111-1111-111111111111'),
  ('cccccccc-0000-0000-0000-000000000002', 'aaaaaaaa-0000-0000-0000-000000000001', 'Limpeza dos canis', 'cleaning',
   'Limpeza e troca das caminhas.',
   '2026-11-21 13:00 America/Sao_Paulo', '2026-11-21 16:00 America/Sao_Paulo', 1, '11111111-1111-1111-1111-111111111111'),
  ('cccccccc-0000-0000-0000-000000000003', 'aaaaaaaa-0000-0000-0000-000000000002', 'Feira de adoção', 'event',
   'Feira de adoção na praça central.',
   '2026-11-21 10:00 America/Sao_Paulo', '2026-11-21 14:00 America/Sao_Paulo', 5, '22222222-2222-2222-2222-222222222222'),
  ('cccccccc-0000-0000-0000-000000000004', 'aaaaaaaa-0000-0000-0000-000000000001', 'Banho e escovação', 'care',
   'Banho e escovação dos cães de pelo longo.',
   '2026-11-21 12:00 America/Sao_Paulo', '2026-11-21 13:00 America/Sao_Paulo', 2, '11111111-1111-1111-1111-111111111111');

-- UC09 Horas / UC10 Emitir certificado / UC11 Validar certificado
-- CT09_01, CT10_01, CT10_02, CT11_01, CT11_02 (RF36, RF37, RF38, RN12, RN16)
begin;
create extension if not exists pgtap with schema extensions;
select * from no_plan();

-- Três presenças da Maria no Esperança (cenário do CT10_01) e uma no Refúgio
create temp table t_base as
  select ((date_trunc('day', now() at time zone 'America/Sao_Paulo') - interval '10 days' + interval '9 hours')
          at time zone 'America/Sao_Paulo') as d;
grant select on t_base to authenticated;

insert into public.volunteer_shifts (id, shelter_id, title, task_type, starts_at, ends_at, capacity, created_by, status)
select x.id::uuid, x.shelter::uuid, x.title, 'walk', d + x.s, d + x.s + x.dur, 5, '11111111-1111-1111-1111-111111111111', 'completed'
  from t_base, (values
    ('c1000000-0000-0000-0000-000000000001', 'aaaaaaaa-0000-0000-0000-000000000001', 'Turno 3h A', interval '0',      interval '3 hours'),
    ('c1000000-0000-0000-0000-000000000002', 'aaaaaaaa-0000-0000-0000-000000000001', 'Turno 3h B', interval '1 day',  interval '3 hours'),
    ('c1000000-0000-0000-0000-000000000003', 'aaaaaaaa-0000-0000-0000-000000000001', 'Turno 4h',   interval '2 days', interval '4 hours'),
    ('c1000000-0000-0000-0000-000000000004', 'aaaaaaaa-0000-0000-0000-000000000002', 'Feira',      interval '3 days', interval '2 hours'),
    ('c1000000-0000-0000-0000-000000000005', 'aaaaaaaa-0000-0000-0000-000000000001', 'Falta',      interval '4 days', interval '2 hours')
  ) as x(id, shelter, title, s, dur);

insert into public.shift_enrollments (shift_id, user_id, status, checked_in_at, checked_out_at, worked_minutes)
select s.id, '33333333-3333-3333-3333-333333333333', x.st::enrollment_status, s.starts_at + x.cin, s.starts_at + x.cout,
       public.compute_worked_minutes(x.st::enrollment_status, s.starts_at + x.cin, s.starts_at + x.cout, s.starts_at, s.ends_at)
  from public.volunteer_shifts s
  join (values
    ('c1000000-0000-0000-0000-000000000001'::uuid, 'attended', interval '2 minutes', interval '2 hours 50 minutes'), -- 9h02–11h50
    ('c1000000-0000-0000-0000-000000000002'::uuid, 'attended', null, null),                                         -- sem horários
    ('c1000000-0000-0000-0000-000000000003'::uuid, 'attended', interval '55 minutes', interval '6 hours 40 minutes'), -- 9h55–15h40
    ('c1000000-0000-0000-0000-000000000004'::uuid, 'attended', null, null),
    ('c1000000-0000-0000-0000-000000000005'::uuid, 'absent', null, null)
  ) as x(id, st, cin, cout) on x.id = s.id;

select set_config('request.jwt.claims', '{"sub":"33333333-3333-3333-3333-333333333333","role":"authenticated"}', true);
set local role authenticated;

-- CT09_01: horas por abrigo, com filtro de período
select results_eq($$ select shelter_name, total_minutes::int, shifts_count::int from public.volunteer_hours_summary() $$,
  $$ values ('Abrigo Esperança', 645, 3), ('Refúgio Animal', 120, 1) $$,
  'CT09_01 total por abrigo (10h45 no Esperança)');
select is((select count(*)::int from public.volunteer_hours_summary(
            (select (d at time zone 'America/Sao_Paulo')::date + 3 from t_base), null)), 1,
  'CT09_01 filtro de período reduz o resultado');
select is((select count(*)::int from public.shift_enrollments where status = 'attended'), 4, 'CT09_01 histórico de turnos realizados');

-- CT10_01: emissão do certificado
create temp table t_cert as
  select * from public.issue_certificate('aaaaaaaa-0000-0000-0000-000000000001',
    (select (d at time zone 'America/Sao_Paulo')::date - 5 from t_base), (now() at time zone 'America/Sao_Paulo')::date);
select results_eq($$ select total_minutes, shifts_count, volunteer_name, cpf_masked, shelter_name from t_cert $$,
  $$ values (645, 3, 'Maria Silva', '***.533.447-**', 'Abrigo Esperança') $$,
  'CT10_01 certificado com 10h45, nome, CPF mascarado e abrigo');
select matches((select code::text from t_cert), '^[A-Z0-9]{10}$', 'RN16 código único de 10 caracteres');

-- CT10_02: período sem presenças
select throws_ok($$ select public.issue_certificate('aaaaaaaa-0000-0000-0000-000000000001', '2020-01-01', '2020-01-31') $$,
  'P0001', 'Não há horas registradas neste abrigo no período escolhido.', 'CT10_02 certificado não gerado');
select throws_ok($$ select public.issue_certificate('aaaaaaaa-0000-0000-0000-000000000001', '2026-02-01', '2026-01-01') $$,
  'P0001', 'Informe um período válido.', 'Período invertido recusado');

-- arquivo só pode ser anexado na pasta do próprio usuário
select throws_ok($$ select public.attach_certificate_file((select id from t_cert), 'outra-pessoa/x.pdf') $$,
  'P0001', 'Certificado não encontrado.', 'RNF16 caminho fora da pasta do usuário recusado');
select lives_ok($$ select public.attach_certificate_file((select id from t_cert),
  '33333333-3333-3333-3333-333333333333/' || (select code from t_cert) || '.pdf') $$, 'RNF16 caminho do PDF registrado');
reset role;

-- Outra pessoa não vê o certificado da Maria
select set_config('request.jwt.claims', '{"sub":"44444444-4444-4444-4444-444444444444","role":"authenticated"}', true);
set local role authenticated;
select is((select count(*)::int from public.volunteer_certificates), 0, 'RNF09 Jorge não vê certificados da Maria');
reset role;

-- CT11_01 / CT11_02: validação pública (visitante)
grant select on t_cert to anon;
set local role anon;
select results_eq($$ select volunteer_name, shelter_name, total_minutes, cpf_masked
                     from public.verify_certificate((select lower(code::text) from t_cert)) $$,
  $$ values ('Maria Silva', 'Abrigo Esperança', 645, '***.533.447-**') $$,
  'CT11_01 página pública mostra nome, abrigo, período e horas');
select hasnt_column('public', 'verify_certificate', 'file_path', 'CT11_01 sem acesso ao arquivo');
select throws_ok($$ select * from public.volunteer_certificates $$, '42501', null, 'CT11_01 visitante não lê a tabela');
select is((select count(*)::int from public.verify_certificate('ZZZZZZZZZZ')), 0, 'CT11_02 código inexistente não encontrado');
reset role;

select is(public.mask_cpf('390.533.447-05'), '***.533.447-**', 'RN16 máscara do CPF');
select is(public.mask_cpf(null), null, 'RN16 sem CPF');

select * from finish();
rollback;

-- UC12 Lembretes / UC14 Indicadores / Regressão
-- CT12_01, CT12_02, CT14_01, CTR_01, CTR_02 (RF39, RF41, RNF12)
begin;
create extension if not exists pgtap with schema extensions;
select * from no_plan();

-- ===== CT12_01 / CT12_02 =====
insert into public.volunteer_shifts (id, shelter_id, title, task_type, starts_at, ends_at, capacity, created_by) values
  ('d1000000-0000-0000-0000-000000000001', 'aaaaaaaa-0000-0000-0000-000000000001', 'Em 23h50', 'walk',
   now() + interval '23 hours 50 minutes', now() + interval '25 hours 50 minutes', 3, '11111111-1111-1111-1111-111111111111'),
  ('d1000000-0000-0000-0000-000000000002', 'aaaaaaaa-0000-0000-0000-000000000001', 'Em 24h10', 'walk',
   now() + interval '24 hours 10 minutes', now() + interval '26 hours 10 minutes', 3, '11111111-1111-1111-1111-111111111111');
insert into public.shift_enrollments (shift_id, user_id, status, cancelled_at) values
  ('d1000000-0000-0000-0000-000000000001', '44444444-4444-4444-4444-444444444444', 'confirmed', null),
  ('d1000000-0000-0000-0000-000000000001', '55555555-5555-5555-5555-555555555555', 'cancelled', now()),
  ('d1000000-0000-0000-0000-000000000002', '33333333-3333-3333-3333-333333333333', 'confirmed', null);

select ok(public.send_shift_reminders() >= 1, 'CT12_01 rotina enviou lembretes');
select is((select count(*)::int from public.notifications where kind = 'shift.reminder'
            and user_id = '44444444-4444-4444-4444-444444444444'), 1, 'CT12_01 lembrete no sino do Jorge');
select ok((select reminder_sent_at is not null from public.shift_enrollments
            where shift_id = 'd1000000-0000-0000-0000-000000000001' and user_id = '44444444-4444-4444-4444-444444444444'),
  'RNF12 reminder_sent_at preenchido');
select is((select count(*)::int from public.notifications where kind = 'shift.reminder'
            and user_id = '33333333-3333-3333-3333-333333333333'), 0, 'CT12_01 turno a mais de 24h ainda não recebe lembrete');
select lives_ok($$ select public.send_shift_reminders() $$, 'CT12_01 nova execução da rotina');
select is((select count(*)::int from public.notifications where kind = 'shift.reminder'
            and user_id = '44444444-4444-4444-4444-444444444444'), 1, 'CT12_01 nenhum lembrete repetido');
select is((select count(*)::int from public.notifications where kind = 'shift.reminder'
            and user_id = '55555555-5555-5555-5555-555555555555'), 0, 'CT12_02 inscrição cancelada não recebe lembrete');

-- rotinas agendadas no pg_cron
select is((select count(*)::int from cron.job where jobname in ('volunteer-shift-reminders', 'volunteer-complete-shifts')), 2,
  'RNF12 rotinas registradas no pg_cron');
select is((select schedule from cron.job where jobname = 'volunteer-shift-reminders'), '*/15 * * * *',
  'RNF12 lembretes a cada 15 minutos');

-- rotina de conclusão
insert into public.volunteer_shifts (id, shelter_id, title, task_type, starts_at, ends_at, capacity, created_by) values
  ('d1000000-0000-0000-0000-000000000003', 'aaaaaaaa-0000-0000-0000-000000000001', 'Encerrado', 'walk',
   now() - interval '3 hours', now() - interval '1 hour', 3, '11111111-1111-1111-1111-111111111111');
select ok(public.complete_finished_shifts() >= 1, 'Turnos encerrados marcados como concluídos');
select is((select status::text from public.volunteer_shifts where id = 'd1000000-0000-0000-0000-000000000003'), 'completed',
  'Turno encerrado ficou completed');

-- ===== CT14_01: indicadores com massa conhecida (abrigo isolado) =====
insert into public.shelters (id, name, slug, phone, address_line, address_city, address_state, address_zip, created_by)
values ('aaaaaaaa-0000-0000-0000-000000000099', 'Abrigo Indicadores', 'abrigo-indicadores', '51900000000',
        'Rua X', 'Porto Alegre', 'RS', '90000000', '11111111-1111-1111-1111-111111111111');
insert into auth.users (id, email) values ('77777777-7777-7777-7777-777777777777', 'extra@adotapet.test');
insert into public.volunteer_shifts (id, shelter_id, title, task_type, starts_at, ends_at, capacity, created_by, status) values
  ('d2000000-0000-0000-0000-000000000001', 'aaaaaaaa-0000-0000-0000-000000000099', 'Turno A', 'walk', now() + interval '1 day',  now() + interval '1 day 2 hours', 4, '11111111-1111-1111-1111-111111111111', 'scheduled'),
  ('d2000000-0000-0000-0000-000000000002', 'aaaaaaaa-0000-0000-0000-000000000099', 'Turno B', 'walk', now() + interval '2 days', now() + interval '2 days 2 hours', 4, '11111111-1111-1111-1111-111111111111', 'scheduled'),
  ('d2000000-0000-0000-0000-000000000003', 'aaaaaaaa-0000-0000-0000-000000000099', 'Sem inscritos', 'care', now() + interval '6 days', now() + interval '6 days 2 hours', 2, '11111111-1111-1111-1111-111111111111', 'scheduled'),
  ('d2000000-0000-0000-0000-000000000004', 'aaaaaaaa-0000-0000-0000-000000000099', 'Passado', 'walk', now() - interval '3 days', now() - interval '3 days' + interval '2 hours', 4, '11111111-1111-1111-1111-111111111111', 'completed'),
  ('d2000000-0000-0000-0000-000000000005', 'aaaaaaaa-0000-0000-0000-000000000099', 'Daqui 8 dias', 'walk', now() + interval '8 days', now() + interval '8 days 2 hours', 5, '11111111-1111-1111-1111-111111111111', 'scheduled');
insert into public.shift_enrollments (shift_id, user_id, status) values
  ('d2000000-0000-0000-0000-000000000001', '22222222-2222-2222-2222-222222222222', 'confirmed'),
  ('d2000000-0000-0000-0000-000000000001', '33333333-3333-3333-3333-333333333333', 'confirmed'),
  ('d2000000-0000-0000-0000-000000000001', '44444444-4444-4444-4444-444444444444', 'confirmed'),
  ('d2000000-0000-0000-0000-000000000001', '55555555-5555-5555-5555-555555555555', 'confirmed'),
  ('d2000000-0000-0000-0000-000000000002', '66666666-6666-6666-6666-666666666666', 'confirmed'),
  ('d2000000-0000-0000-0000-000000000002', '77777777-7777-7777-7777-777777777777', 'confirmed'),
  ('d2000000-0000-0000-0000-000000000002', '33333333-3333-3333-3333-333333333333', 'confirmed'),
  ('d2000000-0000-0000-0000-000000000004', '33333333-3333-3333-3333-333333333333', 'attended'),
  ('d2000000-0000-0000-0000-000000000004', '44444444-4444-4444-4444-444444444444', 'attended'),
  ('d2000000-0000-0000-0000-000000000004', '55555555-5555-5555-5555-555555555555', 'attended'),
  ('d2000000-0000-0000-0000-000000000004', '66666666-6666-6666-6666-666666666666', 'absent');
select public._vs_refresh_shift(id) from public.volunteer_shifts where shelter_id = 'aaaaaaaa-0000-0000-0000-000000000099';

select set_config('request.jwt.claims', '{"sub":"11111111-1111-1111-1111-111111111111","role":"authenticated"}', true);
set local role authenticated;
create temp table t_ind as select public.shelter_schedule_indicators('aaaaaaaa-0000-0000-0000-000000000099') as j;
select is((select (j->>'occupancy_rate')::int from t_ind), 70, 'CT14_01 10 vagas e 7 confirmados → ocupação 70%');
select is((select (j->>'attendance_rate')::int from t_ind), 75, 'CT14_01 3 presenças em 4 inscrições → presença 75%');
select is((select j->'uncovered_shifts'->0->>'title' from t_ind), 'Sem inscritos', 'CT14_01 turno sem inscritos listado');
select is((select jsonb_array_length(j->'uncovered_shifts') from t_ind), 1, 'CT14_01 apenas turnos dos próximos 7 dias');
reset role;

select set_config('request.jwt.claims', '{"sub":"44444444-4444-4444-4444-444444444444","role":"authenticated"}', true);
set local role authenticated;
select throws_ok($$ select public.shelter_schedule_indicators('aaaaaaaa-0000-0000-0000-000000000001') $$, 'P0001',
  'Apenas a coordenação do abrigo pode ver os indicadores.', 'RNF09 voluntário não vê indicadores');
reset role;

-- ===== CTR_01: aprovação da candidatura libera a agenda =====
select set_config('request.jwt.claims', '{"sub":"66666666-6666-6666-6666-666666666666","role":"authenticated"}', true);
set local role authenticated;
select is((select count(*)::int from public.volunteer_shifts where shelter_id = 'aaaaaaaa-0000-0000-0000-000000000001'), 0,
  'CTR_01 antes da aprovação João não vê turnos');
reset role;
select set_config('request.jwt.claims', '{"sub":"11111111-1111-1111-1111-111111111111","role":"authenticated"}', true);
set local role authenticated;
update public.requests set status = 'accepted', decided_by = auth.uid() where id = 'bbbbbbbb-0000-0000-0000-000000000005';
reset role;
select ok(public.is_member('aaaaaaaa-0000-0000-0000-000000000001', '66666666-6666-6666-6666-666666666666', array['volunteer']::shelter_role[]),
  'CTR_01 João passou a ser voluntário');
select set_config('request.jwt.claims', '{"sub":"66666666-6666-6666-6666-666666666666","role":"authenticated"}', true);
set local role authenticated;
select ok((select count(*)::int from public.volunteer_shifts where shelter_id = 'aaaaaaaa-0000-0000-0000-000000000001') > 0,
  'CTR_01 João vê os turnos do Abrigo Esperança');
reset role;

-- ===== CTR_02: adoção e doação continuam funcionando =====
insert into public.animals (id, shelter_id, name, species, size, estimated_age_months)
values ('e1000000-0000-0000-0000-000000000001', 'aaaaaaaa-0000-0000-0000-000000000001', 'Rex', 'dog', 'medium', 24);
insert into public.supply_needs (id, shelter_id, title, quantity_target)
values ('e1000000-0000-0000-0000-000000000002', 'aaaaaaaa-0000-0000-0000-000000000001', 'Ração', 10);

select set_config('request.jwt.claims', '{"sub":"44444444-4444-4444-4444-444444444444","role":"authenticated"}', true);
set local role authenticated;
select lives_ok($$ insert into public.requests (id, kind, shelter_id, requester_id, animal_id)
  values ('e2000000-0000-0000-0000-000000000001', 'adoption', 'aaaaaaaa-0000-0000-0000-000000000001', auth.uid(), 'e1000000-0000-0000-0000-000000000001') $$,
  'CTR_02 candidatura de adoção criada');
select lives_ok($$ insert into public.requests (id, kind, shelter_id, requester_id, supply_need_id, quantity_offered)
  values ('e2000000-0000-0000-0000-000000000002', 'supply', 'aaaaaaaa-0000-0000-0000-000000000001', auth.uid(), 'e1000000-0000-0000-0000-000000000002', 5) $$,
  'CTR_02 doação de suprimentos criada');
reset role;
select set_config('request.jwt.claims', '{"sub":"11111111-1111-1111-1111-111111111111","role":"authenticated"}', true);
set local role authenticated;
update public.requests set status = 'accepted', decided_by = auth.uid()
 where id in ('e2000000-0000-0000-0000-000000000001', 'e2000000-0000-0000-0000-000000000002');
reset role;
select is((select count(*)::int from public.conversations
            where request_id in ('e2000000-0000-0000-0000-000000000001', 'e2000000-0000-0000-0000-000000000002')), 2,
  'CTR_02 aprovadas normalmente, com conversa aberta no chat');

select * from finish();
rollback;

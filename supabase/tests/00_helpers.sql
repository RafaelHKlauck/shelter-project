-- Verifica que a massa de testes (seed.sql) está carregada.
-- Convenções usadas em todos os arquivos de teste:
--   Carla  11111111-...  admin do Abrigo Esperança (aaaaaaaa-...-01)
--   Rafael 22222222-...  admin do Refúgio Animal  (aaaaaaaa-...-02)
--   Maria  33333333-...  voluntária nos dois abrigos
--   Jorge  44444444-...  voluntário no Esperança
--   Lucas  55555555-...  voluntário no Esperança
--   João   66666666-...  candidatura pendente no Esperança
-- Para agir como um usuário:  select set_config('request.jwt.claims', '{"sub":"<uuid>","role":"authenticated"}', true); set local role authenticated;
-- Para voltar a ser postgres: reset role;
begin;
create extension if not exists pgtap with schema extensions;
select plan(6);

select is((select count(*)::int from auth.users where email like '%.test'), 6, 'seed: 6 usuários de teste');
select is((select count(*)::int from public.shelters), 2, 'seed: 2 abrigos');
select ok(public.is_member('aaaaaaaa-0000-0000-0000-000000000001', '44444444-4444-4444-4444-444444444444', array['volunteer']::shelter_role[]), 'seed: Jorge é voluntário do Esperança');
select ok(public.is_member('aaaaaaaa-0000-0000-0000-000000000002', '33333333-3333-3333-3333-333333333333', array['volunteer']::shelter_role[]), 'seed: Maria é voluntária do Refúgio');
select ok(not public.is_member('aaaaaaaa-0000-0000-0000-000000000001', '66666666-6666-6666-6666-666666666666', array['admin','editor','volunteer']::shelter_role[]), 'seed: João ainda não é membro');
select is((select count(*)::int from public.volunteer_shifts), 4, 'seed: turnos T1–T4');

select * from finish();
rollback;

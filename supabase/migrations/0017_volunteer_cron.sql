-- Escala de voluntariado — rotinas agendadas com pg_cron (RF39, RNF12)

create extension if not exists pg_cron;

-- Lembretes a cada 15 minutos (cron.schedule com nome é idempotente)
select cron.schedule(
  'volunteer-shift-reminders',
  '*/15 * * * *',
  $$ select public.send_shift_reminders(); $$
);

-- Conclusão dos turnos encerrados, de hora em hora
select cron.schedule(
  'volunteer-complete-shifts',
  '5 * * * *',
  $$ select public.complete_finished_shifts(); $$
);

-- Realtime: publica tabelas que alimentam UI em tempo real
alter publication supabase_realtime add table public.messages;
alter publication supabase_realtime add table public.requests;
alter publication supabase_realtime add table public.notifications;
alter publication supabase_realtime add table public.conversations;

-- Necessário para UPDATE/DELETE events refletirem corretamente
alter table public.messages       replica identity full;
alter table public.requests       replica identity full;
alter table public.notifications  replica identity full;
alter table public.conversations  replica identity full;

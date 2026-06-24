-- shelters.location passa a ser opcional para não bloquear o cadastro
-- quando o geocoding externo falha. Quem precisar pode atualizar depois.
alter table public.shelters alter column location drop not null;

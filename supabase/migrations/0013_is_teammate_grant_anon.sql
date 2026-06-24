-- is_teammate é chamada dentro de uma RLS policy de profiles. Quando
-- animals_feed/shelters_feed rodam para usuários anônimos, o engine RLS
-- precisa conseguir invocar a função — caso contrário a query inteira falha
-- com "permission denied for function is_teammate".
--
-- A função é SECURITY DEFINER e retorna apenas boolean (não vaza dados),
-- então é seguro permitir execução pelo role anon também.
grant execute on function public.is_teammate(uuid, uuid) to anon;

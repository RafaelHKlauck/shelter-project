-- Resumo dos usuários de teste e vínculos (complemento de seed_prod_escala.sql)
select u.email, p.full_name,
       coalesce(string_agg(s.name || ' (' || m.role || ')', ', ' order by s.name), '—') as vinculos
  from auth.users u
  join public.profiles p on p.id = u.id
  left join public.shelter_members m on m.user_id = u.id
  left join public.shelters s on s.id = m.shelter_id
 where u.email like '%.test'
 group by u.email, p.full_name
 order by u.email

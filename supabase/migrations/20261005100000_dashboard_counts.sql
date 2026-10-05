-- Chiffres du tableau de bord admin : réservations à venir (hors annulées),
-- créneaux ouverts sur 30 jours, abonnés newsletter confirmés.
create or replace function public.dashboard_counts(p_today date)
returns table (upcoming_reservations integer, open_sessions_30d integer, newsletter_confirmed integer)
language sql stable security definer set search_path = public as $$
  select
    (select count(*)::int from reservations r
       left join session_instances s on s.id = r.session_instance_id
       left join events e on e.id = r.event_id
      where r.status in ('pending', 'confirmed')
        and coalesce(s.session_date, (e.starts_at at time zone 'Europe/Paris')::date) >= p_today),
    (select count(*)::int from session_instances
      where status = 'open' and session_date between p_today and p_today + 29),
    (select count(*)::int from newsletter_subscribers where status = 'confirmed');
$$;
revoke execute on function public.dashboard_counts(date) from public, anon, authenticated;
grant execute on function public.dashboard_counts(date) to service_role;

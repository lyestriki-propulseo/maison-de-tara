-- Privatisation de la salle par un événement (demande Tara 28/09 : « lui laisser le choix »).
-- Un événement peut, au choix, privatiser la salle : une fois publié, les créneaux d'atelier libre
-- qui chevauchent [starts_at, ends_at] sont bloqués. Chaque créneau bloqué garde la trace de
-- l'événement responsable (blocked_by_event_id) : dépublier, décocher ou supprimer l'événement
-- rouvre exactement ces créneaux-là, sans toucher à ceux que Tara a bloqués à la main.

alter table public.events
  add column privatise boolean not null default false;

alter table public.session_instances
  add column blocked_by_event_id uuid references public.events (id) on delete set null;

create index session_instances_blocked_by_event_idx
  on public.session_instances (blocked_by_event_id);

-- Resynchronise les blocages d'un événement. p_release_only = true : rouvre seulement (avant une
-- suppression). Renvoie le nombre de créneaux bloqués, rouverts, et les réservations (en attente
-- ou confirmées) déjà présentes sur les créneaux bloqués — à gérer par Tara.
create or replace function public.sync_event_privatisation(
  p_event_id uuid,
  p_release_only boolean default false
)
returns table (blocked integer, reopened integer, reserved_conflicts integer)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_event public.events%rowtype;
  v_end timestamptz;
begin
  blocked := 0;
  reserved_conflicts := 0;

  update public.session_instances
     set status = 'open', note = null, blocked_by_event_id = null
   where blocked_by_event_id = p_event_id;
  get diagnostics reopened = row_count;

  if not p_release_only then
    select * into v_event from public.events where id = p_event_id;
    if found and v_event.published and v_event.privatise then
      -- Sans heure de fin, on privatise 2 h (durée standard d'une session).
      v_end := coalesce(v_event.ends_at, v_event.starts_at + interval '2 hours');

      update public.session_instances si
         set status = 'blocked',
             note = 'Privatisé : ' || v_event.title,
             blocked_by_event_id = p_event_id
       where si.status = 'open'
         and si.session_date >= (v_event.starts_at at time zone 'Europe/Paris')::date - 1
         and si.session_date <= (v_end at time zone 'Europe/Paris')::date
         and ((si.session_date + si.start_time) at time zone 'Europe/Paris') < v_end
         and ((si.session_date + si.start_time + make_interval(mins => si.duration_minutes))
               at time zone 'Europe/Paris') > v_event.starts_at;
      get diagnostics blocked = row_count;

      select count(*)::integer into reserved_conflicts
        from public.reservations r
        join public.session_instances si on si.id = r.session_instance_id
       where si.blocked_by_event_id = p_event_id
         and r.status in ('pending', 'confirmed');
    end if;
  end if;

  return next;
end;
$$;

-- SECURITY DEFINER : exécutable par défaut par anon/authenticated. On ferme tout, seul le serveur
-- de l'admin (service_role) l'appelle. `revoke from public` ne suffit pas : révoquer chaque rôle.
revoke all on function public.sync_event_privatisation(uuid, boolean) from public;
revoke all on function public.sync_event_privatisation(uuid, boolean) from anon;
revoke all on function public.sync_event_privatisation(uuid, boolean) from authenticated;
grant execute on function public.sync_event_privatisation(uuid, boolean) to service_role;

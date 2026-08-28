-- Seed — données de départ Maison de Tara
-- À appliquer APRÈS les migrations. Valeurs à valider/ajuster avec Tara.

-- Infos pratiques (source : PROMPT-MASTER-MDT.md — téléphone/adresse à confirmer)
insert into public.site_settings (key, value) values
  ('hours', '{
    "lundi":    {"closed": true},
    "mardi":    {"open": "10:00", "close": "19:00"},
    "mercredi": {"open": "10:00", "close": "19:00"},
    "jeudi":    {"open": "10:00", "close": "19:00"},
    "vendredi": {"open": "10:00", "close": "19:00"},
    "samedi":   {"open": "10:00", "close": "20:00"},
    "dimanche": {"open": "11:00", "close": "18:00"}
  }'::jsonb),
  ('contact', '{
    "phone": "",
    "address": "À confirmer",
    "city": "La Garenne-Colombes",
    "postal_code": "92250"
  }'::jsonb),
  ('socials', '{
    "instagram": "",
    "facebook": ""
  }'::jsonb)
on conflict (key) do nothing;

-- Exemple de grille hebdo d'atelier — À VALIDER AVEC TARA (horaires + capacité réels inconnus).
-- Décommenter et ajuster une fois les créneaux confirmés (weekday : 0=dimanche ... 6=samedi).
-- insert into public.session_templates (weekday, start_time, capacity) values
--   (2, '10:00', 12), (2, '14:00', 12), (2, '17:00', 12),  -- mardi
--   (3, '10:00', 12), (3, '14:00', 12), (3, '17:00', 12),  -- mercredi
--   (4, '10:00', 12), (4, '14:00', 12), (4, '17:00', 12),  -- jeudi
--   (5, '10:00', 12), (5, '14:00', 12), (5, '17:00', 12),  -- vendredi
--   (6, '10:00', 16), (6, '14:00', 16), (6, '17:00', 16),  -- samedi
--   (0, '11:00', 12), (0, '14:00', 12);                    -- dimanche

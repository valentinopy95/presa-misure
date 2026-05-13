-- Slot aggiuntivi acquistati (€3/mese ciascuno)
ALTER TABLE companies
  ADD COLUMN IF NOT EXISTS extra_series_slots INT NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS extra_user_slots   INT NOT NULL DEFAULT 0;

COMMENT ON COLUMN companies.extra_series_slots IS 'Slot serie catalogo aggiuntivi acquistati';
COMMENT ON COLUMN companies.extra_user_slots   IS 'Slot utenti aggiuntivi acquistati';

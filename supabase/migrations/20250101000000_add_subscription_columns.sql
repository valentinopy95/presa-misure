-- Aggiungi colonne abbonamento alla tabella companies
ALTER TABLE companies
  ADD COLUMN IF NOT EXISTS plan                  TEXT        NOT NULL DEFAULT 'free',
  ADD COLUMN IF NOT EXISTS subscription_status   TEXT        NOT NULL DEFAULT 'free',
  ADD COLUMN IF NOT EXISTS stripe_customer_id    TEXT,
  ADD COLUMN IF NOT EXISTS stripe_subscription_id TEXT,
  ADD COLUMN IF NOT EXISTS current_period_end    TIMESTAMPTZ;

-- Commento colonne
COMMENT ON COLUMN companies.plan                   IS 'free | base | pro';
COMMENT ON COLUMN companies.subscription_status    IS 'free | active | past_due | canceled';
COMMENT ON COLUMN companies.stripe_customer_id     IS 'ID customer su Stripe';
COMMENT ON COLUMN companies.stripe_subscription_id IS 'ID subscription su Stripe';
COMMENT ON COLUMN companies.current_period_end     IS 'Data fine periodo corrente abbonamento';

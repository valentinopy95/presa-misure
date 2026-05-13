-- ── Magazzino (avanzi profili, per azienda) ──────────────────────────────────
CREATE TABLE IF NOT EXISTS magazzino (
  company_id  UUID PRIMARY KEY REFERENCES companies(id) ON DELETE CASCADE,
  items       JSONB NOT NULL DEFAULT '[]',
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE magazzino ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Company members can manage magazzino" ON magazzino
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
        AND profiles.company_id = magazzino.company_id
    )
  );

-- ── Project status (ordinato + taglio completo, per azienda + progetto) ───────
CREATE TABLE IF NOT EXISTS project_status (
  company_id       UUID  NOT NULL,
  project_id       TEXT  NOT NULL,
  ordered_date     TEXT,
  cutting_complete BOOLEAN NOT NULL DEFAULT false,
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (company_id, project_id)
);

ALTER TABLE project_status ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Company members can manage project_status" ON project_status
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
        AND profiles.company_id = project_status.company_id
    )
  );

-- ── Cutting progress (pezzi spuntati, per utente + progetto) ─────────────────
CREATE TABLE IF NOT EXISTS cutting_progress (
  user_id      UUID  NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  project_id   TEXT  NOT NULL,
  checked_keys JSONB NOT NULL DEFAULT '[]',
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, project_id)
);

ALTER TABLE cutting_progress ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users own their cutting progress" ON cutting_progress
  FOR ALL USING (auth.uid() = user_id);

-- ── Company settings (tutte le impostazioni come JSONB per azienda) ───────────
CREATE TABLE IF NOT EXISTS company_settings (
  company_id UUID PRIMARY KEY REFERENCES companies(id) ON DELETE CASCADE,
  settings   JSONB NOT NULL DEFAULT '{}',
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE company_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Company members can manage company_settings" ON company_settings
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
        AND profiles.company_id = company_settings.company_id
    )
  );

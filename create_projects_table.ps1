$token = "sbp_e98b666ad0f5ea6ff8a1666def007695bba23246"
$ref   = "vhsfdvkuzqqlmpuucfbt"

$sql = @"
CREATE TABLE IF NOT EXISTS projects (
  id           uuid PRIMARY KEY,
  company_id   uuid NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  user_id      uuid NOT NULL REFERENCES auth.users(id),
  name         text NOT NULL DEFAULT '',
  client_name  text NOT NULL DEFAULT '',
  client_phone text NOT NULL DEFAULT '',
  address      text NOT NULL DEFAULT '',
  gps          jsonb,
  openings     jsonb NOT NULL DEFAULT '[]'::jsonb,
  created_at   timestamptz NOT NULL DEFAULT now(),
  updated_at   timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE projects ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "company_read"   ON projects;
DROP POLICY IF EXISTS "company_insert" ON projects;
DROP POLICY IF EXISTS "company_update" ON projects;
DROP POLICY IF EXISTS "company_delete" ON projects;

CREATE POLICY "company_read" ON projects FOR SELECT
  USING (company_id = (SELECT company_id FROM profiles WHERE id = auth.uid()));

CREATE POLICY "company_insert" ON projects FOR INSERT
  WITH CHECK (
    company_id = (SELECT company_id FROM profiles WHERE id = auth.uid())
    AND user_id = auth.uid()
  );

CREATE POLICY "company_update" ON projects FOR UPDATE
  USING (company_id = (SELECT company_id FROM profiles WHERE id = auth.uid()));

CREATE POLICY "company_delete" ON projects FOR DELETE
  USING (company_id = (SELECT company_id FROM profiles WHERE id = auth.uid()));
"@

$body = ConvertTo-Json @{ query = $sql }

$r = Invoke-WebRequest `
    -Uri "https://api.supabase.com/v1/projects/$ref/database/query" `
    -Method Post `
    -Headers @{ "Authorization" = "Bearer $token"; "Content-Type" = "application/json" } `
    -Body $body `
    -UseBasicParsing

Write-Host "Status: $($r.StatusCode)" -ForegroundColor Cyan
Write-Host $r.Content

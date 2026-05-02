$token = "sbp_e98b666ad0f5ea6ff8a1666def007695bba23246"
$ref   = "vhsfdvkuzqqlmpuucfbt"

$sql = @"
CREATE TABLE IF NOT EXISTS company_invites (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id     uuid NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  invited_by     uuid NOT NULL REFERENCES auth.users(id),
  invited_email  text NOT NULL,
  created_at     timestamptz NOT NULL DEFAULT now(),
  UNIQUE(company_id, invited_email)
);

ALTER TABLE company_invites ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "members_can_invite"      ON company_invites;
DROP POLICY IF EXISTS "members_can_read"        ON company_invites;
DROP POLICY IF EXISTS "invited_can_read"        ON company_invites;
DROP POLICY IF EXISTS "invited_can_delete"      ON company_invites;
DROP POLICY IF EXISTS "members_can_delete"      ON company_invites;

-- I membri dell'azienda possono inserire inviti
CREATE POLICY "members_can_invite" ON company_invites FOR INSERT
  WITH CHECK (company_id = (SELECT company_id FROM profiles WHERE id = auth.uid()));

-- I membri dell'azienda vedono gli inviti pendenti
CREATE POLICY "members_can_read" ON company_invites FOR SELECT
  USING (company_id = (SELECT company_id FROM profiles WHERE id = auth.uid()));

-- L'utente invitato può leggere il proprio invito tramite email nel JWT
CREATE POLICY "invited_can_read" ON company_invites FOR SELECT
  USING (invited_email = (auth.jwt() ->> 'email'));

-- L'utente invitato può cancellare il proprio invito (dopo accettazione)
CREATE POLICY "invited_can_delete" ON company_invites FOR DELETE
  USING (invited_email = (auth.jwt() ->> 'email'));

-- I membri possono revocare inviti della propria azienda
CREATE POLICY "members_can_delete" ON company_invites FOR DELETE
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

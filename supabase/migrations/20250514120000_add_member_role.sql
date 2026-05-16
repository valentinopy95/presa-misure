-- Aggiunge colonna role a profiles per gestione permessi membri
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS role TEXT NOT NULL DEFAULT 'member'
  CHECK (role IN ('owner', 'admin', 'member'));

-- Chi ha creato l'azienda (owner_id) diventa owner
UPDATE profiles p
SET role = 'owner'
FROM companies c
WHERE p.company_id = c.id AND p.id = c.owner_id;

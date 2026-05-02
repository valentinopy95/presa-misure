$token = "sbp_e98b666ad0f5ea6ff8a1666def007695bba23246"
$ref   = "vhsfdvkuzqqlmpuucfbt"

$body = @"
{
  "mailer_subjects_confirmation": "Conferma il tuo account MeasureMate",
  "mailer_subjects_recovery": "Reimposta la password MeasureMate",
  "mailer_subjects_invite": "Sei stato invitato su MeasureMate",
  "mailer_templates_confirmation_content": "<h2 style='font-family:sans-serif;color:#0c2d75'>Conferma il tuo account</h2><p style='font-family:sans-serif'>Clicca sul link per attivare il tuo account MeasureMate:</p><p><a href='{{ .ConfirmationURL }}' style='background:#0c2d75;color:white;padding:12px 24px;border-radius:8px;text-decoration:none;font-family:sans-serif;font-weight:bold'>Attiva account</a></p>",
  "mailer_templates_recovery_content": "<h2 style='font-family:sans-serif;color:#0c2d75'>Reimposta la password</h2><p style='font-family:sans-serif'>Clicca sul link per reimpostare la password del tuo account MeasureMate:</p><p><a href='{{ .ConfirmationURL }}' style='background:#0c2d75;color:white;padding:12px 24px;border-radius:8px;text-decoration:none;font-family:sans-serif;font-weight:bold'>Reimposta password</a></p>"
}
"@

$r = Invoke-WebRequest `
    -Uri "https://api.supabase.com/v1/projects/$ref/config/auth" `
    -Method Patch `
    -Headers @{ "Authorization" = "Bearer $token"; "Content-Type" = "application/json" } `
    -Body $body `
    -UseBasicParsing

Write-Host "Status: $($r.StatusCode)" -ForegroundColor Cyan

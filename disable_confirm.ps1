$token = "sbp_e98b666ad0f5ea6ff8a1666def007695bba23246"
$ref   = "vhsfdvkuzqqlmpuucfbt"

$body = '{"mailer_autoconfirm":true}'

$r = Invoke-WebRequest `
    -Uri "https://api.supabase.com/v1/projects/$ref/config/auth" `
    -Method Patch `
    -Headers @{
        "Authorization" = "Bearer $token"
        "Content-Type"  = "application/json"
    } `
    -Body $body `
    -UseBasicParsing

Write-Host "Status: $($r.StatusCode)" -ForegroundColor Cyan
Write-Host $r.Content

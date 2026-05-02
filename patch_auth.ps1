$token = "sbp_e98b666ad0f5ea6ff8a1666def007695bba23246"
$ref   = "vhsfdvkuzqqlmpuucfbt"
$body  = '{"mailer_autoconfirm":true,"smtp_sender_name":"MeasureMate"}'
try {
    $r = Invoke-RestMethod `
        -Uri "https://api.supabase.com/v1/projects/$ref/config/auth" `
        -Method Patch `
        -Headers @{ Authorization = "Bearer $token"; "Content-Type" = "application/json" } `
        -Body $body
    Write-Host "OK - conferma email disabilitata" -ForegroundColor Green
} catch {
    Write-Host "ERRORE: $($_.Exception.Message)" -ForegroundColor Red
}

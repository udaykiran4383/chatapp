# Generate users.csv with 350 test accounts
$csv = "email,password,fullName`n"
for ($i = 1; $i -le 350; $i++) {
    $csv += "loadtest$i@justchat.test,TestPass123!,Load Test User $i`n"
}
$csv | Out-File -FilePath "monitoring/artillery/users.csv" -Encoding utf8 -NoNewline
Write-Host "Generated users.csv with 350 test accounts"

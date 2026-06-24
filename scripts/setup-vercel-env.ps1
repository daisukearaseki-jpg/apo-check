# .env.local の値を Vercel Production に登録する
# 事前に: npx vercel login && npx vercel link

$ErrorActionPreference = "Stop"
$root = Split-Path -Parent $PSScriptRoot
$envFile = Join-Path $root ".env.local"

if (-not (Test-Path $envFile)) {
  Write-Error ".env.local が見つかりません: $envFile"
}

$keys = @(
  "GAS_WEB_APP_URL",
  "GAS_API_SECRET",
  "RESEND_API_KEY",
  "RESEND_FROM",
  "RESEND_SANDBOX_RECIPIENT",
  "NOTIFICATION_EMAIL"
)

$values = @{}
Get-Content $envFile | ForEach-Object {
  if ($_ -match '^\s*#' -or $_ -notmatch '=') { return }
  $name, $value = $_ -split '=', 2
  $name = $name.Trim()
  $value = $value.Trim().Trim('"')
  if ($name) { $values[$name] = $value }
}

Push-Location $root
try {
  foreach ($key in $keys) {
    if (-not $values.ContainsKey($key)) {
      Write-Warning "スキップ（.env.local に無し）: $key"
      continue
    }
    if ($values[$key] -match '^re_xxxxxxxx$') {
      Write-Warning "スキップ（仮の値）: $key"
      continue
    }

    Write-Host "設定中: $key"
    $values[$key] | npx vercel env add $key production --force
  }

  Write-Host ""
  Write-Host "完了。再デプロイします..."
  npx vercel --prod
} finally {
  Pop-Location
}

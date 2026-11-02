param([switch]$SkipInstall)
$ErrorActionPreference = 'Stop'
$workspace = Split-Path -Parent $PSScriptRoot
Set-Location -LiteralPath $workspace
$toolRoot = Join-Path $workspace '.tools'
New-Item -ItemType Directory -Force $toolRoot | Out-Null
$maven = Join-Path $toolRoot 'apache-maven-3.9.11/bin/mvn.cmd'
if (!(Test-Path -LiteralPath $maven)) {
  Invoke-WebRequest 'https://repo.maven.apache.org/maven2/org/apache/maven/apache-maven/3.9.11/apache-maven-3.9.11-bin.zip' -OutFile (Join-Path $toolRoot 'maven.zip')
  Expand-Archive -LiteralPath (Join-Path $toolRoot 'maven.zip') -DestinationPath $toolRoot -Force
}
if (!$env:JAVA_HOME) { throw 'Defina JAVA_HOME para uma instalação de JDK 21.' }
$javaExe = Join-Path $env:JAVA_HOME 'bin/java.exe'
$envFile = Join-Path $workspace '.env'
if (!(Test-Path -LiteralPath $envFile)) {
  $appSecret = [Convert]::ToHexString([System.Security.Cryptography.RandomNumberGenerator]::GetBytes(32))
  $adminSecret = [Convert]::ToHexString([System.Security.Cryptography.RandomNumberGenerator]::GetBytes(16))
  @("DB_USER=postgres","DB_PASSWORD=postgres","DATABASE_URL=jdbc:postgresql://localhost:5432/vozbrasil","APP_SECRET=$appSecret","ADMIN_USER=admin","ADMIN_PASSWORD=$adminSecret","APP_ORIGIN=http://localhost:3000","SECURE_COOKIE=false","RETENTION_DAYS=730") | Set-Content -LiteralPath $envFile
}
Get-Content -LiteralPath $envFile | ForEach-Object { if ($_ -match '^([A-Z_]+)=(.*)$') { [Environment]::SetEnvironmentVariable($Matches[1],$Matches[2],'Process') } }
if (!$SkipInstall) { & npm.cmd ci --prefix frontend; if ($LASTEXITCODE) { throw 'Falha ao instalar frontend' } }
& $maven -q -f backend/pom.xml test-compile dependency:build-classpath '-Dmdep.outputFile=target/classpath.txt'
if ($LASTEXITCODE) { throw 'Falha ao preparar backend' }
$classpath = (Join-Path $workspace 'backend/target/test-classes') + ';' + (Join-Path $workspace 'backend/target/classes') + ';' + (Get-Content -Raw 'backend/target/classpath.txt').Trim()
$processes = @()
try {
  $existingDb = Get-NetTCPConnection -LocalPort 5432 -State Listen -ErrorAction SilentlyContinue
  if (!$existingDb) {
    $stopMarker=Join-Path $toolRoot 'database.stop'
    if(Test-Path -LiteralPath $stopMarker){Remove-Item -LiteralPath $stopMarker}
    $databaseDir = Join-Path $toolRoot 'postgres-data'
    $processes += Start-Process -FilePath $javaExe -ArgumentList @('-cp',('"'+$classpath+'"'),'br.org.vozbrasil.DevDatabase',('"'+$databaseDir+'"')) -WindowStyle Hidden -PassThru -RedirectStandardOutput (Join-Path $toolRoot 'database.log') -RedirectStandardError (Join-Path $toolRoot 'database-error.log')
    $dbReady = $false
    for ($attempt=0; $attempt -lt 60; $attempt++) { if (Get-NetTCPConnection -LocalPort 5432 -State Listen -ErrorAction SilentlyContinue) { $dbReady=$true;break }; Start-Sleep -Seconds 1 }
    if (!$dbReady) { throw 'PostgreSQL não iniciou. Consulte .tools/database-error.log.' }
  }
  $serverCp = (Join-Path $workspace 'backend/target/classes') + ';' + (Get-Content -Raw 'backend/target/classpath.txt').Trim()
  $processes += Start-Process -FilePath $javaExe -ArgumentList @('-cp',('"'+$serverCp+'"'),'br.org.vozbrasil.Application') -WindowStyle Hidden -PassThru -RedirectStandardOutput (Join-Path $toolRoot 'backend.log') -RedirectStandardError (Join-Path $toolRoot 'backend-error.log')
  Write-Host 'VozBrasil: http://localhost:3000 | Admin: usuário e senha no arquivo .env'
  Write-Host 'Logs: .tools/backend.log | Ctrl+C encerra os serviços iniciados por este script.'
  & npm.cmd run dev --prefix frontend
} finally {
  New-Item -ItemType File -Force (Join-Path $toolRoot 'database.stop') | Out-Null
  foreach ($process in $processes) { if (!$process.HasExited -and $process.ProcessName -eq 'java') { $process.WaitForExit(3000) | Out-Null } }
  foreach ($process in $processes) { if (!$process.HasExited) { Stop-Process -Id $process.Id -ErrorAction SilentlyContinue } }
}

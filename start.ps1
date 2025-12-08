# ============================================
# Smart City - Script de Inicializacao
# ============================================
# Execute: .\start.ps1
# Para parar: .\stop.ps1
# ============================================

$ErrorActionPreference = "SilentlyContinue"
$projectRoot = $PSScriptRoot
$pidFile = "$projectRoot\.pids"

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "   SMART CITY - Sistema Distribuido    " -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Verificar se Python esta instalado
$python = Get-Command python -ErrorAction SilentlyContinue
if (-not $python) {
    Write-Host "[ERRO] Python nao encontrado! Instale Python 3.8+" -ForegroundColor Red
    exit 1
}

# Verificar se Node esta instalado
$node = Get-Command node -ErrorAction SilentlyContinue
if (-not $node) {
    Write-Host "[ERRO] Node.js nao encontrado! Instale Node.js 18+" -ForegroundColor Red
    exit 1
}

Write-Host "[OK] Python encontrado" -ForegroundColor Green
Write-Host "[OK] Node.js encontrado" -ForegroundColor Green
Write-Host ""

# Verificar se iot_pb2.py existe
if (-not (Test-Path "$projectRoot\gateway\iot_pb2.py")) {
    Write-Host "[...] Gerando Protocol Buffers..." -ForegroundColor Yellow
    python -m grpc_tools.protoc -I"$projectRoot" --python_out="$projectRoot" "$projectRoot\iot.proto"
    Copy-Item "$projectRoot\iot_pb2.py" "$projectRoot\gateway\" -Force
    Copy-Item "$projectRoot\iot_pb2.py" "$projectRoot\sensors\" -Force
    Write-Host "[OK] Protocol Buffers gerados" -ForegroundColor Green
}

# Verificar dependencias do backend
if (-not (Test-Path "$projectRoot\client\backend\node_modules")) {
    Write-Host "[...] Instalando dependencias do backend..." -ForegroundColor Yellow
    Push-Location "$projectRoot\client\backend"
    npm install
    Pop-Location
}

# Verificar dependencias do frontend
if (-not (Test-Path "$projectRoot\client\frontend\node_modules")) {
    Write-Host "[...] Instalando dependencias do frontend..." -ForegroundColor Yellow
    Push-Location "$projectRoot\client\frontend"
    npm install
    Pop-Location
}

Write-Host ""
Write-Host "Iniciando servicos..." -ForegroundColor Yellow
Write-Host ""

# Limpar arquivo de PIDs antigo
if (Test-Path $pidFile) {
    Remove-Item $pidFile -Force
}

# Array para guardar PIDs
$pids = @()

# 1. Gateway
Write-Host "  [1/10] Gateway Central..." -ForegroundColor White
$proc = Start-Process powershell -ArgumentList "-NoExit", "-Command", "`$Host.UI.RawUI.WindowTitle = 'GATEWAY'; Set-Location '$projectRoot\gateway'; python gateway.py" -PassThru
$pids += $proc.Id

Start-Sleep -Seconds 2

# 2. Semaforo
Write-Host "  [2/10] Semaforo..." -ForegroundColor White
$proc = Start-Process powershell -ArgumentList "-NoExit", "-Command", "`$Host.UI.RawUI.WindowTitle = 'SEMAFORO'; Set-Location '$projectRoot\sensors'; python semaforo.py" -PassThru
$pids += $proc.Id

Start-Sleep -Seconds 1

# 3. Poste
Write-Host "  [3/10] Poste de Luz..." -ForegroundColor White
$proc = Start-Process powershell -ArgumentList "-NoExit", "-Command", "`$Host.UI.RawUI.WindowTitle = 'POSTE'; Set-Location '$projectRoot\sensors'; python poste.py" -PassThru
$pids += $proc.Id

Start-Sleep -Seconds 1

# 4. Radar
Write-Host "  [4/10] Radar de Velocidade..." -ForegroundColor White
$proc = Start-Process powershell -ArgumentList "-NoExit", "-Command", "`$Host.UI.RawUI.WindowTitle = 'RADAR'; Set-Location '$projectRoot\sensors'; python radar.py" -PassThru
$pids += $proc.Id

Start-Sleep -Seconds 1

# 5. Camera Estacionamento
Write-Host "  [5/10] Camera Estacionamento..." -ForegroundColor White
$proc = Start-Process powershell -ArgumentList "-NoExit", "-Command", "`$Host.UI.RawUI.WindowTitle = 'CAM-EST'; Set-Location '$projectRoot\sensors'; python camera_estacionamento.py" -PassThru
$pids += $proc.Id

Start-Sleep -Seconds 1

# 6. Camera Praca
Write-Host "  [6/10] Camera Praca..." -ForegroundColor White
$proc = Start-Process powershell -ArgumentList "-NoExit", "-Command", "`$Host.UI.RawUI.WindowTitle = 'CAM-PRACA'; Set-Location '$projectRoot\sensors'; python camera_praca.py" -PassThru
$pids += $proc.Id

Start-Sleep -Seconds 1

# 7. Sensor de Ar
Write-Host "  [7/10] Sensor de Ar..." -ForegroundColor White
$proc = Start-Process powershell -ArgumentList "-NoExit", "-Command", "`$Host.UI.RawUI.WindowTitle = 'SENSOR-AR'; Set-Location '$projectRoot\sensors'; python sensor_ar.py" -PassThru
$pids += $proc.Id

Start-Sleep -Seconds 1

# 8. Sensor de Temperatura
Write-Host "  [8/10] Sensor de Temperatura..." -ForegroundColor White
$proc = Start-Process powershell -ArgumentList "-NoExit", "-Command", "`$Host.UI.RawUI.WindowTitle = 'SENSOR-TEMP'; Set-Location '$projectRoot\sensors'; python sensor_temperatura.py" -PassThru
$pids += $proc.Id

Start-Sleep -Seconds 2

# 9. Backend Node.js
Write-Host "  [9/10] Backend (WebSocket)..." -ForegroundColor White
$proc = Start-Process powershell -ArgumentList "-NoExit", "-Command", "`$Host.UI.RawUI.WindowTitle = 'BACKEND'; Set-Location '$projectRoot\client\backend'; npm run dev" -PassThru
$pids += $proc.Id

Start-Sleep -Seconds 2

# 10. Frontend React
Write-Host "  [10/10] Frontend (React)..." -ForegroundColor White
$proc = Start-Process powershell -ArgumentList "-NoExit", "-Command", "`$Host.UI.RawUI.WindowTitle = 'FRONTEND'; Set-Location '$projectRoot\client\frontend'; npm run dev" -PassThru
$pids += $proc.Id

# Salvar PIDs no arquivo
$pids | Out-File -FilePath $pidFile

Write-Host ""
Write-Host "========================================" -ForegroundColor Green
Write-Host "   Sistema iniciado com sucesso!       " -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Green
Write-Host ""
Write-Host "  Gateway:     TCP localhost:9000" -ForegroundColor White
Write-Host "  Dados UDP:   localhost:9001" -ForegroundColor White
Write-Host "  Backend WS:  ws://localhost:3001" -ForegroundColor White
Write-Host "  Frontend:    http://localhost:5173" -ForegroundColor Cyan
Write-Host ""
Write-Host "  Dispositivos:" -ForegroundColor White
Write-Host "    Semaforo             - TCP:8001" -ForegroundColor Yellow
Write-Host "    Poste                - TCP:8002" -ForegroundColor Yellow
Write-Host "    Radar                - TCP:8003" -ForegroundColor Yellow
Write-Host "    Camera Estacionamento" -ForegroundColor Yellow
Write-Host "    Camera Praca" -ForegroundColor Yellow
Write-Host "    Sensor Ar" -ForegroundColor Yellow
Write-Host "    Sensor Temperatura" -ForegroundColor Yellow
Write-Host ""
Write-Host "  Para encerrar: .\stop.ps1" -ForegroundColor Gray
Write-Host ""

# Abrir navegador automaticamente apos 3 segundos
Start-Sleep -Seconds 3
Start-Process "http://localhost:5173"

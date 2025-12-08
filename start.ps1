# ============================================
# Smart City - Script de Inicializacao
# ============================================
# Execute: .\start.ps1
# Para parar: Ctrl+C em cada terminal ou feche as janelas
# ============================================

$ErrorActionPreference = "SilentlyContinue"
$projectRoot = $PSScriptRoot

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

# 1. Gateway
Write-Host "  [1/10] Gateway Central..." -ForegroundColor White
Start-Process powershell -ArgumentList "-NoExit", "-Command", "Set-Location '$projectRoot\gateway'; Write-Host 'GATEWAY' -ForegroundColor Cyan; python gateway.py" -WindowStyle Normal

Start-Sleep -Seconds 2

# 2. Semaforo
Write-Host "  [2/10] Semaforo..." -ForegroundColor White
Start-Process powershell -ArgumentList "-NoExit", "-Command", "Set-Location '$projectRoot\sensors'; Write-Host 'SEMAFORO' -ForegroundColor Yellow; python semaforo.py" -WindowStyle Normal

Start-Sleep -Seconds 1

# 3. Poste
Write-Host "  [3/10] Poste de Luz..." -ForegroundColor White
Start-Process powershell -ArgumentList "-NoExit", "-Command", "Set-Location '$projectRoot\sensors'; Write-Host 'POSTE' -ForegroundColor Yellow; python poste.py" -WindowStyle Normal

Start-Sleep -Seconds 1

# 4. Radar
Write-Host "  [4/10] Radar de Velocidade..." -ForegroundColor White
Start-Process powershell -ArgumentList "-NoExit", "-Command", "Set-Location '$projectRoot\sensors'; Write-Host 'RADAR' -ForegroundColor Yellow; python radar.py" -WindowStyle Normal

Start-Sleep -Seconds 1

# 5. Camera Estacionamento
Write-Host "  [5/10] Camera Estacionamento..." -ForegroundColor White
Start-Process powershell -ArgumentList "-NoExit", "-Command", "Set-Location '$projectRoot\sensors'; Write-Host 'CAMERA ESTACIONAMENTO' -ForegroundColor Yellow; python camera_estacionamento.py" -WindowStyle Normal

Start-Sleep -Seconds 1

# 6. Camera Praca
Write-Host "  [6/10] Camera Praca..." -ForegroundColor White
Start-Process powershell -ArgumentList "-NoExit", "-Command", "Set-Location '$projectRoot\sensors'; Write-Host 'CAMERA PRACA' -ForegroundColor Yellow; python camera_praca.py" -WindowStyle Normal

Start-Sleep -Seconds 1

# 7. Sensor de Ar
Write-Host "  [7/10] Sensor de Ar..." -ForegroundColor White
Start-Process powershell -ArgumentList "-NoExit", "-Command", "Set-Location '$projectRoot\sensors'; Write-Host 'SENSOR AR' -ForegroundColor Yellow; python sensor_ar.py" -WindowStyle Normal

Start-Sleep -Seconds 1

# 8. Sensor de Temperatura
Write-Host "  [8/10] Sensor de Temperatura..." -ForegroundColor White
Start-Process powershell -ArgumentList "-NoExit", "-Command", "Set-Location '$projectRoot\sensors'; Write-Host 'SENSOR TEMPERATURA' -ForegroundColor Yellow; python sensor_temperatura.py" -WindowStyle Normal

Start-Sleep -Seconds 2

# 9. Backend Node.js
Write-Host "  [9/10] Backend (WebSocket)..." -ForegroundColor White
Start-Process powershell -ArgumentList "-NoExit", "-Command", "Set-Location '$projectRoot\client\backend'; Write-Host 'BACKEND' -ForegroundColor Magenta; npm run dev" -WindowStyle Normal

Start-Sleep -Seconds 2

# 10. Frontend React
Write-Host "  [10/10] Frontend (React)..." -ForegroundColor White
Start-Process powershell -ArgumentList "-NoExit", "-Command", "Set-Location '$projectRoot\client\frontend'; Write-Host 'FRONTEND' -ForegroundColor Green; npm run dev" -WindowStyle Normal

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
Write-Host "  Para encerrar: feche todas as janelas" -ForegroundColor Gray
Write-Host "  ou execute: .\stop.ps1" -ForegroundColor Gray
Write-Host ""

# Abrir navegador automaticamente apos 3 segundos
Start-Sleep -Seconds 3
Start-Process "http://localhost:5173"

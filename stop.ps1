# ============================================
# Smart City - Script para Encerrar
# ============================================

Write-Host ""
Write-Host "Encerrando servicos Smart City..." -ForegroundColor Yellow
Write-Host ""

# Matar processos Python (gateway e sensores)
$pythonProcesses = Get-Process python -ErrorAction SilentlyContinue
if ($pythonProcesses) {
    $pythonProcesses | Stop-Process -Force
    Write-Host "  [OK] Processos Python encerrados" -ForegroundColor Green
}

# Matar processos Node (backend e frontend)
$nodeProcesses = Get-Process node -ErrorAction SilentlyContinue
if ($nodeProcesses) {
    $nodeProcesses | Stop-Process -Force
    Write-Host "  [OK] Processos Node encerrados" -ForegroundColor Green
}

# Fechar janelas do PowerShell que foram abertas pelo start.ps1
# Procura por janelas com titulos especificos
$shellProcesses = Get-Process powershell -ErrorAction SilentlyContinue | Where-Object {
    $_.MainWindowTitle -match "GATEWAY|SEMAFORO|POSTE|RADAR|BACKEND|FRONTEND" -or
    $_.MainWindowTitle -match "gateway|semaforo|poste|radar|backend|frontend" -or
    $_.MainWindowTitle -match "python|npm|node"
}

if ($shellProcesses) {
    $shellProcesses | Stop-Process -Force -ErrorAction SilentlyContinue
    Write-Host "  [OK] Janelas de terminal fechadas" -ForegroundColor Green
}

# Fechar todas as janelas powershell exceto a atual
$currentPID = $PID
Get-Process powershell -ErrorAction SilentlyContinue | Where-Object {
    $_.Id -ne $currentPID -and $_.MainWindowHandle -ne 0
} | ForEach-Object {
    # Verifica se a janela tem um dos processos filhos que usamos
    $childProcesses = Get-CimInstance Win32_Process -Filter "ParentProcessId=$($_.Id)" -ErrorAction SilentlyContinue
    if ($childProcesses | Where-Object { $_.Name -match "python|node" }) {
        Stop-Process -Id $_.Id -Force -ErrorAction SilentlyContinue
    }
}

Write-Host "  [OK] Terminais fechados" -ForegroundColor Green

# Liberar portas especificas
$ports = @(3001, 5173, 8001, 8002, 8003, 9000, 9001)
foreach ($port in $ports) {
    $connections = Get-NetTCPConnection -LocalPort $port -ErrorAction SilentlyContinue
    if ($connections) {
        $connections | ForEach-Object {
            Stop-Process -Id $_.OwningProcess -Force -ErrorAction SilentlyContinue
        }
    }
}

Write-Host ""
Write-Host "[OK] Todos os servicos foram encerrados!" -ForegroundColor Green
Write-Host ""

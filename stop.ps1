# ============================================
# Smart City - Script para Encerrar
# ============================================

$ErrorActionPreference = "SilentlyContinue"

Write-Host ""
Write-Host "Encerrando servicos Smart City..." -ForegroundColor Yellow
Write-Host ""

# Matar processos Python (gateway e sensores)
Get-Process python -ErrorAction SilentlyContinue | ForEach-Object {
    $_.Kill()
}
Write-Host "  [OK] Processos Python encerrados" -ForegroundColor Green

# Matar processos Node (backend e frontend)
Get-Process node -ErrorAction SilentlyContinue | ForEach-Object {
    $_.Kill()
}
Write-Host "  [OK] Processos Node encerrados" -ForegroundColor Green

# Aguardar um pouco para os processos morrerem
Start-Sleep -Milliseconds 500

# Fechar janelas PowerShell abertas pelo start.ps1
# Procura por processos powershell com janela visivel (exceto o atual)
$currentPID = $PID
Get-Process powershell -ErrorAction SilentlyContinue | Where-Object {
    $_.Id -ne $currentPID -and $_.MainWindowHandle -ne 0
} | ForEach-Object {
    try {
        $_.CloseMainWindow() | Out-Null
        Start-Sleep -Milliseconds 100
        if (-not $_.HasExited) {
            $_.Kill()
        }
    } catch {}
}
Write-Host "  [OK] Terminais fechados" -ForegroundColor Green

Write-Host ""
Write-Host "[OK] Todos os servicos foram encerrados!" -ForegroundColor Green
Write-Host ""

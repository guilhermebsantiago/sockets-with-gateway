# ============================================
# Smart City - Script para Encerrar
# ============================================

$ErrorActionPreference = "SilentlyContinue"
$projectRoot = $PSScriptRoot
$pidFile = "$projectRoot\.pids"

Write-Host ""
Write-Host "Encerrando servicos Smart City..." -ForegroundColor Yellow
Write-Host ""

# Ler PIDs do arquivo e fechar os terminais
if (Test-Path $pidFile) {
    $pids = Get-Content $pidFile
    foreach ($pid in $pids) {
        $pid = $pid.Trim()
        if ($pid -ne "") {
            $process = Get-Process -Id $pid -ErrorAction SilentlyContinue
            if ($process) {
                # Primeiro mata os processos filhos (python, node)
                Get-CimInstance Win32_Process -Filter "ParentProcessId=$pid" | ForEach-Object {
                    Stop-Process -Id $_.ProcessId -Force -ErrorAction SilentlyContinue
                }
                # Depois mata o terminal PowerShell
                Stop-Process -Id $pid -Force -ErrorAction SilentlyContinue
            }
        }
    }
    Remove-Item $pidFile -Force
    Write-Host "  [OK] Terminais fechados via PIDs" -ForegroundColor Green
} else {
    Write-Host "  [!] Arquivo de PIDs nao encontrado, usando metodo alternativo..." -ForegroundColor Yellow
    
    # Metodo alternativo: matar por nome de processo
    Get-Process python -ErrorAction SilentlyContinue | Stop-Process -Force
    Get-Process node -ErrorAction SilentlyContinue | Stop-Process -Force
    Write-Host "  [OK] Processos Python/Node encerrados" -ForegroundColor Green
}

# Garantir que python e node foram encerrados
Start-Sleep -Milliseconds 500
Get-Process python -ErrorAction SilentlyContinue | Stop-Process -Force
Get-Process node -ErrorAction SilentlyContinue | Stop-Process -Force

Write-Host ""
Write-Host "[OK] Todos os servicos foram encerrados!" -ForegroundColor Green
Write-Host ""

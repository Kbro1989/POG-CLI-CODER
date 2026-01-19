
# Fix Migration: Move Desktop models to D:\

Write-Host "🔧 Starting Desktop Storage Migration..." -ForegroundColor Green

# 1. Stop Ollama
Stop-Process -Name ollama -Force -ErrorAction SilentlyContinue
Stop-Process -Name "ollama app" -Force -ErrorAction SilentlyContinue
Start-Sleep -Seconds 2

# 2. Define Paths
$source = "$env:USERPROFILE\Desktop\.ollama\models"
$dest = "D:\ollama-models"

# 3. RoboCopy (Move)
if (Test-Path $source) {
    Write-Host "📦 Moving 42GB+ from Desktop to D:\... (This will take a few minutes)"
    & robocopy $source $dest /E /MOVE /IS /IT /MT:8
    
    if ($LASTEXITCODE -ge 8) {
        Write-Host "❌ Robocopy failed." -ForegroundColor Red
        exit 1
    }
    Write-Host "✅ Move complete."
}
else {
    Write-Host "⚠️ Source $source not found!"
}

# 4. Restart Ollama
Write-Host "🔄 Restarting Ollama..."
$ollamaPath = "$env:LOCALAPPDATA\Programs\Ollama\ollama app.exe"
if (Test-Path $ollamaPath) {
    Start-Process $ollamaPath
    Write-Host "✅ Ollama restarted."
}
else {
    Write-Host "⚠️ Please start Ollama manually."
}

Write-Host "🎉 Fixed! Run 'ollama list' to verify." -ForegroundColor Green


# Migrate Ollama Models to D:\ (Requires Administrator)

Write-Host "🚀 Starting Ollama Storage Migration..." -ForegroundColor Green

# 1. Stop Ollama Service/Process
Write-Host "1. Stopping Ollama..."
Stop-Process -Name ollama -Force -ErrorAction SilentlyContinue
Stop-Process -Name "ollama app" -Force -ErrorAction SilentlyContinue
Start-Sleep -Seconds 2

# 2. Prepare Destination
$destPath = "D:\ollama-models"
if (-not (Test-Path $destPath)) {
    Write-Host "   Creating $destPath..."
    New-Item -ItemType Directory -Path $destPath -Force | Out-Null
}

# 3. Move Models (if they exist in default location)
$sourcePath = "$env:USERPROFILE\.ollama\models"
if (Test-Path $sourcePath) {
    Write-Host "2. Moving existing models from $sourcePath to $destPath..."
    Write-Host "   (This may take time depending on model size)"
    
    # Use Robocopy for robust move (preserves attributes, handles large files)
    & robocopy $sourcePath $destPath /E /MOVE /IS /IT
    
    if ($LASTEXITCODE -ge 8) {
        Write-Host "❌ Robocopy failed with code $LASTEXITCODE" -ForegroundColor Red
        exit 1
    }
    Write-Host "✅ Move complete."
} else {
    Write-Host "ℹ️ No existing models found in default location. Setting up fresh D: store."
}

# 4. Set Environment Variable (Machine Level)
Write-Host "3. Setting OLLAMA_MODELS environment variable..."
[System.Environment]::SetEnvironmentVariable("OLLAMA_MODELS", "D:\ollama-models", [System.EnvironmentVariableTarget]::Machine)

# 5. Restart Ollama
Write-Host "4. Restarting Ollama..."
$ollamaPath = "$env:LOCALAPPDATA\Programs\Ollama\ollama app.exe"

if (Test-Path $ollamaPath) {
    Start-Process $ollamaPath
    Write-Host "✅ Ollama restarted."
} else {
    Write-Host "⚠️ Could not find Ollama executable at $ollamaPath. Please start it manually."
    Write-Host "   Ensure it uses the new D:\ollama-models location."
}

Write-Host "`n🎉 Migration Complete! Run 'ollama list' to verify." -ForegroundColor Green

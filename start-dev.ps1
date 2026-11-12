# Start SURaj AI Backend & Frontend for local development
$root = Split-Path -Parent $MyInvocation.MyCommand.Path

Write-Host "Starting SURaj AI Backend (FastAPI on http://localhost:8000)..." -ForegroundColor Cyan
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$root\backend'; .\.venv\Scripts\uvicorn.exe app.main:app --reload --port 8000"

Write-Host "Starting SURaj AI Frontend (Next.js on http://localhost:3000)..." -ForegroundColor Green
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$root\frontend'; npm run dev"


@echo off
REM Script untuk deploy Gemini Edge Function ke Supabase (Windows)
REM Pastikan Supabase CLI sudah terinstall dan login

echo 🚀 Deploying Gemini Chat Edge Function...

REM Check if supabase CLI is installed
where supabase >nul 2>nul
if %ERRORLEVEL% NEQ 0 (
    echo ❌ Supabase CLI tidak ditemukan. Install dulu:
    echo    npm install -g supabase
    exit /b 1
)

REM Deploy function
echo 📦 Deploying gemini-chat function...
supabase functions deploy gemini-chat

if %ERRORLEVEL% EQU 0 (
    echo ✅ Deployment berhasil!
    echo.
    echo 📝 Jangan lupa:
    echo    1. Set GEMINI_API_KEY di Supabase Dashboard
    echo    2. Project Settings → Edge Functions → Secrets
    echo    3. Tambah secret: GEMINI_API_KEY = your_api_key
) else (
    echo ❌ Deployment gagal. Cek error di atas.
    exit /b 1
)

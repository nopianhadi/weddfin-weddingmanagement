#!/bin/bash

# Script untuk deploy Gemini Edge Function ke Supabase
# Pastikan Supabase CLI sudah terinstall dan login

echo "🚀 Deploying Gemini Chat Edge Function..."

# Check if supabase CLI is installed
if ! command -v supabase &> /dev/null; then
    echo "❌ Supabase CLI tidak ditemukan. Install dulu:"
    echo "   npm install -g supabase"
    exit 1
fi

# Deploy function
echo "📦 Deploying gemini-chat function..."
supabase functions deploy gemini-chat

if [ $? -eq 0 ]; then
    echo "✅ Deployment berhasil!"
    echo ""
    echo "📝 Jangan lupa:"
    echo "   1. Set GEMINI_API_KEY di Supabase Dashboard"
    echo "   2. Project Settings → Edge Functions → Secrets"
    echo "   3. Tambah secret: GEMINI_API_KEY = your_api_key"
else
    echo "❌ Deployment gagal. Cek error di atas."
    exit 1
fi

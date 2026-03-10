# Edge Function: gemini-chat

Proxy ke Google Gemini agar API key tidak dipakai di frontend.

## Setup

1. **Secret**  
   Di Supabase Dashboard: Project Settings → Edge Functions → Secrets → tambah `GEMINI_API_KEY` (isi dengan API key Gemini).

2. **Deploy**  
   ```bash
   supabase functions deploy gemini-chat
   ```

3. **Frontend**  
   Aplikasi memanggil `supabase.functions.invoke('gemini-chat', { body: { prompt } })`.  
   Jika function belum di-deploy atau error, frontend bisa fallback ke direct API bila `GEMINI_API_KEY` masih di-set di env build (untuk backward compatibility).

## Request body

- `prompt` (string): teks prompt untuk Gemini.
- Atau `messages` (array of `{ role, content }`): akan digabung jadi satu teks.

## Response

- `{ "text": "..." }`: respons teks dari model dalam format JSON.

## Perubahan Terbaru

- **API Version**: Menggunakan `v1beta` (untuk support model terbaru)
- **Model**: `gemini-2.5-flash` ✅ (model terbaru dan tercepat via REST API)
- **Response Format**: Plain text (JSON response dari AI perlu di-parse di client)

## Model yang Tersedia via REST API v1beta

- `gemini-2.5-flash` ✅ (digunakan saat ini - model terbaru, cepat, dan efisien)
- `gemini-2.5-pro` (untuk task yang lebih kompleks)
- `gemini-pro` (model lama, masih supported)
- `gemini-pro-vision` (untuk image input)

## Troubleshooting

Jika mendapat error 404 "model not found":
- Pastikan menggunakan API v1beta (bukan v1)
- Model `gemini-1.5-flash` hanya tersedia via SDK, TIDAK via REST API
- Model `gemini-2.5-flash` tersedia di v1beta via REST API ✅
- Verifikasi GEMINI_API_KEY valid dan aktif
- Cek quota API di Google AI Studio

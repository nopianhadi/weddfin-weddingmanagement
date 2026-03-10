import supabase from '../lib/supabaseClient';

const DP_PROOFS_BUCKET = 'dp-proofs';
const GALLERY_BUCKET = 'gallery-images';

export async function uploadDpProof(file: File): Promise<string> {
  const ext = (file.name.split('.').pop() || 'bin').toLowerCase();
  const path = `${new Date().getFullYear()}/${new Date().getMonth() + 1}/${crypto.randomUUID()}.${ext}`;

  // Ensure bucket exists (best-effort; ignore failure if already exists)
  try {
    // Note: Supabase JS client does not manage buckets creation; this would be done via SQL or dashboard.
    // Keep this try/catch as documentation. If bucket missing, upload will throw and we surface a clear error.
  } catch {}

  const { data, error } = await supabase.storage.from(DP_PROOFS_BUCKET).upload(path, file, {
    cacheControl: '31536000',
    upsert: false,
  });
  if (error) throw error;

  const { data: publicUrl } = supabase.storage.from(DP_PROOFS_BUCKET).getPublicUrl(data.path);
  return publicUrl.publicUrl;
}

export async function uploadGalleryImage(file: File, compress: boolean = false): Promise<string> {
  // Validate file type
  if (!file.type.startsWith('image/')) {
    throw new Error('File must be an image');
  }
  
  // Gunakan file asli tanpa kompresi
  const processedFile = file;
  
  // Final size check
  if (processedFile.size > 10 * 1024 * 1024) { // 10MB limit
    throw new Error('File size must be less than 10MB');
  }

  const ext = processedFile.name.split('.').pop()?.toLowerCase() || 'jpg';
  const path = `${new Date().getFullYear()}/${new Date().getMonth() + 1}/${crypto.randomUUID()}.${ext}`;

  try {
    const { data, error } = await supabase.storage.from(GALLERY_BUCKET).upload(path, processedFile, {
      cacheControl: '31536000',
      upsert: false,
    });
    
    if (error) {
      console.error('Supabase storage error:', error);
      throw new Error(`Upload failed: ${error.message}`);
    }

    const { data: publicUrl } = supabase.storage.from(GALLERY_BUCKET).getPublicUrl(data.path);
    return publicUrl.publicUrl;
  } catch (error) {
    console.error('Gallery image upload error:', error);
    throw error;
  }
}

export async function deleteGalleryImage(imageUrl: string): Promise<void> {
  try {
    // Extract path from URL
    const url = new URL(imageUrl);
    const pathMatch = url.pathname.match(/\/storage\/v1\/object\/public\/gallery-images\/(.+)/);
    
    if (pathMatch) {
      const filePath = pathMatch[1];
      const { error } = await supabase.storage.from(GALLERY_BUCKET).remove([filePath]);
      if (error) {
        console.error('Error deleting gallery image:', error);
        throw error;
      }
    }
  } catch (error) {
    console.error('Error parsing gallery image URL for deletion:', error);
    throw error;
  }
}

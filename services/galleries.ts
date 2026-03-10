import { supabase } from '../lib/supabaseClient';
import { Gallery, GalleryImage } from '../types';

export const createGallery = async (galleryData: Omit<Gallery, 'id' | 'public_id' | 'created_at' | 'updated_at'>): Promise<Gallery> => {
    // Generate a public_id from title slug + random suffix
    const slug = (galleryData.title || 'gallery')
        .toLowerCase()
        .replace(/[^a-z0-9]/g, '-')
        .replace(/-+/g, '-')
        .replace(/^-|-$/g, '');
    const random = Math.random().toString(36).substring(2, 7);
    const publicId = slug ? `${slug}-${random}` : random;

    // Ensure user_id is always set (fallback to admin user ID if missing)
    const userId = galleryData.user_id || '11111111-1111-1111-1111-111111111111';

    const payload = { ...galleryData, user_id: userId, public_id: publicId };
    console.log('[Gallery] Creating gallery with payload:', payload);

    const { data, error } = await supabase
        .from('galleries')
        .insert([payload])
        .select()
        .single();

    if (error) {
        console.error('Error creating gallery:', error);
        throw new Error('Gagal membuat galeri');
    }

    return data;
};

export const listGalleries = async (): Promise<Gallery[]> => {
    const { data, error } = await supabase
        .from('galleries')
        .select('*')
        .order('created_at', { ascending: false });

    if (error) {
        console.error('Error fetching galleries:', error);
        throw new Error('Gagal memuat galeri');
    }

    return data || [];
};

export const getGallery = async (id: string): Promise<Gallery | null> => {
    const { data, error } = await supabase
        .from('galleries')
        .select('*')
        .eq('id', id)
        .single();

    if (error) {
        console.error('Error fetching gallery:', error);
        return null;
    }

    return data;
};

export const getPublicGallery = async (publicId: string): Promise<Gallery | null> => {
    const { data, error } = await supabase
        .from('galleries')
        .select('*')
        .eq('public_id', publicId)
        .eq('is_public', true)
        .single();

    if (error) {
        console.error('Error fetching public gallery:', error);
        return null;
    }

    return data;
};

export const updateGallery = async (id: string, updates: Partial<Gallery>): Promise<Gallery> => {
    const { data, error } = await supabase
        .from('galleries')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

    if (error) {
        console.error('Error updating gallery:', error);
        throw new Error('Gagal mengupdate galeri');
    }

    return data;
};

export const deleteGallery = async (id: string): Promise<void> => {
    // First, delete all images from storage
    const gallery = await getGallery(id);
    if (gallery && gallery.images.length > 0) {
        const imagePaths = gallery.images.map(img => {
            const url = new URL(img.url);
            return url.pathname.split('/').pop() || '';
        }).filter(Boolean);

        if (imagePaths.length > 0) {
            await supabase.storage
                .from('gallery-images')
                .remove(imagePaths);
        }
    }

    // Then delete the gallery record
    const { error } = await supabase
        .from('galleries')
        .delete()
        .eq('id', id);

    if (error) {
        console.error('Error deleting gallery:', error);
        throw new Error('Gagal menghapus galeri');
    }
};

export const uploadGalleryImages = async (
    galleryId: string,
    files: File[],
    onProgress?: (progress: number) => void
): Promise<GalleryImage[]> => {
    const uploadedImages: GalleryImage[] = [];

    for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const fileExt = file.name.split('.').pop();
        const fileName = `${galleryId}/${Date.now()}-${Math.random().toString(36).substring(2)}.${fileExt}`;

        // Upload to Supabase Storage
        const { data: uploadData, error: uploadError } = await supabase.storage
            .from('gallery-images')
            .upload(fileName, file);

        if (uploadError) {
            console.error('Error uploading image:', uploadError);
            continue;
        }

        // Get public URL
        const { data: urlData } = supabase.storage
            .from('gallery-images')
            .getPublicUrl(fileName);

        const newImage: GalleryImage = {
            id: crypto.randomUUID(),
            url: urlData.publicUrl,
            uploadedAt: new Date().toISOString()
        };

        uploadedImages.push(newImage);

        // Update progress
        if (onProgress) {
            onProgress(Math.round(((i + 1) / files.length) * 100));
        }
    }

    // Update gallery with new images
    if (uploadedImages.length > 0) {
        const gallery = await getGallery(galleryId);
        if (gallery) {
            const updatedImages = [...gallery.images, ...uploadedImages];
            await updateGallery(galleryId, { images: updatedImages });
        }
    }

    return uploadedImages;
};

export const deleteGalleryImage = async (galleryId: string, imageId: string): Promise<void> => {
    const gallery = await getGallery(galleryId);
    if (!gallery) {
        throw new Error('Galeri tidak ditemukan');
    }

    const imageToDelete = gallery.images.find(img => img.id === imageId);
    if (!imageToDelete) {
        throw new Error('Gambar tidak ditemukan');
    }

    // Delete from storage
    const url = new URL(imageToDelete.url);
    const imagePath = url.pathname.split('/').pop();
    if (imagePath) {
        await supabase.storage
            .from('gallery-images')
            .remove([imagePath]);
    }

    // Update gallery images
    const updatedImages = gallery.images.filter(img => img.id !== imageId);
    await updateGallery(galleryId, { images: updatedImages });
};

export const getGalleriesByRegion = async (region: string): Promise<Gallery[]> => {
    const { data, error } = await supabase
        .from('galleries')
        .select('*')
        .eq('region', region)
        .eq('is_public', true)
        .order('created_at', { ascending: false });

    if (error) {
        console.error('Error fetching galleries by region:', error);
        throw new Error('Gagal memuat galeri');
    }

    return data || [];
};
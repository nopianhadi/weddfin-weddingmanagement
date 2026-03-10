/**
 * Chat Templates Service dengan Offline Support
 * Mengelola template chat WhatsApp dengan sinkronisasi offline
 */

import { supabase } from '../lib/supabaseClient';
import { syncManager } from './syncManager';
import { offlineStorage } from './offlineStorage';
import type { ChatTemplate, Profile } from '../types';
import { CHAT_TEMPLATES } from '../constants';

const CACHE_KEY = 'chat_templates';
const CACHE_TTL_MINUTES = 60; // Chat templates jarang berubah

/**
 * Get chat templates dengan offline support
 * Priority: User custom templates > Default templates
 */
export async function getChatTemplatesOffline(userProfile?: Profile): Promise<ChatTemplate[]> {
  try {
    // Jika ada custom templates dari user profile, gunakan itu
    if (userProfile?.chatTemplates && userProfile.chatTemplates.length > 0) {
      // Cache custom templates
      await offlineStorage.cacheData(CACHE_KEY, userProfile.chatTemplates, CACHE_TTL_MINUTES);
      return userProfile.chatTemplates;
    }

    // Cek cache
    const cached = await offlineStorage.getCachedData<ChatTemplate[]>(CACHE_KEY);
    if (cached && cached.length > 0) {
      return cached;
    }

    // Fallback ke default templates
    await offlineStorage.cacheData(CACHE_KEY, CHAT_TEMPLATES, CACHE_TTL_MINUTES);
    return CHAT_TEMPLATES;
  } catch (error) {
    console.error('[ChatTemplatesOffline] Error getting templates:', error);
    return CHAT_TEMPLATES; // Always fallback to default
  }
}

/**
 * Update chat template dengan offline support
 */
export async function updateChatTemplateOffline(
  userProfile: Profile,
  templateId: string,
  updates: Partial<ChatTemplate>
): Promise<ChatTemplate[]> {
  try {
    if (!navigator.onLine) {
      throw new Error('Offline: operasi tidak diizinkan. Silakan sambungkan internet.');
    }
    // Get current templates
    const currentTemplates = await getChatTemplatesOffline(userProfile);
    
    // Update template
    const updatedTemplates = currentTemplates.map(t =>
      t.id === templateId ? { ...t, ...updates } : t
    );

    // Update cache optimistically
    await offlineStorage.cacheData(CACHE_KEY, updatedTemplates, CACHE_TTL_MINUTES);

    // Update di Supabase via profile
    const { data, error } = await supabase
      .from('profiles')
      .update({
        booking_form_template: JSON.stringify({ chatTemplates: updatedTemplates }),
      })
      .eq('id', userProfile.id)
      .select()
      .single();

    if (error) throw error;

    return updatedTemplates;
  } catch (error) {
    console.error('[ChatTemplatesOffline] Error updating template:', error);

    throw error;
  }
}

/**
 * Add new chat template dengan offline support
 */
export async function addChatTemplateOffline(
  userProfile: Profile,
  newTemplate: Omit<ChatTemplate, 'id'>
): Promise<ChatTemplate[]> {
  try {
    if (!navigator.onLine) {
      throw new Error('Offline: operasi tidak diizinkan. Silakan sambungkan internet.');
    }
    const currentTemplates = await getChatTemplatesOffline(userProfile);
    
    // Generate ID
    const template: ChatTemplate = {
      ...newTemplate,
      id: `custom_${Date.now()}`,
    };

    const updatedTemplates = [...currentTemplates, template];

    // Update cache optimistically
    await offlineStorage.cacheData(CACHE_KEY, updatedTemplates, CACHE_TTL_MINUTES);

    // Update di Supabase
    const { data, error } = await supabase
      .from('profiles')
      .update({
        booking_form_template: JSON.stringify({ chatTemplates: updatedTemplates }),
      })
      .eq('id', userProfile.id)
      .select()
      .single();

    if (error) throw error;

    return updatedTemplates;
  } catch (error) {
    console.error('[ChatTemplatesOffline] Error adding template:', error);

    throw error;
  }
}

/**
 * Delete chat template dengan offline support
 */
export async function deleteChatTemplateOffline(
  userProfile: Profile,
  templateId: string
): Promise<ChatTemplate[]> {
  try {
    if (!navigator.onLine) {
      throw new Error('Offline: operasi tidak diizinkan. Silakan sambungkan internet.');
    }
    const currentTemplates = await getChatTemplatesOffline(userProfile);
    
    // Filter out deleted template
    const updatedTemplates = currentTemplates.filter(t => t.id !== templateId);

    // Update cache optimistically
    await offlineStorage.cacheData(CACHE_KEY, updatedTemplates, CACHE_TTL_MINUTES);

    // Update di Supabase
    const { data, error } = await supabase
      .from('profiles')
      .update({
        booking_form_template: JSON.stringify({ chatTemplates: updatedTemplates }),
      })
      .eq('id', userProfile.id)
      .select()
      .single();

    if (error) throw error;

    return updatedTemplates;
  } catch (error) {
    console.error('[ChatTemplatesOffline] Error deleting template:', error);

    throw error;
  }
}

/**
 * Reset to default templates
 */
export async function resetToDefaultTemplatesOffline(
  userProfile: Profile
): Promise<ChatTemplate[]> {
  try {
    if (!navigator.onLine) {
      throw new Error('Offline: operasi tidak diizinkan. Silakan sambungkan internet.');
    }
    // Update cache dengan default templates
    await offlineStorage.cacheData(CACHE_KEY, CHAT_TEMPLATES, CACHE_TTL_MINUTES);

    // Update di Supabase
    const { data, error } = await supabase
      .from('profiles')
      .update({
        booking_form_template: JSON.stringify({ chatTemplates: CHAT_TEMPLATES }),
      })
      .eq('id', userProfile.id)
      .select()
      .single();

    if (error) throw error;

    return CHAT_TEMPLATES;
  } catch (error) {
    console.error('[ChatTemplatesOffline] Error resetting templates:', error);

    throw error;
  }
}

/**
 * Get single template by ID
 */
export async function getChatTemplateByIdOffline(
  userProfile: Profile,
  templateId: string
): Promise<ChatTemplate | null> {
  try {
    const templates = await getChatTemplatesOffline(userProfile);
    return templates.find(t => t.id === templateId) || null;
  } catch (error) {
    console.error('[ChatTemplatesOffline] Error getting template by ID:', error);
    return null;
  }
}

/**
 * Process template dengan variable replacement
 */
export function processTemplate(
  template: string,
  variables: Record<string, string>
): string {
  let processed = template;
  
  Object.entries(variables).forEach(([key, value]) => {
    const regex = new RegExp(`\\{${key}\\}`, 'g');
    processed = processed.replace(regex, value);
  });
  
  return processed;
}

/**
 * Validate template
 */
export function validateTemplate(template: ChatTemplate): {
  valid: boolean;
  errors: string[];
} {
  const errors: string[] = [];

  if (!template.title || template.title.trim() === '') {
    errors.push('Title tidak boleh kosong');
  }

  if (!template.template || template.template.trim() === '') {
    errors.push('Template tidak boleh kosong');
  }

  if (template.template && template.template.length > 4096) {
    errors.push('Template terlalu panjang (max 4096 karakter)');
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

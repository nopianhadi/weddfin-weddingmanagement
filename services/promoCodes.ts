import supabase from '../lib/supabaseClient';
import { PromoCode } from '../types';

const TABLE = 'promo_codes';

export async function listPromoCodes(): Promise<PromoCode[]> {
  const { data, error } = await supabase.from(TABLE).select('*').order('code');
  if (error) throw error;
  return (data || []).map(normalizePromo);
}

export async function createPromoCode(payload: Omit<PromoCode, 'id' | 'usageCount'> & { usageCount?: number }): Promise<PromoCode> {
  const { data, error } = await supabase
    .from(TABLE)
    .insert([denormalizePromo(payload)])
    .select('*')
    .single();
  if (error) throw error;
  return normalizePromo(data);
}

export async function updatePromoCode(id: string, patch: Partial<PromoCode>): Promise<PromoCode> {
  const { data, error } = await supabase
    .from(TABLE)
    .update(denormalizePromo(patch))
    .eq('id', id)
    .select('*')
    .single();
  if (error) throw error;
  return normalizePromo(data);
}

export async function deletePromoCode(id: string): Promise<void> {
  const { error } = await supabase.from(TABLE).delete().eq('id', id);
  if (error) throw error;
}

function normalizePromo(row: any): PromoCode {
  return {
    id: row.id,
    code: row.code,
    discountType: row.discount_type,
    discountValue: Number(row.discount_value),
    isActive: !!row.is_active,
    usageCount: Number(row.usage_count || 0),
    maxUsage: row.max_usage ?? undefined,
    expiryDate: row.expiry_date ?? undefined,
    createdAt: row.created_at ?? undefined,
  };
}

function denormalizePromo(obj: Partial<PromoCode & { usageCount?: number }>): any {
  return {
    ...(obj.code !== undefined ? { code: obj.code } : {}),
    ...(obj.discountType !== undefined ? { discount_type: obj.discountType } : {}),
    ...(obj.discountValue !== undefined ? { discount_value: obj.discountValue } : {}),
    ...(obj.isActive !== undefined ? { is_active: obj.isActive } : {}),
    ...(obj.usageCount !== undefined ? { usage_count: obj.usageCount } : {}),
    ...(obj.maxUsage !== undefined ? { max_usage: obj.maxUsage } : {}),
    ...(obj.expiryDate !== undefined ? { expiry_date: obj.expiryDate } : {}),
  };
}

import supabase from '../lib/supabaseClient';

export type CardRow = {
  id: string;
  card_holder_name: string;
  bank_name: string;
  card_type: string;
  last_four_digits: string;
  expiry_date: string | null;
  balance: number;
  color_gradient: string | null;
};

export async function listCards(): Promise<CardRow[]> {
  const { data, error } = await supabase.from('cards').select('*').order('bank_name');
  if (error) throw error;
  return data || [];
}

export async function findCardIdByMeta(bankName: string, lastFourDigits: string): Promise<string | null> {
  const { data, error } = await supabase
    .from('cards')
    .select('id')
    .eq('bank_name', bankName)
    .eq('last_four_digits', lastFourDigits)
    .maybeSingle();
  if (error) return null;
  return data?.id ?? null;
}

export async function createCard(input: {
  card_holder_name: string;
  bank_name: string;
  card_type: string;
  last_four_digits: string;
  expiry_date?: string | null;
  balance?: number;
  color_gradient?: string | null;
}): Promise<CardRow> {
  const payload = {
    card_holder_name: input.card_holder_name,
    bank_name: input.bank_name,
    card_type: input.card_type,
    last_four_digits: input.last_four_digits,
    expiry_date: input.expiry_date ?? null,
    balance: input.balance ?? 0,
    color_gradient: input.color_gradient ?? null,
  };
  const { data, error } = await supabase.from('cards').insert([payload]).select('*').single();
  if (error) throw error;
  return data as CardRow;
}

export async function updateCard(id: string, patch: Partial<CardRow>): Promise<CardRow> {
  const payload: any = {
    ...(patch.card_holder_name !== undefined ? { card_holder_name: patch.card_holder_name } : {}),
    ...(patch.bank_name !== undefined ? { bank_name: patch.bank_name } : {}),
    ...(patch.card_type !== undefined ? { card_type: patch.card_type } : {}),
    ...(patch.last_four_digits !== undefined ? { last_four_digits: patch.last_four_digits } : {}),
    ...(patch.expiry_date !== undefined ? { expiry_date: patch.expiry_date } : {}),
    ...(patch.balance !== undefined ? { balance: patch.balance } : {}),
    ...(patch.color_gradient !== undefined ? { color_gradient: patch.color_gradient } : {}),
  };
  const { data, error } = await supabase.from('cards').update(payload).eq('id', id).select('*').single();
  if (error) throw error;
  return data as CardRow;
}

export async function deleteCard(id: string): Promise<void> {
  const { error } = await supabase.from('cards').delete().eq('id', id);
  if (error) throw error;
}

// Safely delete a card by first detaching references, then deleting the card.
export async function safeDeleteCard(id: string): Promise<void> {
  // 1) Nullify references in transactions
  const { error: txErr } = await supabase
    .from('transactions')
    .update({ card_id: null })
    .eq('card_id', id);
  if (txErr) throw txErr;

  // 2) Nullify references in pockets (if your schema has this column)
  const { error: pkErr } = await supabase
    .from('pockets')
    .update({ source_card_id: null })
    .eq('source_card_id', id);
  if (pkErr) throw pkErr;

  // 3) Delete the card
  const { error } = await supabase.from('cards').delete().eq('id', id);
  if (error) throw error;
}

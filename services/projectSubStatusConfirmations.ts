import supabase from '../lib/supabaseClient';
import { Project } from '../types';

const TABLE = 'projects';

// Helper to normalize project minimal fields needed
function pickConfirmFields(row: any) {
  return {
    confirmedSubStatuses: (row?.confirmed_sub_statuses ?? []) as string[],
    clientSubStatusNotes: (row?.client_sub_status_notes ?? {}) as Record<string, string>,
  };
}

export async function markSubStatusConfirmed(
  projectId: string,
  subStatusName: string,
  note?: string
): Promise<void> {
  // Load current confirmation arrays/maps
  const { data, error } = await supabase
    .from(TABLE)
    .select('confirmed_sub_statuses, client_sub_status_notes')
    .eq('id', projectId)
    .single();
  if (error) throw error;
  const current = pickConfirmFields(data);

  const nextConfirmed = Array.from(new Set([...(current.confirmedSubStatuses || []), subStatusName]));
  const nextNotes = { ...(current.clientSubStatusNotes || {}) } as Record<string, string>;
  if (note) nextNotes[subStatusName] = note;

  const { error: updErr } = await supabase
    .from(TABLE)
    .update({
      confirmed_sub_statuses: nextConfirmed,
      client_sub_status_notes: nextNotes,
    })
    .eq('id', projectId);
  if (updErr) throw updErr;
}

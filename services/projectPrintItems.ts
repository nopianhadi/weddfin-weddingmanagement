import supabase from '../lib/supabaseClient';
import { PrintingItem } from '../types';

const TABLE = 'project_print_items';

function toRow(projectId: string, i: PrintingItem) {
  return {
    project_id: projectId,
    item_type: i.type,
    custom_name: i.customName ?? null,
    details: i.details,
    cost: i.cost ?? 0,
  } as any;
}

function fromRow(row: any): PrintingItem {
  return {
    id: row.id,
    type: row.item_type,
    customName: row.custom_name || undefined,
    details: row.details || '',
    cost: Number(row.cost || 0),
  };
}

export async function listPrintItemsByProject(projectId: string): Promise<PrintingItem[]> {
  const { data, error } = await supabase
    .from(TABLE)
    .select('*')
    .eq('project_id', projectId);
  if (error) throw error;
  return (data || []).map(fromRow);
}

export async function upsertPrintItemsForProject(projectId: string, items: PrintingItem[]): Promise<void> {
  const { error: delErr } = await supabase.from(TABLE).delete().eq('project_id', projectId);
  if (delErr) throw delErr;
  if (!items || items.length === 0) return;
  const rows = items.map(i => toRow(projectId, i));
  const { error: insErr } = await supabase.from(TABLE).insert(rows);
  if (insErr) throw insErr;
}

export async function deletePrintItemsByProject(projectId: string): Promise<void> {
  const { error } = await supabase.from(TABLE).delete().eq('project_id', projectId);
  if (error) throw error;
}

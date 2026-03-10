import supabase, { supabase as client } from '../lib/supabaseClient';

// Categories we care about and their normalized labels
const CATEGORY_PRINTING = 'Cetak Album';
const CATEGORY_TRANSPORT = 'Transportasi';

function normalizeCategory(raw?: string | null): string | null {
  if (!raw) return null;
  const s = raw.trim().toLowerCase();
  if (s.includes('cetak')) return CATEGORY_PRINTING;
  if (s.startsWith('transport')) return CATEGORY_TRANSPORT;
  if (s === 'transportasi') return CATEGORY_TRANSPORT;
  return raw; // leave others as-is
}

async function main() {
  console.log('[Normalize] Start normalization for project cost transactions...');

  // 1) Load projects (id, project_name)
  const { data: projects, error: projErr } = await client
    .from('projects')
    .select('id, project_name')
    .order('date', { ascending: false });
  if (projErr) throw projErr;

  const projectNameById = new Map<string, string>();
  for (const p of projects || []) projectNameById.set(p.id, p.project_name);

  // 2) Load transactions that are linked to a project or likely printing/transport
  const { data: txRows, error: txErr } = await client
    .from('transactions')
    .select('id, description, category, project_id')
    .or('not.project_id.is.null,category.ilike.%cetak%,category.ilike.%transport%');
  if (txErr) throw txErr;

  let updatedCount = 0;
  let skipped = 0;
  for (const tx of txRows || []) {
    const projectId: string | null = tx.project_id;
    if (!projectId) { skipped++; continue; }
    const projectName = projectNameById.get(projectId);
    if (!projectName) { skipped++; continue; }

    const normalizedCategory = normalizeCategory(tx.category);

    // Only standardize when it is a printing or transport category
    if (normalizedCategory !== CATEGORY_PRINTING && normalizedCategory !== CATEGORY_TRANSPORT) {
      skipped++; continue;
    }

    const desiredDescription = `${normalizedCategory} - ${projectName}`;
    const needCategoryUpdate = tx.category !== normalizedCategory;
    const needDescriptionUpdate = (tx.description || '').trim() !== desiredDescription;

    if (!needCategoryUpdate && !needDescriptionUpdate) { skipped++; continue; }

    const payload: any = {};
    if (needCategoryUpdate) payload.category = normalizedCategory;
    if (needDescriptionUpdate) payload.description = desiredDescription;

    const { error: updErr } = await client
      .from('transactions')
      .update(payload)
      .eq('id', tx.id);
    if (updErr) {
      console.warn('[Normalize] Failed to update tx', tx.id, updErr.message);
      continue;
    }
    updatedCount++;
  }

  console.log(`[Normalize] Done. Updated ${updatedCount} rows, skipped ${skipped}.`);
}

main().catch((e) => {
  console.error('[Normalize] Fatal error:', e);
  process.exitCode = 1;
});

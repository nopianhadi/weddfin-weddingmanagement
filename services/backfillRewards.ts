import { listAllTeamPayments } from './teamProjectPayments';
import { listRewardLedgerEntries, createRewardLedgerEntry } from './rewardLedger';
import { listPockets, updatePocket } from './pockets';
import { PocketType, RewardLedgerEntry } from '../types';

export interface BackfillResult {
  createdCount: number;
  totalReward: number;
  createdEntries: RewardLedgerEntry[];
}

// Backfill reward ledger entries from already Paid team_project_payments rows with reward > 0
// Avoid duplicates by matching on (teamMemberId, projectId, amount)
export async function backfillRewardsForPaidTeamPayments(): Promise<BackfillResult> {
  const payments = await listAllTeamPayments();
  const ledger = await listRewardLedgerEntries();

  const existingKey = new Set(
    ledger.map(l => `${l.teamMemberId}|${l.projectId || ''}|${Number(l.amount || 0)}`)
  );

  const candidates = payments.filter(p => p.status === 'Paid' && (p.reward || 0) > 0);

  const toCreate = candidates.filter(p => {
    const key = `${p.teamMemberId}|${p.projectId}|${Number(p.reward || 0)}`;
    return !existingKey.has(key);
  });

  const createdEntries: RewardLedgerEntry[] = [];
  for (const p of toCreate) {
    try {
      const entry = await createRewardLedgerEntry({
        teamMemberId: p.teamMemberId,
        date: new Date().toISOString().split('T')[0],
        description: `Backfill hadiah untuk proyek (ID: ${p.projectId})`,
        amount: p.reward || 0,
        projectId: p.projectId,
      });
      createdEntries.push(entry);
    } catch (e) {
      // continue others
      console.warn('[Backfill] Failed creating ledger for payment', p, e);
    }
  }

  const totalReward = createdEntries.reduce((s, e) => s + (e.amount || 0), 0);

  if (totalReward > 0) {
    try {
      const pockets = await listPockets();
      const rewardPocket = pockets.find(p => p.type === PocketType.REWARD_POOL);
      if (rewardPocket) {
        await updatePocket(rewardPocket.id, { amount: (rewardPocket.amount || 0) + totalReward });
      }
    } catch (e) {
      console.warn('[Backfill] Failed updating REWARD_POOL pocket by', totalReward, e);
    }
  }

  return { createdCount: createdEntries.length, totalReward, createdEntries };
}

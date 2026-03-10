
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

const envContent = fs.readFileSync(path.join(__dirname, '.env'), 'utf8');
const env = {};
envContent.split('\n').forEach(line => {
    const [key, value] = line.split('=');
    if (key && value) {
        env[key.trim()] = value.trim().replace(/^"(.*)"$/, '$1');
    }
});

const supabaseUrl = env.VITE_SUPABASE_URL;
const supabaseKey = env.VITE_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function repairData() {
    try {
        // 1. Get projects with amount_paid but no transactions
        console.log('Fetching projects and transactions...');
        const { data: projects } = await supabase.from('projects').select('id, project_name, amount_paid, date');
        const { data: cards } = await supabase.from('cards').select('id');
        const cardId = cards?.[0]?.id;

        for (const p of projects) {
            if (p.amount_paid > 0) {
                const { count } = await supabase.from('transactions').select('*', { count: 'exact', head: true }).eq('project_id', p.id);
                if (count === 0) {
                    console.log(`Repairing project: ${p.project_name}`);
                    const { data: tx, error: txErr } = await supabase.from('transactions').insert([{
                        date: p.date,
                        description: `Historical Payment: ${p.project_name}`,
                        amount: p.amount_paid,
                        type: 'Pemasukan',
                        project_id: p.id,
                        category: 'Pelunasan Acara',
                        method: 'Transfer Bank',
                        card_id: cardId
                    }]).select('*').single();

                    if (txErr) {
                        console.error(`Failed to create transaction for ${p.project_name}:`, txErr);
                    } else {
                        console.log(`Created transaction ${tx.id} for ${p.project_name}`);
                        // Also update card balance if we assigned a card
                        if (cardId) {
                            const { data: cardData } = await supabase.from('cards').select('balance').eq('id', cardId).single();
                            const newBalance = (cardData?.balance || 0) + p.amount_paid;
                            await supabase.from('cards').update({ balance: newBalance }).eq('id', cardId);
                            console.log(`Updated card ${cardId} balance to ${newBalance}`);
                        }
                    }
                }
            }
        }
        console.log('Repair complete.');
    } catch (err) {
        console.error('Repair Error:', err);
    }
}

repairData();


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

async function listTables() {
    try {
        // We can't query pg_tables with anon key usually.
        // But we can try to query common tables and see which respond.
        const tables = [
            'projects', 'clients', 'transactions', 'cards', 'pockets', 'leads',
            'team_members', 'add_ons', 'profiles', 'client_feedback', 'promo_codes',
            'packages', 'project_team_assignments', 'project_add_ons', 'reward_ledger',
            'team_payment_records'
        ];

        console.log('--- Table Status Report ---');
        for (const table of tables) {
            const { error } = await supabase.from(table).select('count', { count: 'exact', head: true });
            if (error) {
                if (error.code === 'PGRST204' || error.message.includes('not find the table')) {
                    console.log(`[MISSING] ${table}`);
                } else {
                    console.log(`[ERROR ] ${table}: ${error.code} - ${error.message}`);
                }
            } else {
                console.log(`[EXISTS ] ${table}`);
            }
        }
    } catch (err) {
        console.error('Execution Error:', err);
    }
}

listTables();

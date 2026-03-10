
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// Read .env manually since dotenv might not be available or working as expected
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

if (!supabaseUrl || !supabaseKey) {
    console.error('Missing Supabase environment variables');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkData() {
    try {
        const { data: transactions, error: tErr } = await supabase.from('transactions').select('*');
        const { data: cards, error: cErr } = await supabase.from('cards').select('*');
        const { data: pockets, error: pErr } = await supabase.from('pockets').select('*');

        if (tErr) console.error('Transactions Error:', tErr);
        if (cErr) console.error('Cards Error:', cErr);
        if (pErr) console.error('Pockets Error:', pErr);

        console.log('Transactions count:', transactions?.length);
        console.log('Cards count:', cards?.length);
        console.log('Pockets count:', pockets?.length);

        if (transactions?.length > 0) {
            console.log('First 5 transactions summary:');
            transactions.slice(0, 5).forEach(t => console.log(`- ${t.date}: ${t.description} (${t.amount})`));
        } else {
            console.log('No transactions found in table.');
        }
    } catch (err) {
        console.error('Execution Error:', err);
    }
}

checkData();

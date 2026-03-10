
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

async function checkRPC() {
    try {
        // Try calling the RPC with dummy data to see if it exists
        const { error } = await supabase.rpc('create_transaction_with_balance_update', {
            p_transaction_data: {},
            p_card_id: '00000000-0000-0000-0000-000000000000',
            p_amount_delta: 0
        });

        if (error) {
            console.log('RPC check error:', error.message, error.code);
            if (error.code === 'PGRST202') {
                console.log('RPC does NOT exist (404/PGRST202)');
            }
        } else {
            console.log('RPC seems to exist (or at least was found)');
        }
    } catch (err) {
        console.error('Execution Error:', err);
    }
}

checkRPC();

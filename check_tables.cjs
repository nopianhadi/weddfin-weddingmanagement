
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

async function checkTables() {
    try {
        // Try to list tables by querying pg_tables (might fail with anon key)
        // Fallback: try common table names
        const tables = ['transactions', 'cards', 'pockets', 'leads', 'projects', 'clients', 'team_members', 'add_ons', 'profiles', 'client_feedback', 'promo_codes'];

        for (const table of tables) {
            const { data, count, error } = await supabase.from(table).select('*', { count: 'exact', head: true });
            if (error) {
                console.log(`Table '${table}': ERROR (${error.message})`);
            } else {
                console.log(`Table '${table}': EXISTS (count: ${count})`);
            }
        }
    } catch (err) {
        console.error('Execution Error:', err);
    }
}

checkTables();

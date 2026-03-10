
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

async function inspect() {
    const envPath = path.join(__dirname, '.env');
    const env = fs.readFileSync(envPath, 'utf8');
    const url = env.match(/VITE_SUPABASE_URL=(.*)/)[1].trim();
    const key = env.match(/VITE_SUPABASE_ANON_KEY=(.*)/)[1].trim();

    const supabase = createClient(url, key);

    console.log('Inspecting team_members table...');
    const { data: columns, error } = await supabase.rpc('inspect_table_columns', { table_name: 'team_members' });

    if (error) {
        console.error('Error with RPC:', error);
        // Fallback: try a simple select
        const { data, error: selectError } = await supabase.from('team_members').select('*').limit(1);
        if (selectError) {
            console.error('Error with select:', selectError);
        } else {
            console.log('Columns from select:', Object.keys(data[0] || {}));
        }
    } else {
        console.log('Columns:', columns);
    }
}

inspect();

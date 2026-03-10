import { createClient } from '@supabase/supabase-js'
import fs from 'fs'
import path from 'path'

// Load from .env
const envPath = path.resolve(process.cwd(), '.env');
const envContent = fs.readFileSync(envPath, 'utf8');
const env = {};
envContent.split('\n').forEach(line => {
    const [key, ...value] = line.split('=');
    if (key && value.length > 0) {
        env[key.trim()] = value.join('=').trim();
    }
});

const supabaseUrl = env.VITE_SUPABASE_URL;
const supabaseKey = env.VITE_SUPABASE_ANON_KEY;

console.log('Testing connection to:', supabaseUrl);

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkTables() {
    // Try to query a common table to see if it exists and RLS allows it
    const { data, error } = await supabase
        .from('team_members')
        .select('*')
        .limit(1);

    if (error) {
        console.error('Connection Error:', error.message);
    } else {
        console.log('✅ Connection Successful!');
        console.log('Sample data from team_members:', data);

        // Try to see if we can see columns
        const { data: colData, error: colError } = await supabase
            .rpc('get_table_columns', { table_name: 'team_members' }); // Likely won't work unless RPC exists

        if (colError) {
            console.log('Note: RPC column check failed (intended).');
        }
    }
}

checkTables();

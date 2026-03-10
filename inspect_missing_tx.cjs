
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

async function inspectData() {
    try {
        const { data: projects, error: pErr } = await supabase.from('projects').select('id, project_name, amount_paid, date');
        if (pErr) throw pErr;

        console.log(`Found ${projects.length} projects.`);
        for (const p of projects) {
            if (p.amount_paid > 0) {
                const { count, error: tErr } = await supabase.from('transactions').select('*', { count: 'exact', head: true }).eq('project_id', p.id);
                console.log(`Project "${p.project_name}" (ID: ${p.id}): amount_paid=${p.amount_paid}, transaction_count=${count}`);
            }
        }
    } catch (err) {
        console.error('Execution Error:', err);
    }
}

inspectData();


const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

async function testInsert() {
    const envPath = path.join(__dirname, '.env');
    const env = fs.readFileSync(envPath, 'utf8');
    const url = env.match(/VITE_SUPABASE_URL=(.*)/)[1].trim();
    const key = env.match(/VITE_SUPABASE_ANON_KEY=(.*)/)[1].trim();

    const supabase = createClient(url, key);

    console.log('Testing insert into team_members...');
    const payload = {
        name: 'Test Member',
        role: 'Admin',
        email: 'test@example.com',
        phone: '12345',
        standard_fee: 0,
        portal_access_id: 'test-uuid-' + Date.now()
    };

    const { data, error } = await supabase
        .from('team_members')
        .insert([payload])
        .select('*');

    if (error) {
        console.error('Error:', error);
    } else {
        console.log('Success:', data);
    }
}

testInsert();

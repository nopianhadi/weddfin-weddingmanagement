import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';

// Manual env parsing as dotenv might not be available or behave differently in ESM
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

if (!supabaseUrl || !supabaseKey) {
    console.error('Missing Supabase URL or Anon Key in .env');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function setup() {
    console.log('Ensuring gallery-images bucket exists...');

    // Note: createBucket usually requires a Service Role key or specific RLS policies.
    // anon key might fail depending on your Supabase settings.
    const { data, error } = await supabase.storage.createBucket('gallery-images', {
        public: true
    });

    if (error) {
        if (error.message.includes('already exists')) {
            console.log('Bucket already exists.');
        } else {
            console.error('Error creating bucket:', error.message);
            console.log('\nTIP: If you see "Unauthorized" or "Forbidden", please create the bucket manually in the Supabase Dashboard:');
            console.log('1. Go to Supabase Dashboard -> Storage');
            console.log('2. Click "New Bucket"');
            console.log('3. Name it: gallery-images');
            console.log('4. Make it: Public');
        }
    } else {
        console.log('Bucket created successfully.');
    }
}

setup();

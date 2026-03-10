import pkg from 'pg';
const { Client } = pkg;

async function checkBucketRLS() {
    const client = new Client('postgresql://postgres:Gedangburuk22@db.gpqlyqktdujyqbnyxhmf.supabase.co:5432/postgres');

    try {
        await client.connect();

        // Check RLS on storage.buckets table itself
        const rlsCheck = await client.query(`
            SELECT relrowsecurity FROM pg_class c
            JOIN pg_namespace n ON n.oid = c.relnamespace
            WHERE n.nspname = 'storage' AND c.relname = 'buckets'
        `);
        console.log('RLS on storage.buckets:', rlsCheck.rows[0]?.relrowsecurity);

        // Check policies on storage.buckets
        const policies = await client.query(`
            SELECT policyname, cmd FROM pg_policies 
            WHERE schemaname = 'storage' AND tablename = 'buckets'
        `);
        console.log('Policies on storage.buckets:');
        policies.rows.forEach(p => console.log(`  - ${p.policyname} (${p.cmd})`));

        // Try adding policy to allow reading buckets
        try {
            await client.query(`
                CREATE POLICY "allow_bucket_select" ON storage.buckets FOR SELECT USING (true);
            `);
            console.log('Added bucket SELECT policy.');
        } catch (e) {
            if (e.message.includes('already exists')) {
                console.log('Bucket SELECT policy already exists.');
            } else {
                console.warn('Could not add bucket SELECT policy:', e.message);
            }
        }

        // Check final policies
        const finalPolicies = await client.query(`
            SELECT policyname, cmd FROM pg_policies 
            WHERE schemaname = 'storage' AND tablename = 'buckets'
        `);
        console.log('\nFinal policies on storage.buckets:');
        finalPolicies.rows.forEach(p => console.log(`  - ${p.policyname} (${p.cmd})`));

    } catch (err) {
        console.error('Error:', err.message);
    } finally {
        await client.end();
        console.log('Done.');
    }
}

checkBucketRLS();

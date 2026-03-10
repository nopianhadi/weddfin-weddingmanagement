import pkg from 'pg';
const { Client } = pkg;

async function fixStorage() {
    const client = new Client('postgresql://postgres:Gedangburuk22@db.gpqlyqktdujyqbnyxhmf.supabase.co:5432/postgres');

    try {
        await client.connect();
        console.log('Connected to database.');

        // Check current buckets
        const buckets = await client.query(`SELECT id, name, public, owner FROM storage.buckets ORDER BY name`);
        console.log('\nCurrent buckets in DB:');
        buckets.rows.forEach(b => console.log(`  - id: ${b.id}, name: ${b.name}, public: ${b.public}, owner: ${b.owner}`));

        // Re-upsert to make sure they are correct
        await client.query(`
            INSERT INTO storage.buckets (id, name, public, avif_autodetection, file_size_limit, allowed_mime_types)
            VALUES 
                ('dp-proofs', 'dp-proofs', true, false, 10485760, ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/jpg', 'application/pdf']),
                ('gallery-images', 'gallery-images', true, false, 10485760, ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/jpg'])
            ON CONFLICT (id) DO UPDATE SET
                public = EXCLUDED.public,
                file_size_limit = EXCLUDED.file_size_limit,
                allowed_mime_types = EXCLUDED.allowed_mime_types;
        `);
        console.log('\nBuckets upserted OK.');

        // Check RLS on storage.objects
        const rlsCheck = await client.query(`
            SELECT relrowsecurity FROM pg_class c
            JOIN pg_namespace n ON n.oid = c.relnamespace
            WHERE n.nspname = 'storage' AND c.relname = 'objects'
        `);
        const rlsEnabled = rlsCheck.rows[0]?.relrowsecurity;
        console.log(`\nRLS on storage.objects enabled: ${rlsEnabled}`);

        if (rlsEnabled) {
            // Check existing policies
            const policies = await client.query(`
                SELECT policyname, cmd, qual FROM pg_policies 
                WHERE schemaname = 'storage' AND tablename = 'objects'
                ORDER BY policyname
            `);
            console.log('\nExisting storage.objects policies:');
            policies.rows.forEach(p => console.log(`  - ${p.policyname} (${p.cmd})`));

            // Drop old partial policies and recreate more permissive ones
            const dropPolicies = [
                'Public gallery images read',
                'Gallery images upload',
                'Gallery images update',
                'Gallery images delete',
                'Public read access for all buckets',
                'Allow upload to all buckets',
                'Allow update in all buckets',
                'Allow delete in all buckets',
            ];

            for (const pName of dropPolicies) {
                try {
                    await client.query(`DROP POLICY IF EXISTS "${pName}" ON storage.objects`);
                } catch (e) {
                    // ignore
                }
            }

            // Create fully open policies
            await client.query(`CREATE POLICY "storage_objects_select_all" ON storage.objects FOR SELECT USING (true)`);
            await client.query(`CREATE POLICY "storage_objects_insert_all" ON storage.objects FOR INSERT WITH CHECK (true)`);
            await client.query(`CREATE POLICY "storage_objects_update_all" ON storage.objects FOR UPDATE USING (true)`);
            await client.query(`CREATE POLICY "storage_objects_delete_all" ON storage.objects FOR DELETE USING (true)`);
            console.log('\nNew fully-open policies created for storage.objects.');
        } else {
            console.log('RLS is disabled on storage.objects - all access allowed without policies.');
        }

        // Final verify
        const finalBuckets = await client.query(`SELECT id, name, public FROM storage.buckets ORDER BY name`);
        console.log('\n=== Final bucket list ===');
        finalBuckets.rows.forEach(b => console.log(`  - ${b.name} (public: ${b.public})`));

    } catch (err) {
        console.error('Error:', err.message);
        console.error(err.stack);
    } finally {
        await client.end();
        console.log('\nDone.');
    }
}

fixStorage();

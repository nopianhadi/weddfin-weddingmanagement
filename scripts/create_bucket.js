import pkg from 'pg';
const { Client } = pkg;

async function createAllBuckets() {
    const client = new Client('postgresql://postgres:Gedangburuk22@db.gpqlyqktdujyqbnyxhmf.supabase.co:5432/postgres');

    try {
        await client.connect();
        console.log('Connected to database.');

        const buckets = [
            { id: 'dp-proofs', name: 'dp-proofs', public: true },
            { id: 'gallery-images', name: 'gallery-images', public: true },
        ];

        for (const bucket of buckets) {
            const check = await client.query(
                `SELECT id FROM storage.buckets WHERE id = $1`, [bucket.id]
            );

            if (check.rows.length > 0) {
                console.log(`Bucket '${bucket.id}' already exists. ✓`);
            } else {
                await client.query(`
                    INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
                    VALUES ($1, $2, $3, 10485760, ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/jpg', 'application/pdf'])
                `, [bucket.id, bucket.name, bucket.public]);
                console.log(`Bucket '${bucket.id}' created! ✓`);
            }
        }

        // Setup permissive RLS policies for each bucket
        const bucketIds = buckets.map(b => `'${b.id}'`).join(', ');

        const policies = [
            {
                name: 'Public read access for all buckets',
                cmd: `CREATE POLICY "Public read access for all buckets" ON storage.objects FOR SELECT USING (bucket_id IN (${bucketIds}))`,
                checkName: 'Public read access for all buckets'
            },
            {
                name: 'Allow upload to all buckets',
                cmd: `CREATE POLICY "Allow upload to all buckets" ON storage.objects FOR INSERT WITH CHECK (bucket_id IN (${bucketIds}))`,
                checkName: 'Allow upload to all buckets'
            },
            {
                name: 'Allow update in all buckets',
                cmd: `CREATE POLICY "Allow update in all buckets" ON storage.objects FOR UPDATE USING (bucket_id IN (${bucketIds}))`,
                checkName: 'Allow update in all buckets'
            },
            {
                name: 'Allow delete in all buckets',
                cmd: `CREATE POLICY "Allow delete in all buckets" ON storage.objects FOR DELETE USING (bucket_id IN (${bucketIds}))`,
                checkName: 'Allow delete in all buckets'
            },
        ];

        for (const policy of policies) {
            try {
                const policyCheck = await client.query(
                    `SELECT 1 FROM pg_policies WHERE schemaname = 'storage' AND tablename = 'objects' AND policyname = $1`,
                    [policy.checkName]
                );
                if (policyCheck.rows.length > 0) {
                    console.log(`Policy '${policy.name}' already exists. ✓`);
                } else {
                    await client.query(policy.cmd);
                    console.log(`Policy '${policy.name}' created! ✓`);
                }
            } catch (pErr) {
                console.warn(`Policy '${policy.name}' skipped: ${pErr.message}`);
            }
        }

        // Verify
        const result = await client.query(`SELECT id, name, public FROM storage.buckets ORDER BY name`);
        console.log('\n=== All Buckets ===');
        result.rows.forEach(b => console.log(` - ${b.name} (public: ${b.public})`));

    } catch (err) {
        console.error('Error:', err.message);
    } finally {
        await client.end();
        console.log('\nDone.');
    }
}

createAllBuckets();

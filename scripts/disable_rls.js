import pkg from 'pg';
const { Client } = pkg;

async function disableRLS() {
    const client = new Client('postgresql://postgres:Gedangburuk22@db.gpqlyqktdujyqbnyxhmf.supabase.co:5432/postgres');

    try {
        await client.connect();
        console.log('Connected to database...');

        // Get all tables in the public schema
        const res = await client.query(`
      SELECT tablename 
      FROM pg_catalog.pg_tables 
      WHERE schemaname = 'public';
    `);

        const tables = res.rows.map(row => row.tablename);
        console.log('Disabling RLS for tables:', tables.join(', '));

        for (const table of tables) {
            await client.query(`ALTER TABLE "${table}" DISABLE ROW LEVEL SECURITY;`);
            // Also add a broad permission for anonymity just in case
            await client.query(`GRANT ALL ON TABLE "${table}" TO anon;`);
            await client.query(`GRANT ALL ON TABLE "${table}" TO authenticated;`);
            await client.query(`GRANT ALL ON TABLE "${table}" TO service_role;`);
        }

        // Also grant usage on schema and sequences
        await client.query(`GRANT USAGE ON SCHEMA public TO anon, authenticated;`);
        await client.query(`GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated;`);

        console.log('RLS disabled and permissions granted for all tables.');
    } catch (err) {
        console.error('Error disabling RLS:', err);
    } finally {
        await client.end();
    }
}

disableRLS();

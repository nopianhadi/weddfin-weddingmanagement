import pkg from 'pg';
const { Client } = pkg;

async function normalizeRegions() {
    const client = new Client('postgresql://postgres:Gedangburuk22@db.gpqlyqktdujyqbnyxhmf.supabase.co:5432/postgres');

    try {
        await client.connect();
        console.log('Connected to database...');

        console.log('Normalizing regions in packages table...');
        await client.query('UPDATE packages SET region = LOWER(TRIM(region)) WHERE region IS NOT NULL');

        console.log('Normalizing regions in add_ons table...');
        await client.query('UPDATE add_ons SET region = LOWER(TRIM(region)) WHERE region IS NOT NULL');

        console.log('Update completed successfully.');

    } catch (err) {
        console.error('Error during normalization:', err);
    } finally {
        await client.end();
    }
}

normalizeRegions();

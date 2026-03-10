import pkg from 'pg';
const { Client } = pkg;
import fs from 'fs';
import path from 'path';

async function runMigration() {
    const client = new Client({
        connectionString: 'postgresql://postgres.gpqlyqktdujyqbnyxhmf:Gedangburuk22@aws-0-us-east-1.pooler.supabase.com:5432/postgres',
        ssl: {
            rejectUnauthorized: false
        }
    });

    try {
        await client.connect();
        console.log('Connected to database via pooler...');

        const sqlPath = path.join(process.cwd(), 'database', '03_add_address_to_tables.sql');
        const sql = fs.readFileSync(sqlPath, 'utf8');

        console.log('Executing SQL: Adding address column to leads, clients, and projects...');
        await client.query(sql);
        console.log('Migration executed successfully.');

    } catch (err) {
        console.error('Error during migration:', err);
    } finally {
        await client.end();
    }
}

runMigration();

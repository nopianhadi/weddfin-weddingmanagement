import pkg from 'pg';
const { Client } = pkg;
import fs from 'fs';
import path from 'path';

async function runSql() {
    const client = new Client('postgresql://postgres:Gedangburuk22@db.gpqlyqktdujyqbnyxhmf.supabase.co:5432/postgres');

    try {
        await client.connect();
        console.log('Connected to database...');

        const sqlPath = path.join(process.cwd(), 'database', '00_master_setup.sql');
        const sql = fs.readFileSync(sqlPath, 'utf8');

        console.log('Executing SQL from 00_master_setup.sql...');
        await client.query(sql);
        console.log('SQL executed successfully.');

    } catch (err) {
        console.error('Error executing SQL:', err);
    } finally {
        await client.end();
    }
}

runSql();

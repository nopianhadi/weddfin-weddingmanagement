import pkg from 'pg';
const { Client } = pkg;
import fs from 'fs';
import path from 'path';

async function runSql() {
    // Using the pooler connection string which likely has an IPv4 address
    // format: postgresql://postgres.[project-ref]:[password]@aws-0-ap-southeast-1.pooler.supabase.com:6543/postgres
    // Using the pooler connection string - session mode on port 5432
    const client = new Client({
        connectionString: 'postgresql://postgres.gpqlyqktdujyqbnyxhmf:Gedangburuk22@aws-0-us-east-1.pooler.supabase.com:5432/postgres',
        ssl: {
            rejectUnauthorized: false
        }
    });

    try {
        await client.connect();
        console.log('Connected to database via pooler...');

        const sqlPath = path.join(process.cwd(), 'database', '02_add_category_to_team_members.sql');
        const sql = fs.readFileSync(sqlPath, 'utf8');

        console.log('Executing SQL from 02_add_category_to_team_members.sql...');
        await client.query(sql);
        console.log('SQL executed successfully.');

    } catch (err) {
        console.error('Error executing SQL:', err);
    } finally {
        await client.end();
    }
}

runSql();

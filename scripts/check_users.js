import pkg from 'pg';
const { Client } = pkg;

async function checkUsers() {
    const client = new Client('postgresql://postgres:Gedangburuk22@db.gpqlyqktdujyqbnyxhmf.supabase.co:5432/postgres');
    try {
        await client.connect();
        const res = await client.query('SELECT id, email, full_name, role FROM users');
        console.log(JSON.stringify(res.rows, null, 2));
    } catch (err) {
        console.error(err);
    } finally {
        await client.end();
    }
}

checkUsers();

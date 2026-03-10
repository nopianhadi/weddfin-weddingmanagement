import pkg from 'pg';
const { Client } = pkg;

async function createMissingTables() {
    const client = new Client('postgresql://postgres:Gedangburuk22@db.gpqlyqktdujyqbnyxhmf.supabase.co:5432/postgres');

    try {
        await client.connect();
        console.log('Connected to database.\n');

        // 1. Create project_team_assignments table
        console.log('Creating project_team_assignments...');
        await client.query(`
            CREATE TABLE IF NOT EXISTS project_team_assignments (
                id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
                project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
                member_id UUID REFERENCES team_members(id) ON DELETE SET NULL,
                member_name TEXT NOT NULL,
                member_role TEXT,
                fee NUMERIC DEFAULT 0,
                reward NUMERIC DEFAULT 0,
                sub_job TEXT,
                created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
            );
        `);
        console.log('  ✓ project_team_assignments created.');

        // Index for faster lookups
        await client.query(`
            CREATE INDEX IF NOT EXISTS idx_project_team_assignments_project_id 
            ON project_team_assignments(project_id);
        `);
        console.log('  ✓ Index on project_id created.');

        // 2. Create project_add_ons table (join table between projects and add_ons)
        console.log('\nCreating project_add_ons...');
        await client.query(`
            CREATE TABLE IF NOT EXISTS project_add_ons (
                id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
                project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
                add_on_id UUID NOT NULL REFERENCES add_ons(id) ON DELETE CASCADE,
                created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
                UNIQUE(project_id, add_on_id)
            );
        `);
        console.log('  ✓ project_add_ons created.');

        // Index for faster lookups
        await client.query(`
            CREATE INDEX IF NOT EXISTS idx_project_add_ons_project_id 
            ON project_add_ons(project_id);
        `);
        console.log('  ✓ Index on project_id created.');

        // 3. Disable RLS on these tables so anon key can access them
        await client.query(`ALTER TABLE project_team_assignments DISABLE ROW LEVEL SECURITY;`);
        await client.query(`ALTER TABLE project_add_ons DISABLE ROW LEVEL SECURITY;`);
        console.log('\n  ✓ RLS disabled on both tables.');

        // 4. Verify tables exist
        const verify = await client.query(`
            SELECT table_name 
            FROM information_schema.tables 
            WHERE table_schema = 'public' 
            AND table_name IN ('project_team_assignments', 'project_add_ons')
            ORDER BY table_name;
        `);
        console.log('\n=== Verified Tables ===');
        verify.rows.forEach(r => console.log(`  ✓ ${r.table_name}`));

        if (verify.rows.length === 2) {
            console.log('\n✅ Both tables created successfully!');
        } else {
            console.log('\n⚠️  Some tables may be missing:', verify.rows);
        }

    } catch (err) {
        console.error('Error:', err.message);
        console.error(err.detail || '');
    } finally {
        await client.end();
        console.log('\nDone.');
    }
}

createMissingTables();

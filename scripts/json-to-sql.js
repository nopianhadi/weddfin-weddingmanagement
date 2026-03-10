/**
 * Script untuk mengkonversi backup JSON ke format SQL
 * Menghasilkan file SQL yang bisa di-import ke PostgreSQL/Supabase
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Escape string untuk SQL
function escapeSQLString(str) {
  if (str === null || str === undefined) return 'NULL';
  if (typeof str === 'boolean') return str ? 'TRUE' : 'FALSE';
  if (typeof str === 'number') return str;
  if (typeof str === 'object') return `'${JSON.stringify(str).replace(/'/g, "''")}'`;
  return `'${String(str).replace(/'/g, "''")}'`;
}

// Konversi array data ke SQL INSERT statements
function generateInsertStatements(tableName, data) {
  if (!data || data.length === 0) {
    return `-- Tabel ${tableName} kosong\n\n`;
  }

  let sql = `-- Tabel: ${tableName} (${data.length} baris)\n`;
  sql += `-- ============================================\n\n`;

  // Ambil kolom dari record pertama
  const columns = Object.keys(data[0]);
  const columnList = columns.join(', ');

  // Generate INSERT statements
  sql += `INSERT INTO ${tableName} (${columnList})\nVALUES\n`;

  const values = data.map((row, index) => {
    const rowValues = columns.map(col => escapeSQLString(row[col])).join(', ');
    const comma = index < data.length - 1 ? ',' : ';';
    return `  (${rowValues})${comma}`;
  });

  sql += values.join('\n');
  sql += '\n\n';

  return sql;
}

// Konversi satu file JSON ke SQL
function convertTableToSQL(backupDir, tableName) {
  const jsonPath = path.join(backupDir, `${tableName}.json`);
  
  if (!fs.existsSync(jsonPath)) {
    console.log(`⚠️  File tidak ditemukan: ${tableName}.json`);
    return '';
  }

  try {
    const data = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));
    console.log(`✅ Konversi: ${tableName} (${data.length} baris)`);
    return generateInsertStatements(tableName, data);
  } catch (error) {
    console.error(`❌ Error pada ${tableName}:`, error.message);
    return `-- Error pada tabel ${tableName}: ${error.message}\n\n`;
  }
}

async function main() {
  // Cari backup folder terbaru
  const backupsDir = path.join(__dirname, '..', 'backups');
  
  if (!fs.existsSync(backupsDir)) {
    console.error('❌ Folder backups tidak ditemukan!');
    process.exit(1);
  }

  const backupFolders = fs.readdirSync(backupsDir)
    .filter(f => f.startsWith('backup-'))
    .sort()
    .reverse();

  if (backupFolders.length === 0) {
    console.error('❌ Tidak ada backup ditemukan!');
    process.exit(1);
  }

  const latestBackup = backupFolders[0];
  const backupDir = path.join(backupsDir, latestBackup);

  console.log('🚀 Konversi JSON ke SQL');
  console.log('📁 Backup:', latestBackup);
  console.log('');

  // Baca summary untuk mendapatkan daftar tabel
  const summaryPath = path.join(backupDir, '_summary.json');
  let tables = [];

  if (fs.existsSync(summaryPath)) {
    const summary = JSON.parse(fs.readFileSync(summaryPath, 'utf8'));
    tables = summary.tables
      .filter(t => t.success && t.rows > 0)
      .map(t => t.name);
  } else {
    // Fallback: scan semua file JSON
    tables = fs.readdirSync(backupDir)
      .filter(f => f.endsWith('.json') && !f.startsWith('_'))
      .map(f => f.replace('.json', ''));
  }

  // Header SQL
  let fullSQL = `-- ============================================\n`;
  fullSQL += `-- Supabase Database Backup - SQL Format\n`;
  fullSQL += `-- ============================================\n`;
  fullSQL += `-- Generated: ${new Date().toISOString()}\n`;
  fullSQL += `-- Source: ${latestBackup}\n`;
  fullSQL += `-- Total Tables: ${tables.length}\n`;
  fullSQL += `-- ============================================\n\n`;

  fullSQL += `-- Disable triggers untuk import lebih cepat\n`;
  fullSQL += `SET session_replication_role = 'replica';\n\n`;

  fullSQL += `-- Begin transaction\n`;
  fullSQL += `BEGIN;\n\n`;

  // Konversi setiap tabel
  for (const tableName of tables) {
    fullSQL += convertTableToSQL(backupDir, tableName);
  }

  // Footer SQL
  fullSQL += `-- Commit transaction\n`;
  fullSQL += `COMMIT;\n\n`;

  fullSQL += `-- Enable triggers kembali\n`;
  fullSQL += `SET session_replication_role = 'origin';\n\n`;

  fullSQL += `-- ============================================\n`;
  fullSQL += `-- Backup selesai!\n`;
  fullSQL += `-- ============================================\n`;

  // Simpan file SQL
  const sqlPath = path.join(backupDir, 'database_backup.sql');
  fs.writeFileSync(sqlPath, fullSQL);

  console.log('');
  console.log('='.repeat(60));
  console.log('✨ Konversi Selesai!');
  console.log('='.repeat(60));
  console.log(`📄 File SQL: ${sqlPath}`);
  console.log(`📊 Total tabel: ${tables.length}`);
  console.log(`💾 Ukuran: ${(fullSQL.length / 1024).toFixed(2)} KB`);
  console.log('='.repeat(60));
  console.log('');
  console.log('🔄 Cara restore:');
  console.log('1. Buka Supabase Dashboard → SQL Editor');
  console.log('2. Copy-paste isi file database_backup.sql');
  console.log('3. Klik "Run" untuk execute');
  console.log('');
  console.log('Atau via psql:');
  console.log(`psql -h db.dvpzxkrfomvrvndgsshk.supabase.co -U postgres -d postgres -f "${sqlPath}"`);
}

main().catch(console.error);

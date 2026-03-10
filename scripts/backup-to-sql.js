/**
 * Script all-in-one: Backup database dan langsung konversi ke SQL
 */

import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Konfigurasi Supabase
const SUPABASE_URL = 'https://dvpzxkrfomvrvndgsshk.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImR2cHp4a3Jmb212cnZuZGdzc2hrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njk1MjQ1NzIsImV4cCI6MjA4NTEwMDU3Mn0.X1u360uaz_k3lg1XlIut1sfda-To5aM1YUAH6vcG3NA';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

const KNOWN_TABLES = [
  'profiles',
  'clients',
  'projects',
  'team_members',
  'leads',
  'calendar_events',
  'packages',
  'promo_codes',
  'notifications'
];

// Escape string untuk SQL
function escapeSQLString(str) {
  if (str === null || str === undefined) return 'NULL';
  if (typeof str === 'boolean') return str ? 'TRUE' : 'FALSE';
  if (typeof str === 'number') return str;
  if (typeof str === 'object') return `'${JSON.stringify(str).replace(/'/g, "''")}'`;
  return `'${String(str).replace(/'/g, "''")}'`;
}

// Generate SQL INSERT statements
function generateInsertStatements(tableName, data) {
  if (!data || data.length === 0) {
    return `-- Tabel ${tableName} kosong\n\n`;
  }

  let sql = `-- Tabel: ${tableName} (${data.length} baris)\n`;
  sql += `-- ============================================\n\n`;

  const columns = Object.keys(data[0]);
  const columnList = columns.join(', ');

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

async function backupTable(tableName) {
  console.log(`📥 Mengunduh: ${tableName}...`);
  
  try {
    const { data, error } = await supabase
      .from(tableName)
      .select('*');
    
    if (error) {
      console.error(`❌ Error: ${tableName}`);
      return { tableName, success: false, error: error.message, count: 0, data: null };
    }
    
    console.log(`✅ Berhasil: ${tableName} (${data.length} baris)`);
    return { tableName, success: true, data, count: data.length };
  } catch (err) {
    console.error(`❌ Exception: ${tableName}`);
    return { tableName, success: false, error: err.message, count: 0, data: null };
  }
}

async function main() {
  console.log('🚀 Backup Database ke SQL\n');
  
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5);
  const backupDir = path.join(__dirname, '..', 'backups', `backup-${timestamp}`);
  
  // Buat folder backup
  if (!fs.existsSync(backupDir)) {
    fs.mkdirSync(backupDir, { recursive: true });
  }
  
  const results = [];
  
  // Backup setiap tabel
  for (const tableName of KNOWN_TABLES) {
    const result = await backupTable(tableName);
    results.push(result);
    
    // Simpan JSON
    if (result.success && result.data) {
      const jsonPath = path.join(backupDir, `${tableName}.json`);
      fs.writeFileSync(jsonPath, JSON.stringify(result.data, null, 2));
    }
    
    await new Promise(resolve => setTimeout(resolve, 100));
  }
  
  // Buat summary
  const summary = {
    timestamp: new Date().toISOString(),
    totalTables: KNOWN_TABLES.length,
    successCount: results.filter(r => r.success).length,
    failedCount: results.filter(r => !r.success).length,
    totalRows: results.reduce((sum, r) => sum + r.count, 0),
    tables: results.map(r => ({
      name: r.tableName,
      success: r.success,
      rows: r.count,
      error: r.error || null
    }))
  };
  
  fs.writeFileSync(
    path.join(backupDir, '_summary.json'),
    JSON.stringify(summary, null, 2)
  );
  
  // Generate SQL
  console.log('\n🔄 Konversi ke SQL...\n');
  
  let fullSQL = `-- ============================================\n`;
  fullSQL += `-- Supabase Database Backup - SQL Format\n`;
  fullSQL += `-- ============================================\n`;
  fullSQL += `-- Generated: ${summary.timestamp}\n`;
  fullSQL += `-- Database: dvpzxkrfomvrvndgsshk.supabase.co\n`;
  fullSQL += `-- Total Tables: ${summary.successCount}\n`;
  fullSQL += `-- Total Rows: ${summary.totalRows}\n`;
  fullSQL += `-- ============================================\n\n`;

  fullSQL += `-- Disable triggers untuk import lebih cepat\n`;
  fullSQL += `SET session_replication_role = 'replica';\n\n`;

  fullSQL += `-- Begin transaction\n`;
  fullSQL += `BEGIN;\n\n`;

  // Generate INSERT untuk setiap tabel
  for (const result of results) {
    if (result.success && result.data && result.data.length > 0) {
      fullSQL += generateInsertStatements(result.tableName, result.data);
    }
  }

  fullSQL += `-- Commit transaction\n`;
  fullSQL += `COMMIT;\n\n`;

  fullSQL += `-- Enable triggers kembali\n`;
  fullSQL += `SET session_replication_role = 'origin';\n\n`;

  fullSQL += `-- ============================================\n`;
  fullSQL += `-- Backup selesai!\n`;
  fullSQL += `-- ============================================\n`;

  // Simpan SQL
  const sqlPath = path.join(backupDir, 'database_backup.sql');
  fs.writeFileSync(sqlPath, fullSQL);
  
  // Tampilkan hasil
  console.log('='.repeat(70));
  console.log('✨ BACKUP SELESAI!');
  console.log('='.repeat(70));
  console.log(`📁 Lokasi: ${backupDir}`);
  console.log(`⏰ Waktu: ${new Date().toLocaleString('id-ID')}`);
  console.log(`✅ Berhasil: ${summary.successCount}/${summary.totalTables} tabel`);
  console.log(`📝 Total baris: ${summary.totalRows.toLocaleString('id-ID')}`);
  console.log(`💾 Ukuran SQL: ${(fullSQL.length / 1024).toFixed(2)} KB`);
  
  console.log('\n📋 Detail per tabel:');
  results.filter(r => r.success).forEach(r => {
    console.log(`   ✓ ${r.tableName.padEnd(20)} : ${r.count.toString().padStart(5)} baris`);
  });
  
  console.log('\n📦 File yang dibuat:');
  console.log(`   • database_backup.sql (${(fullSQL.length / 1024).toFixed(2)} KB)`);
  console.log(`   • _summary.json`);
  console.log(`   • ${summary.successCount} file JSON (per tabel)`);
  
  console.log('\n🔄 Cara restore:');
  console.log('   1. Buka Supabase Dashboard → SQL Editor');
  console.log('   2. Copy-paste isi file database_backup.sql');
  console.log('   3. Klik "Run" untuk execute');
  
  console.log('\n' + '='.repeat(70));
}

main().catch(console.error);

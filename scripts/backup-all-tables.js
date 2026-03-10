/**
 * Script untuk backup SEMUA tabel dari Supabase
 * Otomatis mendeteksi tabel yang ada
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

// Daftar tabel yang berhasil di-backup sebelumnya
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

async function backupTable(tableName) {
  console.log(`📥 Mengunduh tabel: ${tableName}...`);
  
  try {
    const { data, error, count } = await supabase
      .from(tableName)
      .select('*', { count: 'exact' });
    
    if (error) {
      console.error(`❌ Error: ${tableName} - ${error.message}`);
      return { tableName, success: false, error: error.message, count: 0 };
    }
    
    console.log(`✅ Berhasil: ${tableName} (${data.length} baris)`);
    return { tableName, success: true, data, count: data.length };
  } catch (err) {
    console.error(`❌ Exception: ${tableName} - ${err.message}`);
    return { tableName, success: false, error: err.message, count: 0 };
  }
}

async function main() {
  console.log('🚀 Memulai backup database Supabase...\n');
  
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
    
    // Simpan data jika berhasil
    if (result.success && result.data) {
      const filePath = path.join(backupDir, `${tableName}.json`);
      fs.writeFileSync(filePath, JSON.stringify(result.data, null, 2));
    }
    
    // Delay kecil untuk menghindari rate limiting
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
  
  // Simpan summary
  const summaryPath = path.join(backupDir, '_summary.json');
  fs.writeFileSync(summaryPath, JSON.stringify(summary, null, 2));
  
  // Buat SQL-like export (untuk referensi)
  let sqlExport = `-- Supabase Database Backup\n`;
  sqlExport += `-- Generated: ${summary.timestamp}\n`;
  sqlExport += `-- Total Tables: ${summary.successCount}\n`;
  sqlExport += `-- Total Rows: ${summary.totalRows}\n\n`;
  
  for (const result of results) {
    if (result.success && result.data && result.data.length > 0) {
      sqlExport += `-- Table: ${result.tableName} (${result.count} rows)\n`;
      sqlExport += `-- Data available in: ${result.tableName}.json\n\n`;
    }
  }
  
  const sqlPath = path.join(backupDir, 'backup_info.sql');
  fs.writeFileSync(sqlPath, sqlExport);
  
  // Tampilkan hasil
  console.log('\n' + '='.repeat(60));
  console.log('📊 RINGKASAN BACKUP DATABASE');
  console.log('='.repeat(60));
  console.log(`📁 Lokasi: ${backupDir}`);
  console.log(`⏰ Waktu: ${new Date().toLocaleString('id-ID')}`);
  console.log(`✅ Berhasil: ${summary.successCount}/${summary.totalTables} tabel`);
  console.log(`📝 Total baris: ${summary.totalRows.toLocaleString('id-ID')}`);
  console.log('\n📋 Detail per tabel:');
  
  results.filter(r => r.success).forEach(r => {
    console.log(`   ✓ ${r.tableName.padEnd(20)} : ${r.count.toString().padStart(5)} baris`);
  });
  
  if (summary.failedCount > 0) {
    console.log(`\n❌ Tabel yang gagal:`);
    results.filter(r => !r.success).forEach(r => {
      console.log(`   ✗ ${r.tableName}: ${r.error}`);
    });
  }
  
  console.log('\n' + '='.repeat(60));
  console.log('✨ Backup selesai!');
  console.log(`📦 File tersimpan di: backups/backup-${timestamp}/`);
  console.log('='.repeat(60));
  
  // Tanya apakah ingin konversi ke SQL
  console.log('\n💡 Tip: Jalankan "node scripts/json-to-sql.js" untuk konversi ke format SQL');
}

main().catch(console.error);

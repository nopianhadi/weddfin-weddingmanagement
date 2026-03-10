/**
 * Script untuk backup semua tabel dari Supabase
 * Mengunduh data dalam format JSON
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

// Daftar tabel yang akan di-backup
const TABLES = [
  'profiles',
  'clients',
  'projects',
  'tasks',
  'team_members',
  'invoices',
  'payments',
  'expenses',
  'leads',
  'documents',
  'calendar_events',
  'gallery_items',
  'packages',
  'promo_codes',
  'suggestions',
  'notifications',
  'activity_logs',
  'settings',
  'ai_conversations',
  'ai_suggestions'
];

async function backupTable(tableName) {
  console.log(`📥 Mengunduh tabel: ${tableName}...`);
  
  try {
    const { data, error } = await supabase
      .from(tableName)
      .select('*');
    
    if (error) {
      console.error(`❌ Error pada tabel ${tableName}:`, error.message);
      return { tableName, success: false, error: error.message, count: 0 };
    }
    
    console.log(`✅ Berhasil: ${tableName} (${data.length} baris)`);
    return { tableName, success: true, data, count: data.length };
  } catch (err) {
    console.error(`❌ Exception pada tabel ${tableName}:`, err.message);
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
  for (const tableName of TABLES) {
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
    totalTables: TABLES.length,
    successCount: results.filter(r => r.success).length,
    failedCount: results.filter(r => !r.success).length,
    totalRows: results.reduce((sum, r) => sum + r.count, 0),
    tables: results
  };
  
  // Simpan summary
  const summaryPath = path.join(backupDir, '_summary.json');
  fs.writeFileSync(summaryPath, JSON.stringify(summary, null, 2));
  
  // Tampilkan hasil
  console.log('\n' + '='.repeat(50));
  console.log('📊 RINGKASAN BACKUP');
  console.log('='.repeat(50));
  console.log(`📁 Lokasi: ${backupDir}`);
  console.log(`✅ Berhasil: ${summary.successCount}/${summary.totalTables} tabel`);
  console.log(`📝 Total baris: ${summary.totalRows}`);
  
  if (summary.failedCount > 0) {
    console.log(`\n❌ Tabel yang gagal:`);
    results.filter(r => !r.success).forEach(r => {
      console.log(`   - ${r.tableName}: ${r.error}`);
    });
  }
  
  console.log('\n✨ Backup selesai!');
}

main().catch(console.error);

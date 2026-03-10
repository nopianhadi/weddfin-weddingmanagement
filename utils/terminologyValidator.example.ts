/**
 * Example usage of the terminology validation utility
 * 
 * This file demonstrates how to use validateTerminologyConsistency()
 * to check that all wedding industry terminology updates have been
 * applied correctly across the codebase.
 */

import { validateTerminologyConsistency, ValidationResult } from './terminologyValidator';
import * as fs from 'fs';
import * as path from 'path';

/**
 * Example 1: Basic validation with mock data
 */
function exampleBasicValidation() {
  console.log('=== Example 1: Basic Validation ===\n');

  // Create mock file contents for demonstration
  const fileContents = new Map([
    ['components/Clients.tsx', `
      export function Clients() {
        return (
          <div>
            <h1>Data Pengantin</h1>
            <div className="stats">
              <span>Total Paket: {totalPackages}</span>
              <span>Acara Terbaru: {recentEvents}</span>
            </div>
          </div>
        );
      }
    `],
    ['components/Projects.tsx', `
      export function Projects() {
        return (
          <div>
            <h1>Detail Acara</h1>
            <div className="progress">
              <span>Tahapan Pengerjaan: {progress}</span>
            </div>
          </div>
        );
      }
    `]
  ]);

  const result = validateTerminologyConsistency(fileContents);

  if (result.success) {
    console.log('✓ All terminology is correct!');
  } else {
    console.log('✗ Issues found:');
    result.issues.forEach(issue => {
      console.log(`  - ${issue.file}: ${issue.issue}`);
      if (issue.term) {
        console.log(`    Term: ${issue.term}`);
      }
      if (issue.line) {
        console.log(`    Line: ${issue.line}`);
      }
    });
  }
  console.log();
}

/**
 * Example 2: Detecting old terminology
 */
function exampleDetectOldTerminology() {
  console.log('=== Example 2: Detecting Old Terminology ===\n');

  // File with old terminology that should be flagged
  const fileContents = new Map([
    ['components/Clients.tsx', `
      export function Clients() {
        return (
          <div>
            <h1>Klien Pengantin</h1>
            <div className="stats">
              <span>Total Nilai Proyek: {totalValue}</span>
            </div>
          </div>
        );
      }
    `]
  ]);

  const result = validateTerminologyConsistency(fileContents);

  console.log(`Success: ${result.success}`);
  console.log(`Issues found: ${result.issues.length}\n`);

  result.issues.forEach((issue, index) => {
    console.log(`Issue ${index + 1}:`);
    console.log(`  File: ${issue.file}`);
    console.log(`  Problem: ${issue.issue}`);
    console.log(`  Old term: ${issue.term}`);
    console.log(`  Line: ${issue.line || 'N/A'}`);
    console.log();
  });
}

/**
 * Example 3: Reading actual files from the filesystem (Node.js only)
 * 
 * Note: This example requires Node.js fs module and won't work in browser
 */
async function exampleReadActualFiles() {
  console.log('=== Example 3: Validating Actual Files ===\n');

  const targetFiles = [
    'components/Clients.tsx',
    'components/Projects.tsx',
    'components/Dashboard.tsx',
    'components/ClientPortal.tsx',
    'components/ClientKPI.tsx'
  ];

  const fileContents = new Map<string, string>();

  // Read each file
  for (const file of targetFiles) {
    try {
      const filePath = path.join(process.cwd(), file);
      const content = fs.readFileSync(filePath, 'utf-8');
      fileContents.set(file, content);
      console.log(`✓ Read ${file}`);
    } catch (error) {
      console.log(`✗ Could not read ${file}: ${error}`);
    }
  }

  console.log();

  // Validate
  const result = validateTerminologyConsistency(fileContents);

  if (result.success) {
    console.log('✓ All files passed validation!');
  } else {
    console.log(`✗ Found ${result.issues.length} issue(s):\n`);
    result.issues.forEach((issue, index) => {
      console.log(`${index + 1}. ${issue.file}`);
      console.log(`   ${issue.issue}`);
      if (issue.term) console.log(`   Term: "${issue.term}"`);
      if (issue.line) console.log(`   Line: ${issue.line}`);
      console.log();
    });
  }
}

/**
 * Example 4: Integration into a build/CI pipeline
 */
function exampleCIPipeline() {
  console.log('=== Example 4: CI Pipeline Integration ===\n');

  const fileContents = new Map([
    ['components/Clients.tsx', 'const title = "Data Pengantin";'],
    ['components/Projects.tsx', 'const title = "Detail Acara";']
  ]);

  const result = validateTerminologyConsistency(fileContents);

  // Exit with error code if validation fails (useful for CI)
  if (!result.success) {
    console.error('Terminology validation failed!');
    console.error('Issues:');
    result.issues.forEach(issue => {
      console.error(`  ${issue.file}: ${issue.issue}`);
    });
    process.exit(1);
  }

  console.log('✓ Terminology validation passed');
  process.exit(0);
}

/**
 * Example 5: Custom validation report
 */
function exampleCustomReport() {
  console.log('=== Example 5: Custom Validation Report ===\n');

  const fileContents = new Map([
    ['components/Clients.tsx', 'const old = "Klien Pengantin"; const new = "Data Pengantin";'],
    ['components/Projects.tsx', 'const title = "Detail Acara";']
  ]);

  const result = validateTerminologyConsistency(fileContents);

  // Generate a detailed report
  const report = {
    timestamp: new Date().toISOString(),
    filesChecked: fileContents.size,
    success: result.success,
    issueCount: result.issues.length,
    issues: result.issues.map(issue => ({
      file: issue.file,
      type: issue.issue,
      term: issue.term,
      line: issue.line
    }))
  };

  console.log('Validation Report:');
  console.log(JSON.stringify(report, null, 2));
}

// Run examples
if (require.main === module) {
  console.log('Wedding Industry Terminology Validator - Examples\n');
  console.log('='.repeat(60));
  console.log();

  exampleBasicValidation();
  exampleDetectOldTerminology();
  exampleCustomReport();

  // Uncomment to run file system example (requires actual files)
  // exampleReadActualFiles();

  // Uncomment to test CI pipeline integration
  // exampleCIPipeline();
}

export {
  exampleBasicValidation,
  exampleDetectOldTerminology,
  exampleReadActualFiles,
  exampleCIPipeline,
  exampleCustomReport
};

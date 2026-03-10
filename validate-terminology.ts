import { validateTerminologyConsistency } from './utils/terminologyValidator';
import * as fs from 'fs';
import * as path from 'path';

const TARGET_FILES = [
  'constants.tsx',
  'components/Clients.tsx',
  'components/Projects.tsx',
  'components/Dashboard.tsx',
  'components/ClientPortal.tsx',
  'components/ClientKPI.tsx',
  'components/Booking.tsx',
  'components/CalendarView.tsx',
  'components/FreelancerPortal.tsx'
];

async function runValidation() {
  console.log('🔍 Running terminology validation...\n');
  
  const fileContents = new Map<string, string>();
  
  // Read all target files
  for (const file of TARGET_FILES) {
    try {
      const filePath = path.join(process.cwd(), file);
      const content = fs.readFileSync(filePath, 'utf-8');
      fileContents.set(file, content);
      console.log(`✓ Read ${file}`);
    } catch (error) {
      console.log(`✗ Could not read ${file}: ${error}`);
    }
  }
  
  console.log('\n📋 Validating terminology consistency...\n');
  
  // Run validation
  const result = validateTerminologyConsistency(fileContents);
  
  if (result.success) {
    console.log('✅ SUCCESS! All terminology has been updated correctly.\n');
    console.log('No old terminology found in any target files.');
    console.log('Navigation labels are consistent with page titles.');
  } else {
    console.log(`❌ VALIDATION FAILED! Found ${result.issues.length} issue(s):\n`);
    
    result.issues.forEach((issue, index) => {
      console.log(`${index + 1}. ${issue.file}`);
      console.log(`   Issue: ${issue.issue}`);
      if (issue.term) console.log(`   Term: "${issue.term}"`);
      if (issue.line) console.log(`   Line: ${issue.line}`);
      console.log('');
    });
  }
  
  return result;
}

runValidation().then(result => {
  process.exit(result.success ? 0 : 1);
}).catch(err => {
  console.error('Error running validation:', err);
  process.exit(1);
});

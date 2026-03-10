import { TERMINOLOGY_CHANGES, NAV_ITEMS } from '../constants';
import { ViewType } from '../types';

/**
 * Represents an issue found during terminology validation
 */
export interface ValidationIssue {
  file: string;
  issue: string;
  term?: string;
  line?: number;
}

/**
 * Result of terminology validation
 */
export interface ValidationResult {
  success: boolean;
  issues: ValidationIssue[];
}

/**
 * Target files that should be checked for terminology consistency
 */
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

/**
 * Validates that all terminology updates have been applied correctly across the codebase.
 * 
 * This function performs the following checks:
 * 1. Scans all target files for any remaining old terminology
 * 2. Verifies consistency between navigation labels and page titles
 * 3. Returns a structured result with any issues found
 * 
 * @param fileContents - Map of file paths to their content
 * @returns ValidationResult with success status and list of issues
 * 
 * @example
 * ```typescript
 * const fileContents = new Map([
 *   ['components/Clients.tsx', clientsContent],
 *   ['components/Projects.tsx', projectsContent]
 * ]);
 * const result = validateTerminologyConsistency(fileContents);
 * if (!result.success) {
 *   console.error('Validation issues:', result.issues);
 * }
 * ```
 */
export function validateTerminologyConsistency(
  fileContents: Map<string, string>
): ValidationResult {
  const issues: ValidationIssue[] = [];

  // Check 1: Verify no old terminology remains in target files
  for (const [filePath, content] of fileContents.entries()) {
    // Only check files that are in our target list
    const isTargetFile = TARGET_FILES.some(targetFile => 
      filePath.endsWith(targetFile) || filePath.includes(targetFile)
    );
    
    if (!isTargetFile) {
      continue;
    }

    // Check each terminology change
    for (const change of TERMINOLOGY_CHANGES) {
      // Only check files that are supposed to have this change
      const shouldCheckFile = change.files.some(changeFile => 
        filePath.endsWith(changeFile) || filePath.includes(changeFile)
      );

      if (!shouldCheckFile) {
        continue;
      }

      // Check if old term still exists in the file
      if (content.includes(change.oldTerm)) {
        // Find line number for better reporting
        const lines = content.split('\n');
        const lineNumber = lines.findIndex(line => line.includes(change.oldTerm));
        
        issues.push({
          file: filePath,
          issue: 'Old terminology still present',
          term: change.oldTerm,
          line: lineNumber >= 0 ? lineNumber + 1 : undefined
        });
      }
    }
  }

  // Check 2: Verify navigation labels match corresponding page titles
  const navigationConsistencyIssues = checkNavigationConsistency(fileContents);
  issues.push(...navigationConsistencyIssues);

  return {
    success: issues.length === 0,
    issues
  };
}

/**
 * Checks that navigation labels are consistent with their corresponding page titles.
 * 
 * For example, if the navigation shows "Data Pengantin", the Clients page should
 * also use "Data Pengantin" as its title.
 * 
 * @param fileContents - Map of file paths to their content
 * @returns Array of validation issues found
 */
function checkNavigationConsistency(
  fileContents: Map<string, string>
): ValidationIssue[] {
  const issues: ValidationIssue[] = [];

  // Define expected consistency between navigation and pages
  const consistencyChecks = [
    {
      view: ViewType.CLIENTS,
      navLabel: 'Data Pengantin',
      pageFile: 'components/Clients.tsx',
      expectedInPage: 'Data Pengantin'
    },
    {
      view: ViewType.PROJECTS,
      navLabel: 'Acara Wedding',
      pageFile: 'components/Projects.tsx',
      expectedInPage: 'Detail Acara'
    }
  ];

  for (const check of consistencyChecks) {
    // Find the navigation item
    const navItem = NAV_ITEMS.find(item => item.view === check.view);
    
    if (!navItem) {
      issues.push({
        file: 'constants.tsx',
        issue: `Navigation item for ${check.view} not found`
      });
      continue;
    }

    // Check if navigation label matches expected
    if (navItem.label !== check.navLabel) {
      issues.push({
        file: 'constants.tsx',
        issue: `Navigation label mismatch for ${check.view}`,
        term: `Expected "${check.navLabel}", found "${navItem.label}"`
      });
    }

    // Check if page content includes expected terminology
    for (const [filePath, content] of fileContents.entries()) {
      if (filePath.endsWith(check.pageFile) || filePath.includes(check.pageFile)) {
        if (!content.includes(check.expectedInPage)) {
          issues.push({
            file: filePath,
            issue: `Page does not contain expected terminology "${check.expectedInPage}"`,
            term: check.expectedInPage
          });
        }
      }
    }
  }

  return issues;
}

/**
 * Helper function to read file contents for validation.
 * This is a placeholder that should be implemented based on the runtime environment.
 * 
 * In a Node.js environment, this would use fs.readFileSync.
 * In a browser environment, this might use fetch or other APIs.
 * 
 * @param filePaths - Array of file paths to read
 * @returns Promise resolving to a Map of file paths to their content
 */
export async function readFilesForValidation(
  filePaths: string[]
): Promise<Map<string, string>> {
  const fileContents = new Map<string, string>();
  
  // This is a placeholder implementation
  // In a real scenario, you would read files from the filesystem
  // For now, we return an empty map
  // The actual implementation would depend on the runtime environment
  
  return fileContents;
}

/**
 * Convenience function to validate all target files.
 * Reads the files and performs validation in one call.
 * 
 * @returns Promise resolving to ValidationResult
 */
export async function validateAllFiles(): Promise<ValidationResult> {
  const fileContents = await readFilesForValidation(TARGET_FILES);
  return validateTerminologyConsistency(fileContents);
}

# Terminology Validation Utility

## Overview

The `terminologyValidator` utility provides functions to validate that all wedding industry terminology updates have been applied correctly across the codebase. It ensures consistency between old project management terms and new wedding-specific terms.

## Purpose

This utility was created as part of the wedding industry terminology update initiative to:

1. **Verify completeness**: Ensure no old terminology remains in target files
2. **Check consistency**: Verify navigation labels match corresponding page titles
3. **Provide feedback**: Return detailed information about any issues found

## Key Features

- ✅ Scans all target files for remaining old terminology
- ✅ Checks navigation-to-page consistency
- ✅ Reports specific file paths, line numbers, and problematic terms
- ✅ Supports both synchronous and asynchronous validation
- ✅ Fully typed with TypeScript
- ✅ Comprehensive test coverage

## Installation

The utility is located in `utils/terminologyValidator.ts` and can be imported directly:

```typescript
import { validateTerminologyConsistency } from './utils/terminologyValidator';
```

## API Reference

### `validateTerminologyConsistency(fileContents: Map<string, string>): ValidationResult`

Main validation function that checks all terminology updates.

**Parameters:**
- `fileContents`: Map of file paths to their content

**Returns:**
- `ValidationResult` object with:
  - `success`: boolean indicating if validation passed
  - `issues`: array of `ValidationIssue` objects

**Example:**
```typescript
const fileContents = new Map([
  ['components/Clients.tsx', clientsContent],
  ['components/Projects.tsx', projectsContent]
]);

const result = validateTerminologyConsistency(fileContents);

if (!result.success) {
  console.error('Validation failed:', result.issues);
}
```

### `readFilesForValidation(filePaths: string[]): Promise<Map<string, string>>`

Helper function to read file contents for validation (placeholder implementation).

**Parameters:**
- `filePaths`: Array of file paths to read

**Returns:**
- Promise resolving to Map of file paths to content

### `validateAllFiles(): Promise<ValidationResult>`

Convenience function that reads all target files and validates them.

**Returns:**
- Promise resolving to `ValidationResult`

## Types

### `ValidationResult`

```typescript
interface ValidationResult {
  success: boolean;
  issues: ValidationIssue[];
}
```

### `ValidationIssue`

```typescript
interface ValidationIssue {
  file: string;        // File path where issue was found
  issue: string;       // Description of the issue
  term?: string;       // The problematic term (if applicable)
  line?: number;       // Line number (if available)
}
```

## Terminology Mappings

The validator checks for the following terminology changes:

| Old Term | New Term | Context | Files |
|----------|----------|---------|-------|
| Klien Pengantin | Data Pengantin | navigation | constants.tsx, Clients.tsx |
| Detail Proyek | Detail Acara | page-title | Projects.tsx, ClientPortal.tsx |
| Proyek Terbaru | Acara Terbaru | table-header | Clients.tsx, Dashboard.tsx |
| Total Nilai Proyek | Total Paket | label | Clients.tsx, ClientPortal.tsx, ClientKPI.tsx |
| Progres Sub-Status | Tahapan Pengerjaan | label | Projects.tsx |
| Pekerjaan Wedding | Acara Wedding | navigation | constants.tsx |

## Target Files

The validator checks the following files:

- `constants.tsx`
- `components/Clients.tsx`
- `components/Projects.tsx`
- `components/Dashboard.tsx`
- `components/ClientPortal.tsx`
- `components/ClientKPI.tsx`
- `components/Booking.tsx`
- `components/CalendarView.tsx`
- `components/FreelancerPortal.tsx`

## Usage Examples

### Example 1: Basic Validation

```typescript
import { validateTerminologyConsistency } from './utils/terminologyValidator';

const fileContents = new Map([
  ['components/Clients.tsx', 'const title = "Data Pengantin";']
]);

const result = validateTerminologyConsistency(fileContents);

if (result.success) {
  console.log('✓ All terminology is correct!');
} else {
  console.log('✗ Issues found:', result.issues);
}
```

### Example 2: Detecting Issues

```typescript
const fileContents = new Map([
  ['components/Clients.tsx', 'const title = "Klien Pengantin";'] // Old term!
]);

const result = validateTerminologyConsistency(fileContents);

result.issues.forEach(issue => {
  console.log(`File: ${issue.file}`);
  console.log(`Issue: ${issue.issue}`);
  console.log(`Term: ${issue.term}`);
  console.log(`Line: ${issue.line}`);
});
```

### Example 3: CI/CD Integration

```typescript
import { validateAllFiles } from './utils/terminologyValidator';

async function validateInCI() {
  const result = await validateAllFiles();
  
  if (!result.success) {
    console.error('Terminology validation failed!');
    result.issues.forEach(issue => {
      console.error(`  ${issue.file}: ${issue.issue}`);
    });
    process.exit(1);
  }
  
  console.log('✓ Terminology validation passed');
}

validateInCI();
```

## Testing

The utility includes comprehensive tests in `utils/terminologyValidator.test.ts`.

Run tests with:

```bash
npm test -- utils/terminologyValidator.test.ts --run
```

Test coverage includes:
- ✅ Successful validation with correct terminology
- ✅ Detection of old terminology
- ✅ Multiple issues in a single file
- ✅ File filtering (only checks target files)
- ✅ Line number reporting
- ✅ Navigation consistency checks
- ✅ Edge cases (empty files, missing files)

## Validation Checks

### Check 1: Old Terminology Detection

Scans each target file for any remaining old terminology. For each terminology change:
1. Checks if the file is in the list of files that should have this change
2. Searches for the old term in the file content
3. Reports the file, term, and line number if found

### Check 2: Navigation Consistency

Verifies that navigation labels match their corresponding page titles:
- **Clients page**: Navigation shows "Data Pengantin" → Page should contain "Data Pengantin"
- **Projects page**: Navigation shows "Acara Wedding" → Page should contain "Detail Acara"

## Requirements Validation

This utility validates the following requirements from the spec:

- **Requirement 5.1**: All occurrences of old terms are replaced
- **Requirement 5.2**: No instances of old terminology remain
- **Requirement 6.1**: Verify no old terminology remains in target files
- **Requirement 6.2**: Verify navigation labels match page titles
- **Requirement 6.3**: Return ValidationResult with success status
- **Requirement 6.4**: Provide file paths and specific terms that need attention

## Limitations

1. **Static Analysis Only**: The validator performs static text analysis and cannot detect terminology in dynamically generated content
2. **Exact String Matching**: Uses simple string matching, not semantic analysis
3. **File System Access**: The `readFilesForValidation` function is a placeholder and needs implementation based on the runtime environment

## Future Enhancements

Potential improvements for future versions:

- [ ] Support for regex-based pattern matching
- [ ] Integration with AST parsing for more accurate detection
- [ ] Support for internationalization (i18n) files
- [ ] Automated fixing of detected issues
- [ ] HTML report generation
- [ ] Integration with pre-commit hooks

## Related Files

- `constants.tsx` - Contains `TERMINOLOGY_CHANGES` configuration
- `utils/terminologyValidator.test.ts` - Test suite
- `utils/terminologyValidator.example.ts` - Usage examples
- `.kiro/specs/wedding-industry-terminology/` - Full specification

## Support

For questions or issues with the terminology validator:

1. Check the examples in `terminologyValidator.example.ts`
2. Review the test cases in `terminologyValidator.test.ts`
3. Refer to the design document in `.kiro/specs/wedding-industry-terminology/design.md`

## License

Part of the wedding management system codebase.

import { describe, it, expect } from 'vitest';
import { validateTerminologyConsistency, ValidationResult } from './terminologyValidator';

describe('validateTerminologyConsistency', () => {
  it('returns success when no old terminology is found', () => {
    const fileContents = new Map([
      ['components/Clients.tsx', 'const title = "Data Pengantin"; const label = "Total Paket";'],
      ['components/Projects.tsx', 'const title = "Detail Acara"; const progress = "Tahapan Pengerjaan";']
    ]);

    const result = validateTerminologyConsistency(fileContents);

    expect(result.success).toBe(true);
    expect(result.issues).toHaveLength(0);
  });

  it('detects old terminology in target files', () => {
    const fileContents = new Map([
      ['components/Clients.tsx', 'const title = "Klien Pengantin"; const label = "Total Paket";']
    ]);

    const result = validateTerminologyConsistency(fileContents);

    expect(result.success).toBe(false);
    expect(result.issues.length).toBeGreaterThan(0);
    expect(result.issues[0].term).toBe('Klien Pengantin');
    expect(result.issues[0].issue).toBe('Old terminology still present');
  });

  it('detects multiple old terms in a single file', () => {
    const fileContents = new Map([
      ['components/Clients.tsx', 'const title = "Klien Pengantin"; const value = "Total Nilai Proyek"; const recent = "Proyek Terbaru";']
    ]);

    const result = validateTerminologyConsistency(fileContents);

    expect(result.success).toBe(false);
    // Should detect 3 old terms + 1 navigation consistency issue = 4 issues
    expect(result.issues.length).toBeGreaterThanOrEqual(3);
  });

  it('only checks files specified in TERMINOLOGY_CHANGES', () => {
    const fileContents = new Map([
      ['components/SomeOtherComponent.tsx', 'const title = "Klien Pengantin";']
    ]);

    const result = validateTerminologyConsistency(fileContents);

    // Should succeed because SomeOtherComponent.tsx is not in target files
    expect(result.success).toBe(true);
    expect(result.issues).toHaveLength(0);
  });

  it('reports line numbers when old terminology is found', () => {
    const fileContents = new Map([
      ['components/Clients.tsx', 'const x = 1;\nconst title = "Klien Pengantin";\nconst y = 2;']
    ]);

    const result = validateTerminologyConsistency(fileContents);

    expect(result.success).toBe(false);
    expect(result.issues[0].line).toBe(2);
  });

  it('checks navigation consistency with page content', () => {
    const fileContents = new Map([
      ['components/Clients.tsx', 'const title = "Wrong Title";']
    ]);

    const result = validateTerminologyConsistency(fileContents);

    expect(result.success).toBe(false);
    const navIssue = result.issues.find(issue => 
      issue.issue.includes('does not contain expected terminology')
    );
    expect(navIssue).toBeDefined();
  });

  it('handles empty file contents', () => {
    const fileContents = new Map<string, string>();

    const result = validateTerminologyConsistency(fileContents);

    // Should succeed because no files to check means no issues found
    expect(result.success).toBe(true);
  });

  it('validates all terminology changes are applied', () => {
    const fileContents = new Map([
      ['components/Clients.tsx', 'const title = "Data Pengantin"; const total = "Total Paket"; const recent = "Acara Terbaru";'],
      ['components/Projects.tsx', 'const detail = "Detail Acara"; const progress = "Tahapan Pengerjaan";'],
      ['components/Dashboard.tsx', 'const recent = "Acara Terbaru";'],
      ['components/ClientPortal.tsx', 'const detail = "Detail Acara"; const total = "Total Paket";'],
      ['components/ClientKPI.tsx', 'const total = "Total Paket";'],
      ['constants.tsx', 'label: "Data Pengantin", label: "Acara Wedding"']
    ]);

    const result = validateTerminologyConsistency(fileContents);

    // Should succeed if all new terminology is present
    expect(result.success).toBe(true);
  });
});

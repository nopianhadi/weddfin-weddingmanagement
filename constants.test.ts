import { describe, it, expect } from 'vitest';
import { cleanPhoneNumber } from './constants';

describe('cleanPhoneNumber', () => {
  it('returns empty string for undefined', () => {
    expect(cleanPhoneNumber(undefined)).toBe('');
  });

  it('strips non-digits and prefixes 62 for local number', () => {
    expect(cleanPhoneNumber('08123456789')).toBe('628123456789');
  });

  it('adds 62 if not starting with 0 or 62', () => {
    expect(cleanPhoneNumber('8123456789')).toBe('628123456789');
  });

  it('keeps 62 prefix as-is', () => {
    expect(cleanPhoneNumber('628123456789')).toBe('628123456789');
  });

  it('removes spaces and dashes', () => {
    expect(cleanPhoneNumber('0812-3456-7890')).toBe('6281234567890');
  });
});

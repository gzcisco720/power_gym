/** @jest-environment node */
import { validateEmail, validateMobile, validatePassword } from '@/lib/validation/user';

describe('validateEmail', () => {
  it('returns null for a valid email address', () => {
    expect(validateEmail('user@example.com')).toBeNull();
  });

  it('returns null for a valid email with subdomain', () => {
    expect(validateEmail('user@mail.example.co.uk')).toBeNull();
  });

  it('returns an error string for an address missing the @ symbol', () => {
    expect(validateEmail('notanemail.com')).toBe('Invalid email format');
  });

  it('returns an error string for an address missing the domain part', () => {
    expect(validateEmail('user@')).toBe('Invalid email format');
  });

  it('returns an error for an empty string', () => {
    expect(validateEmail('')).toBe('Email is required');
  });

  it('returns an error for a whitespace-only string', () => {
    expect(validateEmail('   ')).toBe('Email is required');
  });
});

describe('validateMobile', () => {
  it('returns null for undefined (field is optional)', () => {
    expect(validateMobile(undefined as unknown as string)).toBeNull();
  });

  it('returns null for an empty string (field is optional)', () => {
    expect(validateMobile('')).toBeNull();
  });

  it('returns null for a valid 10-digit mobile number', () => {
    expect(validateMobile('1234567890')).toBeNull();
  });

  it('returns null for a valid number with spaces and dashes', () => {
    expect(validateMobile('+1 800-555-0199')).toBeNull();
  });

  it('returns null for a number at the 7-digit minimum', () => {
    expect(validateMobile('1234567')).toBeNull();
  });

  it('returns null for a number at the 15-digit maximum', () => {
    expect(validateMobile('123456789012345')).toBeNull();
  });

  it('returns an error for a number with fewer than 7 digits', () => {
    expect(validateMobile('123456')).toBe('Mobile number must be 7–15 digits');
  });

  it('returns an error for a number with more than 15 digits', () => {
    expect(validateMobile('1234567890123456')).toBe('Mobile number must be 7–15 digits');
  });
});

describe('validatePassword', () => {
  it('returns null for a valid password with uppercase and digit', () => {
    expect(validatePassword('Password1')).toBeNull();
  });

  it('returns null for a longer valid password', () => {
    expect(validatePassword('MyStr0ngPass!')).toBeNull();
  });

  it('returns an error for a password shorter than 8 characters', () => {
    expect(validatePassword('Ab1')).toBe(
      'Password must be at least 8 characters with 1 uppercase letter and 1 number',
    );
  });

  it('returns an error for a password with no uppercase letter', () => {
    expect(validatePassword('password1')).toBe(
      'Password must be at least 8 characters with 1 uppercase letter and 1 number',
    );
  });

  it('returns an error for a password with no digit', () => {
    expect(validatePassword('PasswordNoNum')).toBe(
      'Password must be at least 8 characters with 1 uppercase letter and 1 number',
    );
  });

  it('returns an error for an empty string', () => {
    expect(validatePassword('')).toBe(
      'Password must be at least 8 characters with 1 uppercase letter and 1 number',
    );
  });
});

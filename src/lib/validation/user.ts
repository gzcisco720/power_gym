export const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
export const MOBILE_RE = /^[0-9\s+\-().]{7,20}$/;
export const PASSWORD_RE = /^(?=.*[A-Z])(?=.*\d).{8,}$/;

export function validateEmail(email: string): string | null {
  if (!email.trim()) return 'Email is required';
  if (!EMAIL_RE.test(email.trim())) return 'Invalid email format';
  return null;
}

export function validateMobile(mobile: string): string | null {
  if (!mobile) return null;
  const digits = mobile.replace(/\D/g, '');
  if (digits.length < 7 || digits.length > 15) return 'Mobile number must be 7–15 digits';
  if (!MOBILE_RE.test(mobile)) return 'Invalid mobile format';
  return null;
}

export function validatePassword(password: string): string | null {
  if (!PASSWORD_RE.test(password)) {
    return 'Password must be at least 8 characters with 1 uppercase letter and 1 number';
  }
  return null;
}

/**
 * Client-side checks for instant inline feedback. They mirror the server rules
 * (backend/src/schemas), but the server stays the source of truth.
 * Each returns an error message, or null when the value is fine.
 */

export function validateEmail(value: string): string | null {
  const v = value.trim();
  if (!v) return 'Email is required';
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v)) return 'Enter a valid email address';
  return null;
}

export function validatePassword(value: string): string | null {
  if (!value) return 'Password is required';
  if (value.length < 8) return 'Password must be at least 8 characters';
  if (value.length > 128) return 'Password must be at most 128 characters';
  if (!/[A-Za-z]/.test(value)) return 'Password must contain a letter';
  if (!/\d/.test(value)) return 'Password must contain a number';
  return null;
}

export function validateConfirmPassword(password: string, confirm: string): string | null {
  if (!confirm) return 'Please confirm your password';
  if (password !== confirm) return "Passwords don't match";
  return null;
}

export function validateName(value: string): string | null {
  const v = value.trim().replace(/\s+/g, ' ');
  if (!v) return 'Name is required';
  if (v.length < 2) return 'Name must be at least 2 characters';
  if (v.length > 80) return 'Name must be at most 80 characters';
  if (!/^[\p{L}\p{M} .'-]+$/u.test(v)) return "Name can only contain letters, spaces, . ' and -";
  return null;
}

/** The field holds only the 10 digits after the fixed +91 prefix. */
export function validateMobile(digits: string): string | null {
  if (!digits) return 'Mobile number is required';
  if (!/^[6-9]\d{9}$/.test(digits)) return 'Enter a valid 10-digit Indian mobile number';
  return null;
}

export function validateAddress(value: string): string | null {
  const v = value.trim();
  if (!v) return 'Address is required';
  if (v.length < 10) return 'Address must be at least 10 characters';
  if (v.length > 300) return 'Address must be at most 300 characters';
  return null;
}

export function validateBusinessName(value: string): string | null {
  return value.trim().length > 100 ? 'Business name must be at most 100 characters' : null;
}

/** "test.user@example.com" -> "te•••@example.com" for display on the OTP screen. */
export function maskEmail(email: string): string {
  const [local = '', domain = ''] = email.split('@');
  return `${local.slice(0, 2)}•••@${domain}`;
}

/** "+919876543210" -> "+91 98765 43210" */
export function formatMobile(e164: string): string {
  const d = e164.replace(/^\+91/, '');
  return d.length === 10 ? `+91 ${d.slice(0, 5)} ${d.slice(5)}` : e164;
}

import { z } from 'zod';

export const emailSchema = z
  .string({ required_error: 'Email is required' })
  .trim()
  .toLowerCase()
  .min(1, 'Email is required')
  .max(254, 'Email is too long')
  .email('Enter a valid email address');

/** At least 8 characters with a letter and a number; capped because argon2 input is unbounded. */
export const passwordSchema = z
  .string({ required_error: 'Password is required' })
  .min(8, 'Password must be at least 8 characters')
  .max(128, 'Password must be at most 128 characters')
  .regex(/[A-Za-z]/, 'Password must contain a letter')
  .regex(/\d/, 'Password must contain a number');

export const otpCodeSchema = z
  .string({ required_error: 'Code is required' })
  .trim()
  .regex(/^\d{6}$/, 'Enter the 6-digit code from your email');

export const registerSchema = z.object({ email: emailSchema, password: passwordSchema });

/** Login only checks presence: the password rules may change, but old passwords must still work. */
export const loginSchema = z.object({
  email: emailSchema,
  password: z.string({ required_error: 'Password is required' }).min(1, 'Password is required').max(128),
});

export const verifyEmailSchema = z.object({ email: emailSchema, code: otpCodeSchema });
export const resendOtpSchema = z.object({ email: emailSchema });

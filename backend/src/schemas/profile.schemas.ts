import { z } from 'zod';

/**
 * Accepts the common ways people type an Indian mobile number:
 *   "9876543210", "98765 43210", "+91 98765-43210", "919876543210", "09876543210"
 * and returns it in E.164 form: "+919876543210". Returns null if it is not a valid
 * Indian mobile number (10 digits starting with 6-9).
 */
export function normalizeIndianMobile(input: string): string | null {
  let digits = input.replace(/[\s\-().]/g, '');
  if (digits.startsWith('+91')) digits = digits.slice(3);
  else if (digits.length === 12 && digits.startsWith('91')) digits = digits.slice(2);
  else if (digits.length === 11 && digits.startsWith('0')) digits = digits.slice(1);
  return /^[6-9]\d{9}$/.test(digits) ? `+91${digits}` : null;
}

const collapseSpaces = (s: string) => s.trim().replace(/\s+/g, ' ');

export const profileSchema = z.object({
  name: z
    .string({ required_error: 'Name is required' })
    .transform(collapseSpaces)
    .pipe(
      z
        .string()
        .min(2, 'Name must be at least 2 characters')
        .max(80, 'Name must be at most 80 characters')
        .regex(/^[\p{L}\p{M} .'-]+$/u, 'Name can only contain letters, spaces, . \' and -'),
    ),
  mobile: z
    .string({ required_error: 'Mobile number is required' })
    .transform((v, ctx) => {
      const normalized = normalizeIndianMobile(v);
      if (!normalized) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'Enter a valid 10-digit Indian mobile number',
        });
        return z.NEVER;
      }
      return normalized;
    }),
  address: z
    .string({ required_error: 'Address is required' })
    .trim()
    .min(10, 'Address must be at least 10 characters')
    .max(300, 'Address must be at most 300 characters'),
  // Optional: most PadosiPro customers are households, not businesses (see DESIGN.md).
  businessName: z
    .string()
    .transform(collapseSpaces)
    .pipe(z.string().max(100, 'Business name must be at most 100 characters'))
    .nullish()
    .transform((v) => (v ? v : null)),
});

export type ProfileInput = z.infer<typeof profileSchema>;

/**
 * Every error the API returns has the shape
 *   { "error": { "code": "OTP_EXPIRED", "message": "...", "details"?: {...}, "fields"?: {...} } }
 * so the app can switch on `code` and show `message` directly to the user.
 */
export type ErrorCode =
  | 'VALIDATION_ERROR'
  | 'EMAIL_TAKEN'
  | 'INVALID_CREDENTIALS'
  | 'EMAIL_NOT_VERIFIED'
  | 'EMAIL_ALREADY_VERIFIED'
  | 'OTP_INVALID'
  | 'OTP_EXPIRED'
  | 'OTP_LOCKED'
  | 'OTP_NOT_FOUND'
  | 'RESEND_TOO_SOON'
  | 'UNAUTHORIZED'
  | 'PROFILE_REQUIRED'
  | 'UNKNOWN_TASKS'
  | 'NOT_FOUND'
  | 'RATE_LIMITED'
  | 'EMAIL_DELIVERY_FAILED'
  | 'INTERNAL_ERROR';

export class AppError extends Error {
  constructor(
    public readonly status: number,
    public readonly code: ErrorCode,
    message: string,
    public readonly details?: Record<string, unknown>,
    public readonly fields?: Record<string, string>,
  ) {
    super(message);
    this.name = 'AppError';
  }
}

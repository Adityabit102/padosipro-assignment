import type { ZodError, ZodTypeAny, z } from 'zod';
import { AppError } from '../lib/errors';

/** Turns Zod issues into a { field: firstMessage } map the app can show under each input. */
export function toFieldErrors(error: ZodError): Record<string, string> {
  const fields: Record<string, string> = {};
  for (const issue of error.issues) {
    const key = issue.path.join('.') || '_';
    fields[key] ??= issue.message;
  }
  return fields;
}

/** Parses untrusted input or throws a 400 VALIDATION_ERROR listing every bad field. */
export function parse<S extends ZodTypeAny>(schema: S, input: unknown): z.output<S> {
  const result = schema.safeParse(input ?? {});
  if (!result.success) {
    const fields = toFieldErrors(result.error);
    const first = Object.values(fields)[0] ?? 'Invalid input';
    throw new AppError(400, 'VALIDATION_ERROR', first, undefined, fields);
  }
  return result.data;
}

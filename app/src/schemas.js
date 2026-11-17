import { z } from 'zod';
import { normalizeEmail, normalizePassword } from './auth.js';

const LETTER_REGEX = /\p{L}/u;
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * Task 4 Step 6: Request Boundary Schemas
 *
 * Placed at the HTTP boundary immediately after body parsing.
 * Incoming requests are parsed and validated BEFORE any downstream
 * business logic, credential hashing, database queries, or external calls.
 *
 * Schemas enforce:
 * - Shared normalization (email lowercase/trim, password outer whitespace trim).
 * - Full parity with Task 3 validation rules (name length/letter, 15-code-point password).
 * - Terms of service agreement.
 * - Stripping of unauthorized client-supplied role parameters.
 */

// Custom refine/transforms for canonical normalization with user-friendly error messages
const normalizedEmailField = z
  .string('Please enter your email address.')
  .refine((raw) => raw.trim().length > 0, {
    message: 'Please enter your email address.'
  })
  .transform((val) => normalizeEmail(val))
  .refine((val) => EMAIL_REGEX.test(val), {
    message: 'Please enter a valid email address (e.g. name@example.com).'
  });

const signupNameField = z
  .string('Please enter your name so we know who to address.')
  .refine((raw) => raw.trim().length > 0, {
    message: 'Please enter your name so we know who to address.'
  })
  .transform((val) => val.trim())
  .refine((trimmed) => trimmed.length >= 2 && LETTER_REGEX.test(trimmed), {
    message: 'Please enter at least two characters, including a letter, for your name.'
  });

const signupPasswordField = z
  .string('Please choose a password to protect your account.')
  .refine((raw) => raw.length > 0, {
    message: 'Please choose a password to protect your account.'
  })
  .transform((val) => normalizePassword(val))
  .refine((trimmed) => trimmed.length > 0, {
    message: 'Password cannot consist solely of spaces.'
  })
  .refine((trimmed) => Array.from(trimmed).length >= 15, {
    message: 'Password must be at least 15 characters long.'
  });

const termsField = z
  .unknown()
  .refine((val) => val !== undefined && val !== null && val !== '', {
    message: 'You must agree to the Terms of Service to create an account.'
  })
  .transform((val) => val === 'on' || val === 'true' || val === true)
  .refine((val) => val === true, {
    message: 'You must agree to the Terms of Service to create an account.'
  });

const loginPasswordField = z
  .string('Please enter your password.')
  .refine((raw) => raw.length > 0, {
    message: 'Please enter your password.'
  })
  .transform((val) => normalizePassword(val))
  .refine((trimmed) => trimmed.length > 0, {
    message: 'Please enter your password.'
  });

/**
 * Registration (Signup) Boundary Schema
 */
export const SignupSchema = z
  .object({
    name: signupNameField,
    email: normalizedEmailField,
    password: signupPasswordField,
    terms: termsField
  })
  .transform((data) => ({
    name: data.name,
    email: data.email,
    password: data.password,
    termsAccepted: data.terms,
    // Server-assigned customer role: strictly 'client'. Never accepts privileged role from payload.
    role: 'client'
  }));

/**
 * Sign-in (Login) Boundary Schema
 */
export const LoginSchema = z
  .object({
    email: normalizedEmailField,
    password: loginPasswordField
  })
  .transform((data) => ({
    email: data.email,
    password: data.password
  }));

/**
 * Password Reset Boundary Schema
 */
export const ResetSchema = z
  .object({
    email: normalizedEmailField
  })
  .transform((data) => ({
    email: data.email
  }));

/**
 * Recovery Code Boundary Schema (Task 3 Step 5 demonstration form)
 *
 * Mirrors the only client rule in recovery.ejs: the trimmed value must be non-empty.
 * Guidance stays generic: no code format, length, or digit-count hints. The code is
 * validated for shape only and is never echoed or verified (no recovery system exists).
 */
export const RecoverySchema = z
  .object({
    recovery_code: z
      .string('Please enter the code from your recovery message.')
      .transform((val) => val.trim())
      .refine((trimmed) => trimmed.length > 0, {
        message: 'Please enter the code from your recovery message.'
      })
  })
  .transform((data) => ({ recoveryCodeProvided: data.recovery_code.length > 0 }));

/**
 * Order Reference Lookup Boundary Schema (Task 3 Step 4 demonstration forms)
 *
 * Client rules, per version:
 * - text:   pattern="[0-9]*" plus a script that strips non-digits. Empty is permitted.
 *           Value is kept as a string so leading zeros survive (e.g. "0042").
 * - number: type="number" (default value 0, no required attribute). Browsers submit
 *           an empty string or a valid floating-point number string. Empty is permitted.
 *           The raw string is kept (no numeric coercion) for the demonstration.
 * No required-field rule exists on the client, so none is invented here.
 */
const HTML_NUMBER_REGEX = /^-?(\d+|\d*\.\d+)([eE][-+]?\d+)?$/;
const DIGITS_ONLY_REGEX = /^[0-9]*$/;

export const OrderLookupSchema = z
  .object({
    version: z.enum(['number', 'text'], 'Please choose a valid order lookup version.'),
    order_ref: z.string('Please enter the digits of your order reference.')
  })
  .superRefine((data, ctx) => {
    const value = data.order_ref;
    if (value === '') return; // client permits empty
    if (data.version === 'text' && !DIGITS_ONLY_REGEX.test(value)) {
      ctx.addIssue({
        code: 'custom',
        path: ['order_ref'],
        message: 'Please use digits only for the order reference.'
      });
    }
    if (data.version === 'number' && !HTML_NUMBER_REGEX.test(value)) {
      ctx.addIssue({
        code: 'custom',
        path: ['order_ref'],
        message: 'Please enter a valid number for the order reference.'
      });
    }
  })
  .transform((data) => ({ version: data.version, order_ref: data.order_ref }));

export const VerifyCodeSchema = z
  .object({
    email: normalizedEmailField,
    code: z
      .string('Please enter the 6-digit verification code.')
      .transform((s) => s.trim())
      .refine((s) => /^\d{6}$/.test(s), 'Please enter a valid 6-digit verification code.')
  })
  .transform((data) => ({ email: data.email, code: data.code }));

export const ResendVerificationSchema = z
  .object({
    email: normalizedEmailField
  })
  .transform((data) => ({ email: data.email }));

/**
 * Helper to format the first customer-friendly error message from a ZodError.
 *
 * @param {z.ZodError} error
 * @returns {string}
 */
export function getFirstErrorMessage(error) {
  if (!error || !error.issues || error.issues.length === 0) {
    return 'Invalid request submission.';
  }
  return error.issues[0].message;
}

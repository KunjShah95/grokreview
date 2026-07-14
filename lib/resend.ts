import { Resend } from "resend";

let _resend: Resend | null = null;

/**
 * Lazily initialize Resend — avoids throwing at build time when RESEND_API_KEY
 * is not yet available as an environment variable.
 */
export function getResend(): Resend {
  if (!_resend) {
    const apiKey = process.env.RESEND_API_KEY;
    if (!apiKey) {
      throw new Error(
        "Missing RESEND_API_KEY environment variable. " +
        "Set it in .env.local or your deployment environment."
      );
    }
    _resend = new Resend(apiKey);
  }
  return _resend;
}

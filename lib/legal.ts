/**
 * The address people write to about their data or these terms. Set
 * CONTACT_EMAIL on the deployment; the legal pages render it at build.
 */
export const CONTACT_EMAIL = process.env.CONTACT_EMAIL ?? process.env.ENQUIRY_INBOX ?? null;

/** Bump when the substance of either page changes. */
export const LEGAL_UPDATED = '2026-10-02';

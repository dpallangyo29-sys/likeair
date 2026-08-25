// Feature flags — flip these when the app is ready for the next stage.
// Monetization stays HIDDEN by default; wallet/ledger tables exist in the DB
// but the UI does not surface them until we're ready to integrate mobile money.
export const FEATURES = {
  monetization: false, // Wallet, boost, payment CTAs
  mobileMoney: false, // M-Pesa / Tigo Pesa deposit flow
  phoneVerification: false, // OTP verification of phone numbers
  nidaVerification: false, // NIDA lookup / auto-verify
  ads: false, // Sponsored ad units in feed
} as const;

// Shared Google Apps Script webhook used by feedback/unlock/track/email-report
// logging. The script routes on the `type` field in the POST body. Kept
// server-side only — never import this into a client component/bundle.
export const SHEETS_URL =
  "https://script.google.com/macros/s/AKfycbz88inF_BkCMIeHBuiLj-ajjsJKCmEoSKQfygW1FAqmZQMbg6EI5734FqibKmBkfDfdVw/exec";

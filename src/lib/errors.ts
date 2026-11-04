// Browsers word a dropped connection differently: Chrome "Failed to fetch",
// Firefox "NetworkError when attempting to fetch resource", Safari "Load failed".
const NETWORK_ERROR = /failed to fetch|networkerror|load failed|network request failed/i;

/**
 * Turns a Supabase (or fetch) error into a sentence a household member can act on.
 * `duplicateMessage` names what already exists, for call sites that can hit a
 * unique constraint (Postgres 23505).
 */
export function friendlyError(
  error: { message: string; code?: string },
  duplicateMessage = "That already exists.",
): string {
  const message = error.message.trim();
  if (NETWORK_ERROR.test(message)) {
    return "Can't reach the server. Check your internet connection and try again.";
  }
  if (error.code === "23505") {
    return duplicateMessage;
  }
  // 42501: insufficient privilege, which is what an RLS insert violation returns.
  if (error.code === "42501" || /row-level security/i.test(message)) {
    return "You don't have permission to do that.";
  }
  if (error.code === "over_email_send_rate_limit") {
    return "Too many sign-in emails were sent. Wait a few minutes and try again.";
  }
  // An outage page (HTML), an empty body, or auth's bare "HTTP 503".
  if (message === "" || message.startsWith("<") || /^HTTP \d{3}$/.test(message)) {
    return "Something went wrong on the server. Try again in a moment.";
  }
  return message;
}

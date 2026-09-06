const FONNTE_SEND = "https://api.fonnte.com/send";
const SEND_TIMEOUT_MS = 10_000;

/** Sends exactly one direct reply to the user who initiated the conversation. */
export async function sendReply(target: string, message: string): Promise<void> {
  const token = process.env.FONNTE_TOKEN;
  if (!token) throw new Error("Fonnte is not configured");

  const response = await fetch(FONNTE_SEND, {
    method: "POST",
    headers: {
      Authorization: token,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ target, message, countryCode: "62" }),
    signal: AbortSignal.timeout(SEND_TIMEOUT_MS),
  });

  if (!response.ok) {
    throw new Error(`Fonnte send failed with HTTP ${response.status}`);
  }
}

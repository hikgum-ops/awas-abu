import { secretsMatch } from "./auth";

export type OperatorAuth =
  | { ok: true; operator: string }
  | { ok: false; reason: "missing_configuration" | "unauthorized" };

export function authenticateOperator(headers: Headers): OperatorAuth {
  const userId = headers.get("oai-authenticated-user-id");
  const email = headers.get("oai-authenticated-user-email")?.trim().toLowerCase();
  const allowedUsers = (process.env.AWASABU_OPERATOR_USER_IDS ?? "")
    .split(",")
    .map((value) => value.trim())
    .filter(Boolean);
  const allowedEmails = (process.env.AWASABU_OPERATOR_EMAILS ?? "")
    .split(",")
    .map((value) => value.trim().toLowerCase())
    .filter(Boolean);

  if (
    (userId && allowedUsers.includes(userId)) ||
    (email && allowedEmails.includes(email))
  ) {
    return {
      ok: true,
      operator: userId ? `chatgpt-${userId.slice(-8)}` : "chatgpt-email",
    };
  }

  const expectedKey = process.env.AWASABU_OPERATOR_KEY;
  if (
    expectedKey &&
    secretsMatch(headers.get("x-operator-key"), expectedKey)
  ) {
    return { ok: true, operator: "api-operator" };
  }

  if (!allowedUsers.length && !allowedEmails.length && !expectedKey) {
    return { ok: false, reason: "missing_configuration" };
  }
  return { ok: false, reason: "unauthorized" };
}

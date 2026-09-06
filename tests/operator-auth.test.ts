import { afterEach, describe, expect, it } from "vitest";
import { authenticateOperator } from "@/lib/awasabu/operator-auth";

const originalUsers = process.env.AWASABU_OPERATOR_USER_IDS;
const originalEmails = process.env.AWASABU_OPERATOR_EMAILS;
const originalKey = process.env.AWASABU_OPERATOR_KEY;

afterEach(() => {
  if (originalUsers === undefined) delete process.env.AWASABU_OPERATOR_USER_IDS;
  else process.env.AWASABU_OPERATOR_USER_IDS = originalUsers;
  if (originalEmails === undefined) delete process.env.AWASABU_OPERATOR_EMAILS;
  else process.env.AWASABU_OPERATOR_EMAILS = originalEmails;
  if (originalKey === undefined) delete process.env.AWASABU_OPERATOR_KEY;
  else process.env.AWASABU_OPERATOR_KEY = originalKey;
});

describe("operator access", () => {
  it("accepts only an allowlisted ChatGPT account", () => {
    process.env.AWASABU_OPERATOR_USER_IDS = "owner-id";
    expect(
      authenticateOperator(new Headers({ "oai-authenticated-user-id": "owner-id" })).ok,
    ).toBe(true);
    expect(
      authenticateOperator(new Headers({ "oai-authenticated-user-id": "other-id" })).ok,
    ).toBe(false);
  });

  it("accepts an allowlisted ChatGPT email without storing it", () => {
    process.env.AWASABU_OPERATOR_EMAILS = "owner@example.com";
    const result = authenticateOperator(
      new Headers({ "oai-authenticated-user-email": "Owner@Example.com" }),
    );
    expect(result).toEqual({ ok: true, operator: "chatgpt-email" });
  });

  it("keeps the high-entropy API key as an optional fallback", () => {
    process.env.AWASABU_OPERATOR_KEY = "correct-secret";
    expect(
      authenticateOperator(new Headers({ "x-operator-key": "correct-secret" })).ok,
    ).toBe(true);
    expect(
      authenticateOperator(new Headers({ "x-operator-key": "wrong-secret" })).ok,
    ).toBe(false);
  });
});

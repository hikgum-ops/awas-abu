import { describe, expect, it } from "vitest";
import { secretsMatch } from "@/lib/awasabu/auth";

describe("secret comparison", () => {
  it("accepts only an exact configured secret", () => {
    expect(secretsMatch("correct-secret", "correct-secret")).toBe(true);
    expect(secretsMatch("wrong-secret", "correct-secret")).toBe(false);
    expect(secretsMatch(null, "correct-secret")).toBe(false);
  });
});

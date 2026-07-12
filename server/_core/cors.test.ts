import { describe, expect, it } from "vitest";
import { isCorsOriginAllowed } from "./cors";

describe("isCorsOriginAllowed", () => {
  it("allows localhost development origins", () => {
    expect(isCorsOriginAllowed("http://localhost:8082")).toBe(true);
    expect(isCorsOriginAllowed("http://127.0.0.1:8082")).toBe(true);
  });

  it("allows the deployed app origin", () => {
    expect(isCorsOriginAllowed("https://as-wryo.onrender.com")).toBe(true);
  });

  it("rejects unexpected origins", () => {
    expect(isCorsOriginAllowed("https://evil.example")).toBe(false);
  });
});

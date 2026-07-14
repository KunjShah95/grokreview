import { describe, it, expect } from "vitest";
import { cn } from "@/lib/utils";

describe("cn (class name utility)", () => {
  it("merges conflicting tailwind classes — last wins", () => {
    expect(cn("px-4 py-2", "px-6")).toBe("py-2 px-6");
    expect(cn("text-red-500", "text-blue-500")).toBe("text-blue-500");
  });

  it("handles conditional classes", () => {
    expect(cn("base", false && "hidden")).toBe("base");
    expect(cn("base", true && "visible")).toBe("base visible");
  });

  it("handles empty and falsy inputs", () => {
    expect(cn()).toBe("");
    expect(cn(null, undefined, "")).toBe("");
  });

  it("handles object syntax", () => {
    expect(cn("foo", { bar: true, baz: false })).toBe("foo bar");
  });

  it("handles arrays of classes", () => {
    expect(cn(["px-2", "py-3"], "mx-1")).toBe("px-2 py-3 mx-1");
  });
});

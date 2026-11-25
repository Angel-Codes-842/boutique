import { describe, expect, it } from "vitest";
import { cn, formatGuarani } from "../utils";

describe("formatGuarani", () => {
  it("formatea 0 como Guaraní", () => {
    expect(formatGuarani(0)).toMatch(/0/);
  });

  it("formatea números positivos", () => {
    expect(formatGuarani(1000)).toMatch(/1\.000/);
    expect(formatGuarani(1500)).toMatch(/1\.500/);
    expect(formatGuarani(50)).toMatch(/50/);
  });

  it("formatea números grandes", () => {
    expect(formatGuarani(1000000)).toMatch(/1\.000\.000/);
    expect(formatGuarani(5000000)).toMatch(/5\.000\.000/);
    expect(formatGuarani(100000000)).toMatch(/100\.000\.000/);
  });
});

describe("cn", () => {
  it("combina clases correctamente", () => {
    expect(cn("px-2", "py-1")).toBe("px-2 py-1");
  });
});

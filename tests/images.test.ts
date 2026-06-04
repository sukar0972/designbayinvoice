import { describe, expect, it } from "vitest";

import { detectLogoImage } from "@/lib/images";

describe("logo image detection", () => {
  it("detects png signatures", () => {
    const bytes = new Uint8Array([
      0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00,
    ]);

    expect(detectLogoImage(bytes)).toEqual({
      mimeType: "image/png",
      extension: "png",
    });
  });

  it("detects jpeg signatures", () => {
    const bytes = new Uint8Array([0xff, 0xd8, 0xff, 0xe0, 0x00]);

    expect(detectLogoImage(bytes)).toEqual({
      mimeType: "image/jpeg",
      extension: "jpg",
    });
  });

  it("detects webp signatures", () => {
    const bytes = new Uint8Array([
      0x52, 0x49, 0x46, 0x46, 0x24, 0x00, 0x00, 0x00, 0x57, 0x45, 0x42, 0x50,
    ]);

    expect(detectLogoImage(bytes)).toEqual({
      mimeType: "image/webp",
      extension: "webp",
    });
  });

  it("rejects svg and random bytes", () => {
    const svg = new TextEncoder().encode('<svg xmlns="http://www.w3.org/2000/svg"></svg>');
    const randomFile = new TextEncoder().encode("not really a png");

    expect(detectLogoImage(svg)).toBeNull();
    expect(detectLogoImage(randomFile)).toBeNull();
  });
});


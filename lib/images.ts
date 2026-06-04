export type SupportedLogoImage = {
  mimeType: "image/png" | "image/jpeg" | "image/webp";
  extension: "png" | "jpg" | "webp";
};

function hasBytes(bytes: Uint8Array, expected: number[], offset = 0) {
  if (bytes.length < offset + expected.length) {
    return false;
  }

  return expected.every((byte, index) => bytes[offset + index] === byte);
}

export function detectLogoImage(bytes: Uint8Array): SupportedLogoImage | null {
  if (hasBytes(bytes, [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])) {
    return {
      mimeType: "image/png",
      extension: "png",
    };
  }

  if (hasBytes(bytes, [0xff, 0xd8, 0xff])) {
    return {
      mimeType: "image/jpeg",
      extension: "jpg",
    };
  }

  if (
    hasBytes(bytes, [0x52, 0x49, 0x46, 0x46]) &&
    hasBytes(bytes, [0x57, 0x45, 0x42, 0x50], 8)
  ) {
    return {
      mimeType: "image/webp",
      extension: "webp",
    };
  }

  return null;
}


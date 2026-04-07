import QRCode from "qrcode";

const MAX_PAYMENT_LINK_LENGTH = 500;
const MAX_QR_BYTES = 1_000_000;

export function isCardPaymentMethod(label?: string | null) {
  return /card/i.test(label?.trim() ?? "");
}

function escapeXml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&apos;");
}

function svgCommand(command: string, x: number, y?: number) {
  return typeof y === "number" ? `${command}${x} ${y}` : `${command}${x}`;
}

function qrModulesToPath(data: Uint8Array, size: number) {
  let path = "";
  let moveBy = 0;
  let newRow = false;
  let lineLength = 0;

  for (let index = 0; index < data.length; index += 1) {
    const column = Math.floor(index % size);
    const row = Math.floor(index / size);

    if (!column && !newRow) {
      newRow = true;
    }

    if (data[index]) {
      lineLength += 1;

      if (!(index > 0 && column > 0 && data[index - 1])) {
        path += newRow
          ? svgCommand("M", column, row + 0.5)
          : svgCommand("m", moveBy, 0);
        moveBy = 0;
        newRow = false;
      }

      if (!(column + 1 < size && data[index + 1])) {
        path += svgCommand("h", lineLength);
        lineLength = 0;
      }
    } else {
      moveBy += 1;
    }
  }

  return path;
}

export function normalizeStripePaymentLink(value?: string | null) {
  const trimmed = value?.trim() ?? "";

  if (!trimmed) {
    return "";
  }

  if (trimmed.length > MAX_PAYMENT_LINK_LENGTH) {
    return "";
  }

  try {
    const parsed = new URL(trimmed);

    if (parsed.protocol !== "https:") {
      return "";
    }

    return parsed.toString();
  } catch {
    return "";
  }
}

export function getStripePaymentQrSvg(link?: string | null) {
  const normalizedLink = normalizeStripePaymentLink(link);

  if (!normalizedLink) {
    return null;
  }

  const qr = QRCode.create(normalizedLink, {
    errorCorrectionLevel: "M",
  });
  const size = qr.modules.size;
  const path = qrModulesToPath(qr.modules.data, size);
  const escapedLink = escapeXml(normalizedLink);
  const svg = [
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${size} ${size}" shape-rendering="crispEdges" role="img" aria-label="Stripe payment QR code">`,
    `<title>Stripe payment QR code for ${escapedLink}</title>`,
    `<path fill="#ffffff" d="M0 0h${size}v${size}H0z"/>`,
    `<path stroke="#111827" d="${path}"/>`,
    "</svg>",
  ].join("");

  if (new TextEncoder().encode(svg).length >= MAX_QR_BYTES) {
    return null;
  }

  return svg;
}

export function getStripePaymentQrDataUrl(link?: string | null) {
  const svg = getStripePaymentQrSvg(link);

  if (!svg) {
    return null;
  }

  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
}

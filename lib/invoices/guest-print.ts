export const GUEST_PRINT_STORAGE_PREFIX = "designbayinvoice:guest-print:";

export function buildGuestPrintStorageKey(draftKey: string) {
  return `${GUEST_PRINT_STORAGE_PREFIX}${draftKey}`;
}

export function buildGuestPrintHref(draftKey: string, autoPrint = false) {
  const href = new URL(`/guest/print?draft=${draftKey}`, "http://localhost");

  if (autoPrint) {
    href.searchParams.set("autoprint", "1");
  }

  return `${href.pathname}${href.search}`;
}

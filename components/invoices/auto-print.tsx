"use client";

import { useEffect } from "react";

export function AutoPrint() {
  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      window.print();
    }, 150);

    const handleAfterPrint = () => {
      window.close();
    };

    window.addEventListener("afterprint", handleAfterPrint);

    return () => {
      window.clearTimeout(timeoutId);
      window.removeEventListener("afterprint", handleAfterPrint);
    };
  }, []);

  return null;
}

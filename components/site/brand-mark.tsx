"use client";

import Image from "next/image";

import logoImage from "@/logo/logo.svg";

type BrandMarkProps = {
  className?: string;
};

export function BrandMark({ className = "h-9 w-9" }: BrandMarkProps) {
  return (
    <div className={`relative shrink-0 ${className}`}>
      <Image
        alt="DesignBayInvoice logo"
        className="object-contain"
        fill
        priority
        sizes="40px"
        src={logoImage}
      />
    </div>
  );
}

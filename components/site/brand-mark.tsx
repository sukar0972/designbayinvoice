"use client";

import Image from "next/image";

import logoImage from "@/logo/logo.png";

type BrandMarkProps = {
  className?: string;
};

export function BrandMark({ className = "h-9 w-9" }: BrandMarkProps) {
  return (
    <div
      className={`relative overflow-hidden rounded-md border border-[rgba(0,0,0,0.08)] bg-[#0f5c44] shadow-sm ${className}`}
    >
      <Image
        alt="DesignBayInvoice logo"
        className="object-cover"
        fill
        priority
        sizes="40px"
        src={logoImage}
      />
    </div>
  );
}

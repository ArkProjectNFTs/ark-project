"use client";

import React from "react";

import Link from "next/link";

import { cn } from "@/lib/utils";

export function MainNav({
  className,
  ...props
}: React.HTMLAttributes<HTMLElement>) {
  return (
    <nav
      className={cn("flex items-center space-x-4 lg:space-x-6", className)}
      {...props}
    >
      <Link href="/">
        <div className="relative z-20 flex space-x-2 items-center text-lg font-medium">
          <svg width="30" height="24" viewBox="0 0 30 24" fill="none">
            <path
              fillRule="evenodd"
              clipRule="evenodd"
              d="M29.624 12.7743C28.3051 18.7768 22.1068 24.2072 14.2251 23.4768C4.26939 22.5542 -0.857532 13.8757 0.11751 8.27101C1.09255 2.66636 8.4189 -0.442752 17.6794 1.30555C26.9399 3.05382 30.5121 7.51148 29.624 12.7743ZM14.6863 9.88504C14.5521 9.75398 14.3881 9.66795 14.2044 9.64471C13.6468 9.57415 13.1198 10.1094 13.0273 10.8402C12.9349 11.571 13.3119 12.2206 13.8696 12.2912C13.9865 12.306 14.1021 12.2941 14.2126 12.2594C13.6144 13.3254 12.5748 13.9386 11.5838 13.7019C10.3117 13.3979 9.60134 11.8082 9.99726 10.1512C10.3932 8.49416 11.7454 7.39728 13.0175 7.70123C13.9286 7.91891 14.5515 8.79602 14.6863 9.88504ZM24.3763 11.1009C24.7135 11.148 25.0105 11.3131 25.244 11.5582C25.0321 10.0808 24.1618 8.89962 22.909 8.612C21.1446 8.2069 19.2897 9.72787 18.7659 12.0092C18.2421 14.2905 19.2479 16.4683 21.0123 16.8734C22.3156 17.1726 23.6683 16.4209 24.4974 15.0882C24.2784 15.1672 24.0451 15.1953 23.8086 15.1623C22.8848 15.0332 22.2631 14.0193 22.4199 12.8978C22.5766 11.7763 23.4525 10.9718 24.3763 11.1009Z"
              fill="#8C62F2"
            />
          </svg>
          <div className="text-sm font-medium transition-colors hover:text-primary">
            ArkProject SDK
          </div>
        </div>
      </Link>
      <Link
        href="/examples"
        className="text-sm font-medium transition-colors hover:text-primary"
      >
        Examples
      </Link>
      <Link
        href="/marketplace"
        className="text-sm font-medium transition-colors hover:text-primary"
      >
        Demo
      </Link>
      {/* <Link
        href="/mint"
        className="text-sm font-medium transition-colors hover:text-primary"
      >
        Mint
      </Link>
      <Link
        href="/explore"
        className="text-sm font-medium transition-colors hover:text-primary"
      >
        Explore
      </Link>
      <Link
        href="/portfolio"
        className="text-sm font-medium transition-colors hover:text-primary"
      >
        Portfolio
      </Link> */}
      <Link
        target="_blank"
        href="https://docs.arkproject.dev"
        className="text-sm font-medium transition-colors hover:text-primary"
      >
        Documentation
      </Link>
    </nav>
  );
}

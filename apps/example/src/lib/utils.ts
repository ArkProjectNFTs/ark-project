import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function truncateString(str: string, num: number): string {
  if (str.startsWith("0x0")) {
    str = str.substring(4);
  }

  if (str.length <= num) {
    return str;
  }

  return str.slice(0, num);
}

export function areAddressesEqual(addr1: string, addr2: string): boolean {
  const normalizeAddress = (address: string) => {
    address =
      address.startsWith("0x") || address.startsWith("0X")
        ? address.substring(2)
        : address;
    return address.padStart(64, "0").toLowerCase();
  };

  return normalizeAddress(addr1) === normalizeAddress(addr2);
}

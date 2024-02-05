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

export function timeSince(timestamp: number): string {
  const now = new Date().getTime();
  const secondsPast = Math.floor((now - timestamp * 1000) / 1000); // Convert timestamp to milliseconds

  if (secondsPast < 60) {
    return "a few seconds ago";
  }

  const minutesPast = Math.floor(secondsPast / 60);
  if (minutesPast < 60) {
    return `${minutesPast} minute${minutesPast > 1 ? "s" : ""} ago`;
  }

  const hoursPast = Math.floor(minutesPast / 60);
  if (hoursPast < 24) {
    return `${hoursPast} hour${hoursPast > 1 ? "s" : ""} ago`;
  }

  const daysPast = Math.floor(hoursPast / 24);
  return `${daysPast} day${daysPast > 1 ? "s" : ""} ago`;
}

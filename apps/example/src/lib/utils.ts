import { clsx, type ClassValue } from "clsx";
import { num } from "starknet";
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
  return num.cleanHex(addr1) === num.cleanHex(addr2);
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

export function getRoundedRemainingTime(endTime: number): string {
  const total = new Date(endTime * 1000).getTime() - new Date().getTime();
  const days = Math.floor(total / (1000 * 60 * 60 * 24));
  const hours = Math.floor((total / (1000 * 60 * 60)) % 24);
  const minutes = Math.floor((total / 1000 / 60) % 60);

  if (days > 0) {
    return `${days} days`;
  } else if (hours > 0) {
    return `${hours} hours`;
  } else if (minutes > 0) {
    return `${minutes} minutes`;
  } else {
    return "Expired";
  }
}

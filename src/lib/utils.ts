import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatNumber(num: number): string {
  return num.toString();
}

/**
 * Debounces a function so it only executes after the specified delay
 * has passed since the last time it was called.
 */
export function debounce<T extends (...args: any[]) => any>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeoutId: NodeJS.Timeout | null = null;
  
  return (...args: Parameters<T>) => {
    if (timeoutId) {
      clearTimeout(timeoutId);
    }
    
    timeoutId = setTimeout(() => {
      func(...args);
    }, wait);
  };
}

/**
 * Creates a stable signature for a set of files based on their paths and content.
 * This helps detect when actual file content changes vs just metadata.
 */
export function filesSignature(files: { path: string; content: string }[]): string {
  return files
    .map((file) => `${file.path}\u0000${file.content.length}\u0000${file.content}`)
    .join("\u0001");
}

/**
 * Compares two file sets to determine if they have the same content.
 */
export function filesEqual(
  filesA: { path: string; content: string }[],
  filesB: { path: string; content: string }[]
): boolean {
  if (filesA.length !== filesB.length) return false;
  
  const signatureA = filesSignature(filesA);
  const signatureB = filesSignature(filesB);
  
  return signatureA === signatureB;
}

/**
 * Waits for the specified amount of time before resolving.
 */
export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

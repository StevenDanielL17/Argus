/**
 * Security utilities for Argus Terminal
 * Prevents XSS, injection attacks, and sanitizes user input
 */

/**
 * Sanitizes HTML to prevent XSS attacks
 */
export function sanitizeHTML(str: string): string {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

/**
 * Sanitizes user input - removes dangerous characters
 */
export function sanitizeInput(input: string): string {
  return input
    .replace(/[<>]/g, '') // Remove HTML brackets
    .replace(/javascript:/gi, '') // Remove javascript: protocol
    .replace(/on\w+=/gi, '') // Remove event handlers
    .trim();
}

/**
 * Validates and sanitizes numbers
 */
export function sanitizeNumber(value: string | number, min?: number, max?: number): number {
  const num = typeof value === 'string' ? parseFloat(value) : value;
  
  if (isNaN(num)) return 0;
  if (min !== undefined && num < min) return min;
  if (max !== undefined && num > max) return max;
  
  return Math.round(num * 10000) / 10000; // Prevent floating point issues
}

/**
 * Validates symbol format (e.g., BTC-PERP, SOL-PERP)
 */
export function isValidSymbol(symbol: string): boolean {
  return /^[A-Z]{2,10}(-PERP)?$/.test(symbol.toUpperCase());
}

/**
 * Validates order side
 */
export function isValidSide(side: string): side is 'BUY' | 'SELL' {
  return side === 'BUY' || side === 'SELL';
}

/**
 * Creates a safe WebSocket message
 */
export function createWSMessage(type: string, data: Record<string, unknown>): string {
  return JSON.stringify({
    type: sanitizeInput(type),
    ...Object.entries(data).reduce((acc, [key, value]) => {
      acc[sanitizeInput(key)] = typeof value === 'string' ? sanitizeInput(value) : value;
      return acc;
    }, {} as Record<string, unknown>),
  });
}

/**
 * Rate limits function calls
 */
export function rateLimit<T extends (...args: any[]) => any>(
  fn: T,
  delay: number
): T {
  let lastCall = 0;
  let timeoutId: ReturnType<typeof setTimeout> | null = null;

  return ((...args: Parameters<T>) => {
    const now = Date.now();
    if (now - lastCall >= delay) {
      lastCall = now;
      return fn(...args);
    }
    
    if (timeoutId) clearTimeout(timeoutId);
    
    return new Promise((resolve) => {
      timeoutId = setTimeout(() => {
        lastCall = Date.now();
        resolve(fn(...args));
      }, delay - (now - lastCall));
    });
  }) as T;
}

/**
 * Safe number formatting - prevents locale-based injection
 */
export function safeFormatNumber(num: number, decimals: number = 2): string {
  const sanitized = sanitizeNumber(num);
  return sanitized.toLocaleString('en-US', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
}

/**
 * Safe currency formatting
 */
export function safeFormatCurrency(num: number, currency: string = 'USD'): string {
  const sanitized = sanitizeNumber(num);
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(sanitized);
}

/**
 * Validates URL to prevent protocol injection
 */
export function isValidUrl(url: string, allowedProtocols: string[] = ['http:', 'https:', 'ws:', 'wss:']): boolean {
  try {
    const parsed = new URL(url);
    return allowedProtocols.includes(parsed.protocol);
  } catch {
    return false;
  }
}

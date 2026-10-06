/**
 * Debouncing & Throttling Utilities
 * Prevent excessive API calls and re-renders
 */

import React, { useEffect, useRef, useCallback, useState } from "react";

/**
 * Debounce function — delays execution until input stops changing
 * Prevents searching on every keystroke
 */
export function debounce<T extends (...args: unknown[]) => unknown>(
  fn: T,
  delay: number = 300,
): (...args: Parameters<T>) => void {
  let timeoutId: ReturnType<typeof setTimeout> | null = null;

  return function debounced(...args: Parameters<T>) {
    if (timeoutId) clearTimeout(timeoutId);
    timeoutId = setTimeout(() => {
      fn(...args);
    }, delay);
  };
}

/**
 * React Hook: Debounced state value
 * Use for search inputs to reduce API calls
 */
export function useDebouncedValue<T>(value: T, delay: number = 300): T {
  const [debouncedValue, setDebouncedValue] = useState(value);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => clearTimeout(timer);
  }, [value, delay]);

  return debouncedValue;
}

/**
 * React Hook: Debounced callback
 * Use to delay handlers (e.g., form submission, API calls)
 */
export function useDebouncedCallback<T extends (...args: unknown[]) => unknown>(
  callback: T,
  delay: number = 300,
): (...args: Parameters<T>) => void {
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, []);

  return useCallback(
    (...args: Parameters<T>) => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      timeoutRef.current = setTimeout(() => {
        callback(...args);
      }, delay);
    },
    [callback, delay],
  );
}

/**
 * Throttle function — limits execution frequency
 * Prevents re-rendering on every scroll event
 */
export function throttle<T extends (...args: unknown[]) => unknown>(
  fn: T,
  delay: number = 300,
): (...args: Parameters<T>) => void {
  let lastTime = 0;

  return function throttled(...args: Parameters<T>) {
    const now = Date.now();
    if (now - lastTime >= delay) {
      lastTime = now;
      fn(...args);
    }
  };
}

/**
 * React Hook: Throttled callback
 * Use for scroll/resize handlers
 */
export function useThrottledCallback<T extends (...args: unknown[]) => unknown>(
  callback: T,
  delay: number = 300,
): (...args: Parameters<T>) => void {
  const lastTimeRef = useRef(0);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, []);

  return useCallback(
    (...args: Parameters<T>) => {
      const now = Date.now();

      if (now - lastTimeRef.current >= delay) {
        lastTimeRef.current = now;
        callback(...args);
      } else {
        if (timeoutRef.current) clearTimeout(timeoutRef.current);
        timeoutRef.current = setTimeout(
          () => {
            lastTimeRef.current = Date.now();
            callback(...args);
          },
          delay - (now - lastTimeRef.current),
        );
      }
    },
    [callback, delay],
  );
}

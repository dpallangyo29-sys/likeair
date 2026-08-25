/**
 * Performance Monitoring & Optimization Hints
 * Track and log performance metrics
 */

import React, { useEffect } from "react";

export interface PerformanceMetrics {
  name: string;
  duration: number;
  timestamp: number;
  tags?: Record<string, string>;
}

const metrics: PerformanceMetrics[] = [];

/**
 * Mark operation start time
 */
export function markStart(name: string): number {
  return performance.now();
}

/**
 * Mark operation end and log duration
 */
export function markEnd(name: string, startTime: number, tags?: Record<string, string>): void {
  const duration = performance.now() - startTime;
  const metric: PerformanceMetrics = {
    name,
    duration,
    timestamp: Date.now(),
    tags,
  };

  metrics.push(metric);

  // Log slow operations (> 1 second)
  if (duration > 1000) {
    console.warn(`⚠️ Slow operation: ${name} took ${duration.toFixed(2)}ms`, tags);
  }

  // Keep only last 100 metrics to avoid memory bloat
  if (metrics.length > 100) {
    metrics.shift();
  }
}

/**
 * Get all recorded metrics
 */
export function getMetrics(): PerformanceMetrics[] {
  return [...metrics];
}

/**
 * Clear metrics
 */
export function clearMetrics(): void {
  metrics.length = 0;
}

/**
 * React Hook: Measure component render time
 */
export function usePerformanceMonitor(componentName: string): void {
  useEffect(() => {
    const startTime = markStart(`${componentName}-render`);
    return () => markEnd(`${componentName}-render`, startTime);
  }, [componentName]);
}

/**
 * React Hook: Measure async operation
 */
export function useAsyncPerformance(
  asyncFn: () => Promise<unknown>,
  name: string,
  deps: React.DependencyList = [],
): void {
  useEffect(() => {
    const startTime = markStart(name);
    asyncFn()
      .then(() => markEnd(name, startTime, { status: "success" }))
      .catch((err) =>
        markEnd(name, startTime, {
          status: "error",
          error: err instanceof Error ? err.message : String(err),
        }),
      );
    // eslint-disable-next-line react-hooks/exhaustive-deps -- deps is an intentional pass-through dependency list controlled by the caller
  }, deps);
}

/**
 * Log Core Web Vitals if available
 */
export function logWebVitals(): void {
  if ("PerformanceObserver" in window) {
    try {
      // Largest Contentful Paint
      const paintObs = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          console.log(`📊 ${entry.name}: ${(entry.startTime + entry.duration).toFixed(2)}ms`);
        }
      });
      paintObs.observe({ entryTypes: ["paint", "largest-contentful-paint"] });

      // First Input Delay
      const inputObs = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          const timingEntry = entry as PerformanceEventTiming;
          const delay = timingEntry.processingStart - timingEntry.startTime;
          console.log(`⌨️ First Input Delay: ${delay.toFixed(2)}ms`);
        }
      });
      inputObs.observe({ entryTypes: ["first-input"] });
    } catch (e) {
      // Silently ignore if not supported
    }
  }
}

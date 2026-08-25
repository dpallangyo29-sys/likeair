/**
 * Virtual Scrolling Utilities
 * Efficiently render large lists by only rendering visible items
 */

import * as React from "react";

export interface VirtualScrollConfig {
  itemHeight: number;
  containerHeight: number;
  scrollTop: number;
  overscan?: number; // Buffer items above/below visible area
}

export interface VirtualScrollResult {
  startIndex: number;
  endIndex: number;
  offsetY: number;
}

/**
 * Calculate which items should be rendered based on scroll position
 * Reduces DOM nodes from 60 to ~8-12 visible items
 */
export function calculateVirtualRange({
  itemHeight,
  containerHeight,
  scrollTop,
  overscan = 5,
}: VirtualScrollConfig): VirtualScrollResult {
  const startIndex = Math.max(0, Math.floor(scrollTop / itemHeight) - overscan);
  const endIndex = Math.ceil((scrollTop + containerHeight) / itemHeight) + overscan;
  const offsetY = startIndex * itemHeight;

  return { startIndex, endIndex, offsetY };
}

/**
 * Hook for tracking scroll position efficiently
 */
export function useVirtualScroll(
  containerRef: React.RefObject<HTMLDivElement>,
  onScroll?: (scrollTop: number) => void,
) {
  const [scrollTop, setScrollTop] = React.useState(0);

  React.useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const handleScroll = () => {
      const newScrollTop = container.scrollTop;
      setScrollTop(newScrollTop);
      onScroll?.(newScrollTop);
    };

    container.addEventListener("scroll", handleScroll, { passive: true });
    return () => container.removeEventListener("scroll", handleScroll);
  }, [containerRef, onScroll]);

  return scrollTop;
}

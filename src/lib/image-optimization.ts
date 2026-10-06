/**
 * Image Optimization Utilities
 * Faster image loading with blur placeholders and responsive images
 */

import React, { useState } from "react";

/**
 * Generate blur placeholder from image URL
 * Uses blurhash-like placeholder while loading
 */
export function getImageBlurPlaceholder(imageUrl?: string | null): string {
  // Fallback to tiny gray placeholder
  return "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 125'%3E%3Crect fill='%23222' width='100' height='125'/%3E%3C/svg%3E";
}

/**
 * Optimize image URL for faster loading
 * Add query params for compression/sizing
 */
export function optimizeImageUrl(
  url?: string | null,
  options: {
    width?: number;
    height?: number;
    quality?: number;
  } = {},
): string {
  if (!url) return getImageBlurPlaceholder();

  // If it's already an optimized URL, return as-is
  if (url.includes("images.unsplash.com")) {
    const params = new URLSearchParams(url.split("?")[1] || "");
    params.set("w", String(options.width || 600));
    params.set("q", String(options.quality || 75));
    return url.split("?")[0] + "?" + params.toString();
  }

  return url;
}

/**
 * Generate responsive image srcset for faster adaptive loading
 */
export function getImageSrcSet(url?: string | null, baseWidth: number = 300): string {
  if (!url) return "";

  if (url.includes("unsplash.com")) {
    return [`${url}?w=${baseWidth}&q=60 1x`, `${url}?w=${baseWidth * 2}&q=50 2x`].join(", ");
  }

  return "";
}

/**
 * Preload image in background (for next page, etc.)
 */
export function preloadImage(url?: string | null): void {
  if (!url) return;

  const img = new Image();
  img.src = optimizeImageUrl(url);
  // Browser caches the image for later use
}

/**
 * Image loading state management
 */
export const useImageLoad = (
  initialUrl?: string | null,
): {
  isLoading: boolean;
  error: Error | null;
  imgProps: {
    onLoad: () => void;
    onError: (e: React.SyntheticEvent<HTMLImageElement>) => void;
  };
} => {
  const [isLoading, setIsLoading] = useState(!!initialUrl);
  const [error, setError] = useState<Error | null>(null);

  return {
    isLoading,
    error,
    imgProps: {
      onLoad: () => setIsLoading(false),
      onError: (e) => {
        setIsLoading(false);
        setError(new Error("Image load failed"));
      },
    },
  };
};

/**
 * Get optimal image dimensions based on device
 */
export function getOptimalImageDimensions(containerWidth: number): {
  width: number;
  height: number;
} {
  // For 4:5 aspect ratio cards
  const width = Math.min(containerWidth, 400);
  const height = (width * 5) / 4;

  return {
    width: Math.ceil(width),
    height: Math.ceil(height),
  };
}

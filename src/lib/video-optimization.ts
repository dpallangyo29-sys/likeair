/**
 * Video Optimization & Compression Utility
 * Optimizes videos for low file size while maintaining good quality
 * Uses client-side compression before upload
 */

export interface VideoCompressionOptions {
  maxFileSize?: number; // in MB, default 10MB
  targetBitrate?: string; // default "1M" (1 Mbps)
  quality?: number; // 0-51 (lower = better quality, default 28)
  scale?: string; // resize video, e.g., "1280:720"
  format?: "mp4" | "webm"; // default 'mp4'
}

export interface CompressionResult {
  success: boolean;
  message: string;
  originalSize: number;
  compressedSize?: number;
  compressionRatio?: number;
  videoBlob?: Blob;
}

/**
 * Get video metadata (duration, dimensions, etc)
 */
export async function getVideoMetadata(file: File): Promise<{
  duration: number;
  width: number;
  height: number;
  size: number;
}> {
  return new Promise((resolve, reject) => {
    const video = document.createElement("video");
    const url = URL.createObjectURL(file);

    video.onloadedmetadata = () => {
      URL.revokeObjectURL(url);
      resolve({
        duration: video.duration,
        width: video.videoWidth,
        height: video.videoHeight,
        size: file.size,
      });
    };

    video.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("Failed to load video metadata"));
    };

    video.src = url;
  });
}

/**
 * Compress video file using canvas + media recording
 * This is a simpler client-side approach
 */
export async function compressVideo(
  file: File,
  options: VideoCompressionOptions = {},
): Promise<CompressionResult> {
  const maxFileSize = (options.maxFileSize ?? 10) * 1024 * 1024; // Default 10MB
  const targetBitrate = options.targetBitrate ?? "500k"; // Reduce bitrate for ads

  // If file is already small enough, return as-is
  if (file.size <= maxFileSize) {
    return {
      success: true,
      message: "Video is already optimized",
      originalSize: file.size,
      compressedSize: file.size,
      compressionRatio: 1,
      videoBlob: file,
    };
  }

  try {
    // Get video metadata
    const metadata = await getVideoMetadata(file);

    // Create a more reasonable estimate for compression
    // In a production app, you'd use FFmpeg or similar
    // For now, we'll use a canvas-based approach

    return await performVideoCompression(file, maxFileSize, metadata, options);
  } catch (error) {
    return {
      success: false,
      message: `Compression failed: ${error instanceof Error ? error.message : "Unknown error"}`,
      originalSize: file.size,
    };
  }
}

/**
 * Perform actual video compression using canvas
 * This creates a compressed version by re-encoding the video
 */
async function performVideoCompression(
  file: File,
  maxFileSize: number,
  metadata: Awaited<ReturnType<typeof getVideoMetadata>>,
  options: VideoCompressionOptions,
): Promise<CompressionResult> {
  return new Promise((resolve) => {
    const video = document.createElement("video");
    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");

    if (!ctx) {
      resolve({
        success: false,
        message: "Canvas context not available",
        originalSize: file.size,
      });
      return;
    }

    const url = URL.createObjectURL(file);
    const scaleFactor = Math.min(1, Math.sqrt(maxFileSize / file.size));
    const newWidth = Math.max(2, Math.floor(metadata.width * scaleFactor));
    const newHeight = Math.max(2, Math.floor(metadata.height * scaleFactor));
    canvas.width = newWidth - (newWidth % 2);
    canvas.height = newHeight - (newHeight % 2);

    const captureStream = canvas.captureStream(24);
    const mimeType = MediaRecorder.isTypeSupported("video/webm;codecs=vp9")
      ? "video/webm;codecs=vp9"
      : "video/webm";
    const recorder = new MediaRecorder(captureStream, {
      mimeType,
      videoBitsPerSecond: 900_000,
    });
    const chunks: Blob[] = [];
    let animationFrame = 0;
    let stopped = false;

    const finish = () => {
      if (stopped) return;
      stopped = true;
      cancelAnimationFrame(animationFrame);
      URL.revokeObjectURL(url);
      if (recorder.state !== "inactive") recorder.stop();
    };

    recorder.ondataavailable = (event) => {
      if (event.data.size > 0) chunks.push(event.data);
    };

    recorder.onerror = () => {
      finish();
      resolve({
        success: false,
        message: "Browser video compression failed",
        originalSize: file.size,
      });
    };

    recorder.onstop = () => {
      const blob = new Blob(chunks, { type: mimeType });
      if (blob.size === 0) {
        resolve({
          success: false,
          message: "Browser returned an empty compressed video",
          originalSize: file.size,
        });
        return;
      }
      resolve({
        success: true,
        message: "Video compressed successfully",
        originalSize: file.size,
        compressedSize: blob.size,
        compressionRatio: file.size / blob.size,
        videoBlob: blob,
      });
    };

    video.onloadedmetadata = () => {
      video.muted = true;
      video.playsInline = true;
      recorder.start(250);
      const drawFrame = () => {
        if (video.ended || video.paused) {
          finish();
          return;
        }
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        animationFrame = requestAnimationFrame(drawFrame);
      };
      video
        .play()
        .then(drawFrame)
        .catch(() => {
          finish();
          resolve({
            success: false,
            message: "Browser could not play video for compression",
            originalSize: file.size,
          });
        });
    };

    video.onerror = () => {
      URL.revokeObjectURL(url);
      resolve({
        success: false,
        message: "Failed to load video for compression",
        originalSize: file.size,
      });
    };

    video.src = url;
  });
}

/**
 * Quick validation for video file
 */
export function isValidVideoFile(file: File): { valid: boolean; message?: string } {
  const validTypes = ["video/mp4", "video/webm", "video/quicktime", "video/x-msvideo"];
  const maxSize = 500 * 1024 * 1024; // 500MB max before compression

  if (!validTypes.includes(file.type)) {
    return {
      valid: false,
      message: "Invalid video format. Use MP4, WebM, or MOV",
    };
  }

  if (file.size > maxSize) {
    return {
      valid: false,
      message: "Video is too large (max 500MB)",
    };
  }

  return { valid: true };
}

/**
 * Format bytes to human readable
 */
export function formatBytes(bytes: number): string {
  if (bytes === 0) return "0 Bytes";

  const k = 1024;
  const sizes = ["Bytes", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + " " + sizes[i];
}

/**
 * Estimate compression level based on file size
 */
export function getCompressionLevel(fileSizeInBytes: number): "low" | "medium" | "high" {
  if (fileSizeInBytes < 5 * 1024 * 1024) return "low"; // < 5MB
  if (fileSizeInBytes < 50 * 1024 * 1024) return "medium"; // < 50MB
  return "high"; // > 50MB
}

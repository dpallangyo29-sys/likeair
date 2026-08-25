import React, { useCallback, useEffect, useState } from "react";
import { Upload, Video, X, Loader2 } from "lucide-react";
import {
  compressVideo,
  isValidVideoFile,
  formatBytes,
  getVideoMetadata,
  type VideoCompressionOptions,
} from "@/lib/video-optimization";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface VideoUploadProps {
  onVideoSelect?: (file: File, blob: Blob) => Promise<void>;
  onVideoChange?: (file: File | null) => void;
  maxSizeInMB?: number;
  disabled?: boolean;
  className?: string;
}

export const VideoUpload = React.memo(
  ({
    onVideoSelect,
    onVideoChange,
    maxSizeInMB = 500,
    disabled = false,
    className,
  }: VideoUploadProps) => {
    const [selectedFile, setSelectedFile] = useState<File | null>(null);
    const [previewUrl, setPreviewUrl] = useState<string | null>(null);
    const [isCompressing, setIsCompressing] = useState(false);
    const [compressionProgress, setCompressionProgress] = useState<{
      status: "idle" | "compressing" | "uploading" | "success" | "error";
      originalSize?: number;
      compressedSize?: number;
      error?: string;
    }>({ status: "idle" });

    useEffect(() => {
      if (!selectedFile) {
        setPreviewUrl(null);
        return;
      }

      const url = URL.createObjectURL(selectedFile);
      setPreviewUrl(url);
      return () => URL.revokeObjectURL(url);
    }, [selectedFile]);

    const handleFileSelect = useCallback(
      async (file: File) => {
        // Validate video
        const validation = isValidVideoFile(file);
        if (!validation.valid) {
          setCompressionProgress({
            status: "error",
            error: validation.message,
          });
          return;
        }

        setSelectedFile(file);
        setCompressionProgress({
          status: "compressing",
          originalSize: file.size,
        });
        setIsCompressing(true);

        try {
          // Get video metadata
          const metadata = await getVideoMetadata(file);
          console.log("Video metadata:", metadata);

          // Compress video
          const result = await compressVideo(file, {
            maxFileSize: maxSizeInMB,
            quality: 28, // Good balance of quality and size
          });

          if (result.success && result.videoBlob) {
            setCompressionProgress({
              status: "success",
              originalSize: file.size,
              compressedSize: result.videoBlob.size,
            });

            onVideoChange?.(file);

            // If callback provided, call it with compressed blob
            if (onVideoSelect) {
              setCompressionProgress({ status: "uploading", originalSize: file.size });
              await onVideoSelect(file, result.videoBlob);
              setCompressionProgress({
                status: "success",
                originalSize: file.size,
                compressedSize: result.videoBlob.size,
              });
            }
          } else {
            // Keep small videos usable even when the browser cannot re-encode them.
            if (file.size <= maxSizeInMB * 1024 * 1024) {
              onVideoChange?.(file);
              await onVideoSelect?.(file, file);
              setCompressionProgress({
                status: "success",
                originalSize: file.size,
                compressedSize: file.size,
              });
              return;
            }
            setCompressionProgress({
              status: "error",
              error: result.message || "Compression failed",
              originalSize: file.size,
            });
          }
        } catch (error) {
          console.error("Video compression error:", error);
          setCompressionProgress({
            status: "error",
            error: `Error: ${error instanceof Error ? error.message : "Unknown error"}`,
            originalSize: file.size,
          });
        } finally {
          setIsCompressing(false);
        }
      },
      [maxSizeInMB, onVideoSelect, onVideoChange],
    );

    const handleDrop = useCallback(
      (e: React.DragEvent<HTMLDivElement>) => {
        e.preventDefault();
        e.stopPropagation();

        const files = e.dataTransfer.files;
        if (files.length > 0) {
          const file = files[0];
          if (file.type.startsWith("video/")) {
            handleFileSelect(file);
          }
        }
      },
      [handleFileSelect],
    );

    const handleInputChange = useCallback(
      (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = e.currentTarget.files;
        if (files && files.length > 0) {
          handleFileSelect(files[0]);
        }
      },
      [handleFileSelect],
    );

    const handleClear = useCallback(() => {
      setSelectedFile(null);
      setCompressionProgress({ status: "idle" });
      onVideoChange?.(null);
    }, [onVideoChange]);

    return (
      <div className={cn("w-full space-y-3", className)}>
        <div
          onDrop={handleDrop}
          onDragOver={(e) => e.preventDefault()}
          className={cn(
            "relative rounded-lg border-2 border-dashed p-6 transition",
            disabled
              ? "opacity-50 cursor-not-allowed bg-muted"
              : "border-border hover:border-teal/50 cursor-pointer",
            selectedFile && "border-teal bg-teal/5",
          )}
        >
          <input
            type="file"
            accept="video/*"
            onChange={handleInputChange}
            disabled={disabled || isCompressing}
            className={cn("absolute inset-0 opacity-0 cursor-pointer", selectedFile && "hidden")}
            aria-label="Upload video"
          />

          <div className="flex flex-col items-center justify-center gap-2 py-4">
            {isCompressing ? (
              <>
                <Loader2 className="h-8 w-8 text-teal animate-spin" />
                <p className="text-sm font-medium text-teal">Compressing video...</p>
                <p className="text-xs text-muted-foreground">
                  {compressionProgress.originalSize
                    ? `Original: ${formatBytes(compressionProgress.originalSize)}`
                    : "Processing..."}
                </p>
              </>
            ) : selectedFile ? (
              <>
                {previewUrl ? (
                  <video
                    src={previewUrl}
                    controls
                    playsInline
                    preload="metadata"
                    className="max-h-64 w-full rounded-xl object-contain bg-black"
                    aria-label="Selected video preview"
                  />
                ) : (
                  <Video className="h-8 w-8 text-teal" />
                )}
                <p className="text-sm font-medium text-foreground">{selectedFile.name}</p>
                <p className="text-xs text-muted-foreground">{formatBytes(selectedFile.size)}</p>
                {compressionProgress.compressedSize && (
                  <p className="text-xs text-teal font-medium">
                    Compressed to {formatBytes(compressionProgress.compressedSize)} •{" "}
                    {Math.round((compressionProgress.compressedSize / selectedFile.size) * 100)}% of
                    original
                  </p>
                )}
              </>
            ) : (
              <>
                <Upload className="h-8 w-8 text-muted-foreground" />
                <div className="text-center">
                  <p className="text-sm font-medium text-foreground">
                    Drop video here or click to upload
                  </p>
                  <p className="text-xs text-muted-foreground">MP4, WebM (max {maxSizeInMB}MB)</p>
                </div>
              </>
            )}
          </div>
        </div>

        {compressionProgress.status === "error" && (
          <div className="rounded-lg bg-destructive/10 border border-destructive/20 p-3">
            <p className="text-sm text-destructive font-medium">
              {compressionProgress.error || "An error occurred"}
            </p>
          </div>
        )}

        {compressionProgress.status === "success" &&
          compressionProgress.compressedSize &&
          compressionProgress.originalSize && (
            <div className="rounded-lg bg-teal/10 border border-teal/20 p-3 space-y-2">
              <p className="text-sm text-teal font-medium">Video Ready</p>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div>
                  <span className="text-muted-foreground">Original: </span>
                  <span className="font-medium">
                    {formatBytes(compressionProgress.originalSize)}
                  </span>
                </div>
                <div>
                  <span className="text-muted-foreground">Compressed: </span>
                  <span className="font-medium">
                    {formatBytes(compressionProgress.compressedSize)}
                  </span>
                </div>
              </div>
            </div>
          )}

        {selectedFile && (
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleClear}
            disabled={isCompressing}
            className="w-full"
          >
            <X className="h-4 w-4 mr-2" />
            Remove Video
          </Button>
        )}
      </div>
    );
  },
);

VideoUpload.displayName = "VideoUpload";

"use client";

import type { ComponentProps, ComponentPropsWithRef } from "react";
import { useId, useRef, useState } from "react";
import type { FileIcon } from "@untitledui/file-icons";
import { FileIcon as FileTypeIcon } from "@untitledui/file-icons";
import {
  CheckCircle,
  Trash01,
  UploadCloud02,
  XCircle,
} from "@untitledui/icons";
import { AnimatePresence, motion } from "framer-motion";
import { cx } from "@/utils/cx";

/**
 * Returns a human-readable file size.
 * @param bytes - The size of the file in bytes.
 * @returns A string representing the file size in a human-readable format.
 */
export const getReadableFileSize = (bytes: number) => {
  if (bytes === 0) return "0 KB";

  const suffixes = ["B", "KB", "MB", "GB", "TB", "PB", "EB", "ZB", "YB"];

  const i = Math.floor(Math.log(bytes) / Math.log(1024));

  return Math.floor(bytes / Math.pow(1024, i)) + " " + suffixes[i];
};

/**
 * Get icon styles based on file upload state
 */
const getFileIconStyles = (failed?: boolean, isComplete?: boolean) => {
  if (failed) return "bg-red-100 text-red-600";
  if (isComplete) return "bg-green-100 text-green-600";
  return "bg-purple-100 text-purple-600";
};

interface FileUploadDropZoneProps {
  /** The class name of the drop zone. */
  className?: string;
  /**
   * A hint text explaining what files can be dropped.
   */
  hint?: string;
  /**
   * Disables dropping or uploading files.
   */
  isDisabled?: boolean;
  /**
   * Specifies the types of files that the server accepts.
   * Examples: "image/*", ".pdf,image/*", "image/*,video/mpeg,application/pdf"
   */
  accept?: string;
  /**
   * Allows multiple file uploads.
   */
  allowsMultiple?: boolean;
  /**
   * Maximum file size in bytes.
   */
  maxSize?: number;
  /**
   * Callback function that is called with the list of dropped files
   * when files are dropped on the drop zone.
   */
  onDropFiles?: (files: FileList) => void;
  /**
   * Callback function that is called with the list of unaccepted files
   * when files are dropped on the drop zone.
   */
  onDropUnacceptedFiles?: (files: FileList) => void;
  /**
   * Callback function that is called with the list of files that exceed
   * the size limit when files are dropped on the drop zone.
   */
  onSizeLimitExceed?: (files: FileList) => void;
}

export const FileUploadDropZone = ({
  className,
  hint,
  isDisabled,
  accept,
  allowsMultiple = true,
  maxSize,
  onDropFiles,
  onDropUnacceptedFiles,
  onSizeLimitExceed,
}: FileUploadDropZoneProps) => {
  const id = useId();
  const inputRef = useRef<HTMLInputElement>(null);
  const [isInvalid, setIsInvalid] = useState(false);
  const [isDraggingOver, setIsDraggingOver] = useState(false);

  const isFileTypeAccepted = (file: File): boolean => {
    if (!accept) return true;

    // Split the accept string into individual types
    const acceptedTypes = accept.split(",").map((type) => type.trim());

    return acceptedTypes.some((acceptedType) => {
      // Handle file extensions (e.g., .pdf, .doc)
      if (acceptedType.startsWith(".")) {
        const extension = `.${file.name.split(".").pop()?.toLowerCase()}`;
        return extension === acceptedType.toLowerCase();
      }

      // Handle wildcards (e.g., image/*)
      if (acceptedType.endsWith("/*")) {
        const typePrefix = acceptedType.split("/")[0];
        return file.type.startsWith(`${typePrefix}/`);
      }

      // Handle exact MIME types (e.g., application/pdf)
      return file.type === acceptedType;
    });
  };

  const handleDragIn = (event: React.DragEvent<HTMLDivElement>) => {
    if (isDisabled) return;

    event.preventDefault();
    event.stopPropagation();
    setIsDraggingOver(true);
  };

  const handleDragOut = (event: React.DragEvent<HTMLDivElement>) => {
    if (isDisabled) return;

    event.preventDefault();
    event.stopPropagation();
    setIsDraggingOver(false);
  };

  const processFiles = (files: File[]): void => {
    // Reset the invalid state when processing files.
    setIsInvalid(false);

    const acceptedFiles: File[] = [];
    const unacceptedFiles: File[] = [];
    const oversizedFiles: File[] = [];

    // If multiple files are not allowed, only process the first file
    const filesToProcess = allowsMultiple ? files : files.slice(0, 1);

    filesToProcess.forEach((file) => {
      // Check file size first
      if (maxSize && file.size > maxSize) {
        oversizedFiles.push(file);
        return;
      }

      // Then check file type
      if (isFileTypeAccepted(file)) {
        acceptedFiles.push(file);
      } else {
        unacceptedFiles.push(file);
      }
    });

    // Handle oversized files
    if (oversizedFiles.length > 0 && typeof onSizeLimitExceed === "function") {
      const dataTransfer = new DataTransfer();
      oversizedFiles.forEach((file) => dataTransfer.items.add(file));

      setIsInvalid(true);
      onSizeLimitExceed(dataTransfer.files);
    }

    // Handle accepted files
    if (acceptedFiles.length > 0 && typeof onDropFiles === "function") {
      const dataTransfer = new DataTransfer();
      acceptedFiles.forEach((file) => dataTransfer.items.add(file));
      onDropFiles(dataTransfer.files);
    }

    // Handle unaccepted files
    if (
      unacceptedFiles.length > 0 &&
      typeof onDropUnacceptedFiles === "function"
    ) {
      const unacceptedDataTransfer = new DataTransfer();
      unacceptedFiles.forEach((file) => unacceptedDataTransfer.items.add(file));

      setIsInvalid(true);
      onDropUnacceptedFiles(unacceptedDataTransfer.files);
    }

    // Clear the input value to ensure the same file can be selected again
    if (inputRef.current) {
      inputRef.current.value = "";
    }
  };

  const handleDrop = (event: React.DragEvent<HTMLDivElement>) => {
    if (isDisabled) return;

    handleDragOut(event);
    processFiles(Array.from(event.dataTransfer.files));
  };

  const handleInputFileChange = (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const files = Array.from(event.target.files || []);
    console.log(
      "Selected files:",
      files.length,
      files.map((f) => f.name)
    );
    processFiles(files);
  };

  return (
    <div
      data-dropzone
      onDragOver={handleDragIn}
      onDragEnter={handleDragIn}
      onDragLeave={handleDragOut}
      onDragEnd={handleDragOut}
      onDrop={handleDrop}
      onClick={() => {
        if (!isDisabled) inputRef.current?.click();
      }}
      className={cx(
        "relative flex flex-col items-center justify-center gap-6 rounded-2xl border-2 border-dashed px-8 py-12 text-center transition-all duration-200 ease-in-out cursor-pointer",
        "border-border bg-background text-foreground hover:border-purple-400 hover:bg-muted/50",
        isDraggingOver &&
          "border-purple-500 bg-purple-100 ring-4 ring-purple-200 dark:bg-purple-900/50 dark:ring-purple-700/40",
        isDisabled && "cursor-not-allowed bg-muted border-muted opacity-60",
        isInvalid &&
          "border-red-300 bg-red-50 dark:border-red-400 dark:bg-red-950/30",
        className
      )}
      role="button"
      tabIndex={0}
      aria-disabled={isDisabled}
    >
      {/* Upload Icon */}
      <div
        className={cx(
          "flex items-center justify-center w-16 h-16 rounded-full transition-colors duration-200",
          isDraggingOver
            ? "bg-purple-100 text-purple-700 dark:bg-purple-900 dark:text-purple-200"
            : "bg-muted text-muted-foreground",
          isDisabled && "bg-muted text-muted-foreground opacity-60"
        )}
      >
        <UploadCloud02 className="w-8 h-8" />
      </div>

      {/* Main Content */}
      <div className="flex flex-col gap-3">
        <div className="flex flex-col gap-2">
          {/* Hidden file input */}
          <input
            ref={inputRef}
            id={id}
            type="file"
            className="sr-only"
            disabled={isDisabled}
            accept={accept}
            multiple={allowsMultiple}
            onChange={handleInputFileChange}
          />

          <div className="flex flex-col sm:flex-row items-center justify-center gap-2 text-lg">
            <button
              type="button"
              disabled={isDisabled}
              onClick={(e: React.MouseEvent) => {
                e.stopPropagation();
                if (!isDisabled) inputRef.current?.click();
              }}
              className={cx(
                "font-semibold text-purple-700 hover:text-purple-900 transition-colors duration-200 underline underline-offset-2 dark:text-purple-300 dark:hover:text-purple-200",
                isDisabled &&
                  "text-muted-foreground hover:text-muted-foreground cursor-not-allowed"
              )}
            >
              Click to upload
            </button>
            <span className="text-muted-foreground">
              or drag and drop files here
            </span>
          </div>

          {/* Drag state message */}
          {isDraggingOver && (
            <div className="text-purple-700 font-medium animate-pulse dark:text-purple-300">
              Drop your files here
            </div>
          )}
        </div>

        {/* File type hint */}
        <p
          className={cx(
            "text-sm text-muted-foreground transition-colors duration-200",
            isInvalid && "text-red-600 font-medium dark:text-red-400",
            isDraggingOver && "text-purple-700 dark:text-purple-200"
          )}
        >
          {hint || "PDF, TXT, DOCX, and MD files supported (max 10MB each)"}
        </p>

        {/* Additional helpful text */}
        {allowsMultiple && (
          <p className="text-xs text-muted-foreground/80">
            You can select multiple files at once
          </p>
        )}
      </div>
    </div>
  );
};

export interface FileListItemProps {
  /** The name of the file. */
  name: string;
  /** The size of the file. */
  size: number;
  /** The upload progress of the file. */
  progress: number;
  /** Whether the file failed to upload. */
  failed?: boolean;
  /** The type of the file. */
  type?: ComponentProps<typeof FileIcon>["type"];
  /** The class name of the file list item. */
  className?: string;
  /** The variant of the file icon. */
  fileIconVariant?: ComponentProps<typeof FileTypeIcon>["variant"];
  /** The function to call when the file is deleted. */
  onDelete?: () => void;
  /** The function to call when the file upload is retried. */
  onRetry?: () => void;
}

export const FileListItemProgressBar = ({
  name,
  size,
  progress,
  failed,
  type,
  fileIconVariant,
  onDelete,
  onRetry,
  className,
}: FileListItemProps) => {
  const isComplete = progress === 100;

  return (
    <motion.li
      layout="position"
      className={cx(
        "relative flex gap-4 rounded-xl bg-background border border-border p-4 shadow-sm transition-all duration-200 hover:shadow-md",
        failed &&
          "border-red-300 bg-red-50/50 dark:border-red-400 dark:bg-red-950/30",
        isComplete &&
          "border-green-300 bg-green-50/50 dark:border-green-400 dark:bg-green-950/30",
        className
      )}
    >
      {/* File Icon */}
      <div
        className={cx(
          "flex items-center justify-center w-12 h-12 rounded-lg shrink-0 transition-colors duration-200",
          getFileIconStyles(failed, isComplete)
        )}
      >
        <FileTypeIcon
          type={type ?? "empty"}
          theme="light"
          variant={fileIconVariant ?? "default"}
          className="w-6 h-6"
        />
      </div>

      <div className="flex min-w-0 flex-1 flex-col">
        <div className="flex w-full items-start justify-between">
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold text-foreground mb-1">
              {name}
            </p>

            <div className="flex items-center gap-3 text-xs text-muted-foreground">
              <span>{getReadableFileSize(size)}</span>

              <div className="flex items-center gap-1">
                {isComplete && (
                  <>
                    <CheckCircle className="w-4 h-4 text-green-600" />
                    <span className="text-green-600 font-medium">Complete</span>
                  </>
                )}

                {!isComplete && !failed && (
                  <>
                    <UploadCloud02 className="w-4 h-4 text-purple-600 animate-pulse" />
                    <span className="text-muted-foreground">
                      Uploading... {progress}%
                    </span>
                  </>
                )}

                {failed && (
                  <>
                    <XCircle className="w-4 h-4 text-red-600" />
                    <span className="text-red-600 font-medium">Failed</span>
                  </>
                )}
              </div>
            </div>
          </div>

          <button
            onClick={onDelete}
            className="flex items-center justify-center w-8 h-8 rounded-full text-muted-foreground hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors duration-200"
            title="Remove file"
          >
            <Trash01 className="w-4 h-4" />
          </button>
        </div>

        {/* Progress Bar */}
        {!failed && !isComplete && (
          <div className="mt-3">
            <div className="w-full bg-muted rounded-full h-2 overflow-hidden">
              <div
                className="bg-gradient-to-r from-purple-500 to-purple-600 h-2 rounded-full transition-all duration-300 ease-out"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>
        )}

        {/* Retry Button */}
        {failed && (
          <button
            onClick={onRetry}
            className="mt-3 px-3 py-1 text-sm text-red-600 border border-red-300 rounded-md hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors duration-200 self-start"
          >
            Try again
          </button>
        )}
      </div>
    </motion.li>
  );
};

export const FileListItemProgressFill = ({
  name,
  size,
  progress,
  failed,
  type,
  fileIconVariant,
  onDelete,
  onRetry,
  className,
}: FileListItemProps) => {
  const isComplete = progress === 100;

  const getProgressBgStyles = () => {
    if (failed) return "bg-red-100/70 dark:bg-red-950/30";
    if (isComplete) return "bg-green-100/70 dark:bg-green-950/30";
    return "bg-gradient-to-r from-purple-100/70 to-purple-200/70 dark:from-purple-950/30 dark:to-purple-900/30";
  };

  return (
    <motion.li
      layout="position"
      className={cx(
        "relative flex gap-4 overflow-hidden rounded-xl bg-background border border-border shadow-sm transition-all duration-200",
        failed && "border-red-300 dark:border-red-400",
        isComplete && "border-green-300 dark:border-green-400",
        className
      )}
    >
      {/* Animated Progress Fill Background */}
      <div
        style={{ width: `${progress}%` }}
        className={cx(
          "absolute inset-0 h-full transition-all duration-500 ease-out",
          getProgressBgStyles(),
          isComplete && "opacity-0"
        )}
        role="progressbar"
        aria-valuenow={progress}
        aria-valuemin={0}
        aria-valuemax={100}
      />

      {/* Content */}
      <div className="relative flex gap-4 w-full p-4">
        {/* File Icon */}
        <div
          className={cx(
            "flex items-center justify-center w-12 h-12 rounded-lg shrink-0 transition-colors duration-200",
            getFileIconStyles(failed, isComplete)
          )}
        >
          <FileTypeIcon
            type={type ?? "empty"}
            theme="light"
            variant={fileIconVariant ?? "solid"}
            className="w-6 h-6"
          />
        </div>

        <div className="flex min-w-0 flex-1 flex-col">
          <div className="flex w-full items-start justify-between">
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold text-foreground mb-1">
                {name}
              </p>

              <div className="flex items-center gap-3 text-xs">
                <span className="text-muted-foreground">
                  {failed
                    ? "Upload failed, please try again"
                    : getReadableFileSize(size)}
                </span>

                {!failed && (
                  <div className="flex items-center gap-1">
                    {isComplete && (
                      <>
                        <CheckCircle className="w-4 h-4 text-green-600" />
                        <span className="text-green-600 font-medium">
                          Complete
                        </span>
                      </>
                    )}
                    {!isComplete && (
                      <>
                        <UploadCloud02 className="w-4 h-4 text-purple-600 animate-pulse" />
                        <span className="text-muted-foreground">
                          {progress}%
                        </span>
                      </>
                    )}
                  </div>
                )}
              </div>
            </div>

            <button
              onClick={onDelete}
              className="flex items-center justify-center w-8 h-8 rounded-full text-muted-foreground hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors duration-200"
              title="Remove file"
            >
              <Trash01 className="w-4 h-4" />
            </button>
          </div>

          {failed && (
            <button
              onClick={onRetry}
              className="mt-3 px-3 py-1 text-sm text-red-600 border border-red-300 rounded-md hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors duration-200 self-start"
            >
              Try again
            </button>
          )}
        </div>
      </div>
    </motion.li>
  );
};

const FileUploadRoot = (props: ComponentPropsWithRef<"div">) => (
  <div {...props} className={cx("flex flex-col gap-4", props.className)}>
    {props.children}
  </div>
);

const FileUploadList = (props: ComponentPropsWithRef<"ul">) => (
  <ul {...props} className={cx("flex flex-col gap-3", props.className)}>
    <AnimatePresence initial={false}>{props.children}</AnimatePresence>
  </ul>
);

export const FileUpload = {
  Root: FileUploadRoot,
  List: FileUploadList,
  DropZone: FileUploadDropZone,
  ListItemProgressBar: FileListItemProgressBar,
  ListItemProgressFill: FileListItemProgressFill,
};

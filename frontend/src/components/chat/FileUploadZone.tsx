import { useCallback, useRef, useState } from "react";
import { motion } from "framer-motion";
import { UploadCloud, FileText, ImageIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { isAcceptedFile } from "./types";

interface FileUploadZoneProps {
  onFileAccepted: (file: File) => void;
  className?: string;
}

/**
 * Compact drag-and-drop zone for PDF / JPG / PNG uploads.
 * Sits above the chat input. Does not alter surrounding layout.
 */
export function FileUploadZone({ onFileAccepted, className }: FileUploadZoneProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFiles = useCallback(
    (files: FileList | null) => {
      if (!files || files.length === 0) return;
      const file = files[0];
      if (!isAcceptedFile(file)) {
        setError("Only PDF, JPG, or PNG files are supported.");
        return;
      }
      setError(null);
      onFileAccepted(file);
    },
    [onFileAccepted]
  );

  return (
    <div className={className}>
      <motion.div
        initial={false}
        animate={{
          borderColor: isDragging ? "hsl(var(--primary))" : "hsl(var(--border))",
          backgroundColor: isDragging ? "hsl(var(--primary) / 0.05)" : "transparent",
        }}
        transition={{ duration: 0.15 }}
        onDragOver={(e) => {
          e.preventDefault();
          setIsDragging(true);
        }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={(e) => {
          e.preventDefault();
          setIsDragging(false);
          handleFiles(e.dataTransfer.files);
        }}
        onClick={() => inputRef.current?.click()}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") inputRef.current?.click();
        }}
        className="flex cursor-pointer items-center gap-3 rounded-lg border border-dashed border-border px-4 py-3 text-sm text-muted-foreground transition-colors hover:bg-muted/50"
      >
        <UploadCloud className="h-4 w-4 shrink-0" />
        <span className="flex-1">
          <span className="font-medium text-foreground">Drop a file</span> or click to
          upload — supports{" "}
          <span className="inline-flex items-center gap-1 align-middle">
            <FileText className="h-3.5 w-3.5" /> PDF,
          </span>{" "}
          <span className="inline-flex items-center gap-1 align-middle">
            <ImageIcon className="h-3.5 w-3.5" /> JPG/PNG
          </span>
        </span>
        <input
          ref={inputRef}
          type="file"
          accept=".pdf,.jpg,.jpeg,.png,application/pdf,image/jpeg,image/png"
          className="hidden"
          onChange={(e) => handleFiles(e.target.files)}
        />
      </motion.div>
      {error && (
        <motion.p
          initial={{ opacity: 0, y: -4 }}
          animate={{ opacity: 1, y: 0 }}
          className="mt-1.5 text-xs text-destructive"
        >
          {error}
        </motion.p>
      )}
    </div>
  );
}

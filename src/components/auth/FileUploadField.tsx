import { useRef, useState } from "react";
import { Upload, X, FileText, Image } from "lucide-react";

interface UploadedFile {
  file: File;
  preview: string;
}

interface FileUploadFieldProps {
  files: UploadedFile[];
  onChange: (files: UploadedFile[]) => void;
  maxFiles?: number;
  error?: string;
}

const ALLOWED_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "application/pdf",
];
const MAX_SIZE = 5 * 1024 * 1024; // 5MB

const FileUploadField = ({
  files,
  onChange,
  maxFiles = 2,
  error,
}: FileUploadFieldProps) => {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragOver, setDragOver] = useState(false);

  const addFiles = (newFiles: FileList | null) => {
    if (!newFiles) return;
    const added: UploadedFile[] = [];
    for (let i = 0; i < newFiles.length; i++) {
      const file = newFiles[i];
      if (!ALLOWED_TYPES.includes(file.type)) continue;
      if (file.size > MAX_SIZE) continue;
      if (files.length + added.length >= maxFiles) break;
      const preview = file.type.startsWith("image/")
        ? URL.createObjectURL(file)
        : "";
      added.push({ file, preview });
    }
    onChange([...files, ...added]);
  };

  const removeFile = (index: number) => {
    const updated = [...files];
    if (updated[index].preview) URL.revokeObjectURL(updated[index].preview);
    updated.splice(index, 1);
    onChange(updated);
  };

  return (
    <div className="space-y-1.5">
      <label
        htmlFor="register-id-files"
        className="text-sm font-medium text-foreground/80 block pl-1"
      >
        Upload 2 Valid IDs <span className="text-destructive">*</span>
      </label>
      <div
        className={`border-2 border-dashed rounded-xl p-4 text-center cursor-pointer transition-colors ${
          dragOver
            ? "border-primary bg-primary/5"
            : error
              ? "border-destructive/40"
              : "border-border hover:border-primary/40"
        }`}
        onClick={() => inputRef.current?.click()}
        onDragOver={(e) => {
          e.preventDefault();
          setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragOver(false);
          addFiles(e.dataTransfer.files);
        }}
      >
        <input
          ref={inputRef}
          id="register-id-files"
          name="idFiles"
          type="file"
          accept="image/jpeg,image/png,image/webp,application/pdf"
          multiple
          className="hidden"
          onChange={(e) => {
            addFiles(e.target.files);
            e.target.value = "";
          }}
        />
        <Upload className="h-6 w-6 mx-auto text-muted-foreground mb-2" />
        <p className="text-sm text-muted-foreground">
          {files.length >= maxFiles
            ? "Maximum files uploaded"
            : "Click or drag files here (JPG, PNG, PDF, max 5MB)"}
        </p>
      </div>

      {files.length > 0 && (
        <div className="grid grid-cols-2 gap-2 mt-2">
          {files.map((f, i) => (
            <div
              key={i}
              className="relative group rounded-lg border border-border bg-accent/30 overflow-hidden"
            >
              {f.preview ? (
                <img
                  src={f.preview}
                  alt={f.file.name}
                  className="w-full h-24 object-cover"
                />
              ) : (
                <div className="w-full h-24 flex items-center justify-center">
                  <FileText className="h-8 w-8 text-muted-foreground" />
                </div>
              )}
              <div className="p-1.5">
                <p className="text-xs text-foreground truncate">
                  {f.file.name}
                </p>
                <p className="text-xs text-muted-foreground">
                  {(f.file.size / 1024).toFixed(0)} KB
                </p>
              </div>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  removeFile(i);
                }}
                className="absolute top-1 right-1 h-6 w-6 rounded-full bg-destructive/90 text-destructive-foreground flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
              >
                <X className="h-3 w-3" />
              </button>
            </div>
          ))}
        </div>
      )}

      {error && <p className="text-xs text-destructive pl-1">{error}</p>}
    </div>
  );
};

export type { UploadedFile };
export default FileUploadField;

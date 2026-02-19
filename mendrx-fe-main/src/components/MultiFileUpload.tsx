// File: src/components/MultiFileUpload.tsx
import React, { useCallback, useState } from "react";
import { X, AlertCircle, FileText } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { toast } from "react-hot-toast";

interface MultiFileUploadProps {
  files: File[];
  setFiles: (files: File[]) => void;
  error: string | null;
  maxTotalSize: number; // in bytes (for display)
  actualMaxTotalSize: number; // in bytes (for validation)
}

const MultiFileUpload: React.FC<MultiFileUploadProps> = ({
  files,
  setFiles,
  error,
  maxTotalSize,
  actualMaxTotalSize,
}) => {
  const [isChecking, setIsChecking] = useState(false);

  // Check if PDF is password protected
  const checkIfPdfIsPasswordProtected = async (
    file: File
  ): Promise<boolean> => {
    // Skip check for non-PDF files
    if (!file.type.includes("pdf")) {
      return false;
    }

    return new Promise((resolve, reject) => {
      const fileReader = new FileReader();

      fileReader.onload = function () {
        try {
          const typedArray = new Uint8Array(this.result as ArrayBuffer);

          // Look for encryption dictionary in the PDF data
          const pdfData = new TextDecoder().decode(
            typedArray.slice(0, Math.min(2000, typedArray.length))
          );

          // This is a simplified check that looks for encryption markers in the PDF header
          // /Encrypt and /EncryptMetadata are common indicators of password protection
          if (
            pdfData.includes("/Encrypt") ||
            pdfData.includes("/EncryptMetadata") ||
            pdfData.includes("/Encryption")
          ) {
            resolve(true);
          } else {
            resolve(false);
          }
        } catch (error) {
          // If we can't read the file structure at all, it might be encrypted
          console.error("Error checking PDF:", error);
          reject(error);
        }
      };

      fileReader.onerror = function () {
        reject(new Error(`Failed to read file: ${file.name}`));
      };

      fileReader.readAsArrayBuffer(file);
    });
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = Array.from(e.target.files || []);
    const currentTotalSize = files.reduce((acc, file) => acc + file.size, 0);
    const newTotalSize =
      selectedFiles.reduce((acc, file) => acc + file.size, 0) +
      currentTotalSize;

    if (newTotalSize > actualMaxTotalSize) {
      e.target.value = ""; // Reset input
      setFiles([...files]); // Keep existing files
      toast.error("Total file size exceeds the max limit");
      return;
    }

    // Check if files are valid PDF types
    const allPdfFiles = selectedFiles.every(
      (file) => file.type === "application/pdf"
    );

    if (!allPdfFiles) {
      e.target.value = "";
      setFiles([...files]); // Keep existing files
      toast.error("Only PDF files are accepted");
      return;
    }

    setIsChecking(true);

    try {
      // Check each PDF file for password protection
      for (const file of selectedFiles) {
        try {
          const isPasswordProtected = await checkIfPdfIsPasswordProtected(file);
          if (isPasswordProtected) {
            toast.error(
              `"${file.name}" appears to be password protected. Please remove the password protection and try again.`
            );
            e.target.value = "";
            setIsChecking(false);
            return;
          }
        } catch (error) {
          console.error("Error checking PDF:", error);
          toast.error(
            `Error reading "${file.name}". The file might be corrupted.`
          );
          e.target.value = "";
          setIsChecking(false);
          return;
        }
      }

      // All validations passed, add files
      setFiles([...files, ...selectedFiles]);
    } catch (error) {
      console.error("Error processing files:", error);
      toast.error("An error occurred while processing files");
    } finally {
      e.target.value = ""; // Reset input for future selections
      setIsChecking(false);
    }
  };

  const removeFile = (index: number) => {
    setFiles(files.filter((_, i) => i !== index));
  };

  const calculateTotalSize = useCallback(() => {
    return files.reduce((acc, file) => acc + file.size, 0);
  }, [files]);

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <input
          type="file"
          onChange={handleFileChange}
          accept=".pdf"
          multiple
          className="hidden"
          id="file-upload"
          disabled={isChecking}
        />
        <label
          htmlFor="file-upload"
          className={`inline-flex items-center justify-center rounded-md text-sm font-medium ring-offset-white transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400 focus-visible:ring-offset-2 ${
            isChecking
              ? "opacity-50 cursor-not-allowed bg-blue-400"
              : "bg-blue-600 text-white hover:bg-blue-700 active:bg-blue-800 cursor-pointer"
          } h-10 px-4 py-2`}
        >
          {isChecking ? "Checking files..." : "Add File"}
        </label>
        <div className="text-sm text-gray-500">
          Total size: {formatFileSize(calculateTotalSize())} /{" "}
          {formatFileSize(maxTotalSize)}
        </div>
      </div>

      {files.length > 0 && (
        <div className="space-y-2">
          {files.map((file, index) => (
            <div
              key={index}
              className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border border-gray-200"
            >
              <div className="flex items-center space-x-3">
                <FileText size={16} className="text-blue-500" />
                <span className="text-sm font-medium">{file.name}</span>
                <span className="text-xs text-gray-500">
                  {formatFileSize(file.size)}
                </span>
              </div>
              <button
                onClick={() => removeFile(index)}
                className="text-gray-500 hover:text-red-500 transition-colors rounded-full hover:bg-gray-100 p-1"
                aria-label="Remove file"
              >
                <X size={16} />
              </button>
            </div>
          ))}
        </div>
      )}

      {error && (
        <Alert variant="destructive" className="mt-2">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <p className="text-xs text-gray-500 mt-2">
        Note: Each file must be a test report for the same client. Reports
        should be from different tests but not from different time periods. Only
        PDF files are supported. Password-protected PDFs are not supported.
      </p>
    </div>
  );
};

export default MultiFileUpload;

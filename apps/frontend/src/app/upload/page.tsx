"use client";

import { useState } from "react";
import { apiFetch } from "../../../lib/api";
import { FileUpload } from "@/components/application/file-upload/file-upload-base";
import toast from 'react-hot-toast';

export default function BrandFileUploader() {
  const [uploadedFiles, setUploadedFiles] = useState<File[]>([]);
  const [errors, setErrors] = useState<string[]>([]);
  const [fileProgress, setFileProgress] = useState<Record<string, number>>({});
  const handleDropFiles = (files: FileList) => {
    const fileArray = Array.from(files);
    console.log("handleDropFiles received:", fileArray.length, "files:", fileArray.map(f => f.name));

    setUploadedFiles(prev => [...prev, ...fileArray]);
    toast.success(`${fileArray.length} file(s) added for upload`);

    fileArray.forEach(file => {
      const fileId = `${file.name}-${file.lastModified}`;
      setFileProgress(prev => ({ ...prev, [fileId]: 0}));
      uploadFile(file, fileId);
    });
  };

  const handleDropFilesUnaccepted = (files: FileList) => {
    const fileArray = Array.from(files);

    toast.error(`${fileArray.length} file(s) rejected - invalid file type`);

    const errorMessages = fileArray.map(file =>
      `File "${file.name}" is not supported. Please upload PDF, TXT, or an image`
    );

    setErrors(prev => [...prev, ...errorMessages]);
    console.error("Rejected files:", fileArray);

    setTimeout(() => setErrors([]), 5000);
  };

  const handleSizeLimitExceed = (files: FileList) => {
    const fileArray = Array.from(files);
    toast.error(`${fileArray.length} file(s) too large - max 10MB per file`);
    console.error("Oversized files:", fileArray);
  };

  const uploadFile = async (file: File, fileId: string) => {
    const formData = new FormData();
    formData.append('file', file);

    try {
      const interval = setInterval(() => {
        setFileProgress(prev => {
          const currentProgress = prev[fileId] || 0;
          if (currentProgress >= 100) {
            clearInterval(interval);
            return prev;
          }

          return { ...prev, [fileId]: currentProgress + 10 };
        });
      }, 200);      await apiFetch('/upload/', {
        method: 'POST',
        body: formData,
      });
      
      clearInterval(interval);
      setFileProgress(prev => ({ ...prev, [fileId]: 100 }));

      toast.success(`${file.name} uploaded successfully!`)
    } catch (error) {
      console.error('Upload failed:', error);
      setFileProgress(prev => ({ ...prev, [fileId]: -1 }));
      
      toast.error(`Failed to upload ${file.name}`)
    }
  }

  return (
    <div className="flex flex-col justify-center items-center min-h-screen">
      <p className="text-4xl">
        Upload Brand Style Files
      </p>
      <p className="mb-2">
        Any files you think best represent your brands style/voice will be helpful!
      </p>
      <FileUpload.Root>
        <FileUpload.DropZone
          className="hover:bg-neutral-600/30 hover:ring-purple-200 hover:ring-4"
          hint="Upload brand style related files (Images, PDFs, TXT)"
          accept=".pdf, .txt, image/*"
          allowsMultiple={true}
          maxSize={10 * 1024 * 1024}
          onDropFiles={handleDropFiles}
          onDropUnacceptedFiles={handleDropFilesUnaccepted}
          onSizeLimitExceed={handleSizeLimitExceed}
        />
        <FileUpload.List>
          {uploadedFiles.map(file => {
            const fileId = `${file.name}-${file.lastModified}`;
            const progress = fileProgress[fileId] || 0;
            const failed = progress === -1;

            return (
              <FileUpload.ListItemProgressBar
                key={fileId}
                name={file.name}
                size={file.size}
                progress={failed ? 0 : progress}
                failed={failed}
                onDelete={() => {
                  setUploadedFiles(prev => prev.filter(f =>
                    `${f.name}-${f.lastModified}` !== fileId
                  ));

                  setFileProgress(prev => {
                    const { [fileId]: _, ...rest } = prev;
                    return rest;
                  });
                }}
                onRetry={() => {
                  setFileProgress(prev => ({ ...prev, [fileId]: 0}));
                  uploadFile(file, fileId);
                }}
              />
            )
          })}
        </FileUpload.List>
      </FileUpload.Root>
    </div>
  );
}

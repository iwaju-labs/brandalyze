"use client";

import { useState, useEffect } from "react";
import { useUser } from "@clerk/nextjs";
import { useRouter } from "next/navigation";
import { apiFetch } from "../../../lib/api";
import { FileUpload } from "@/components/application/file-upload/file-upload-base";
import toast from "react-hot-toast";
import AnalysisResultCard from "@/components/text-analysis/analysis-results-card";

interface AnalysisResults {
  word_count: number;
  character_count: number;
  chunks_created: number;
  extraction_successful: boolean;
  text_preview: string;
}

export interface UploadResponse {
  file_info?: {
    filename: string;
    size: number;
    detected_type: string;
  };
  input_info?: {
    input_type: string;
    length: number;
  };
  analysis: AnalysisResults;
}

export default function BrandFileUploader() {
  const { isLoaded, isSignedIn, user } = useUser();
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<"file" | "text">("file");
  const [uploadedFiles, setUploadedFiles] = useState<File[]>([]);
  const [fileProgress, setFileProgress] = useState<Record<string, number>>({});
  const [textInput, setTextInput] = useState("");
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisResults, setAnalysisResults] = useState<UploadResponse[]>([]);

  useEffect(() => {
    if (isLoaded && !isSignedIn) {
      router.push("/sign-in");
    }
  }, [isLoaded, isSignedIn, router]);

  if (!isLoaded) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        Loading...
      </div>
    );
  }

  if (!isSignedIn) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        Redirecting...
      </div>
    );
  }

  const handleDropFiles = (files: FileList) => {
    const fileArray = Array.from(files);
    console.log(
      "handleDropFiles received:",
      fileArray.length,
      "files:",
      fileArray.map((f) => f.name)
    );

    setUploadedFiles((prev) => [...prev, ...fileArray]);
    toast.success(`${fileArray.length} file(s) added for upload`);

    fileArray.forEach((file) => {
      const fileId = `${file.name}-${file.lastModified}`;
      setFileProgress((prev) => ({ ...prev, [fileId]: 0 }));
      uploadFile(file, fileId);
    });
  };
  const handleDropFilesUnaccepted = (files: FileList) => {
    const fileArray = Array.from(files);
    toast.error(`${fileArray.length} file(s) rejected - invalid file type`);
    console.error("Rejected files:", fileArray);
  };

  const handleSizeLimitExceed = (files: FileList) => {
    const fileArray = Array.from(files);
    toast.error(`${fileArray.length} file(s) too large - max 10MB per file`);
    console.error("Oversized files:", fileArray);
  };

  const handleTextAnalysis = async () => {
    if (!textInput.trim()) {
      toast.error("Please entre some text to analyse");
      return;
    }

    setIsAnalyzing(true);
    try {
      const response = await apiFetch("/analyze/text", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: textInput }),
      });

      setAnalysisResults((prev) => [response.data, ...prev]);
      toast.success(
        `Text analyzed - ${response.data.analysis.word_count} words processed`
      );
      setTextInput("");
    } catch (error) {
      console.error("Text analysis failed:", error);
      toast.error("Failed to analyze text");
    } finally {
      setIsAnalyzing(false);
    }
  };

  const uploadFile = async (file: File, fileId: string) => {
    const formData = new FormData();
    formData.append("file", file);

    try {
      const interval = setInterval(() => {
        setFileProgress((prev) => {
          const currentProgress = prev[fileId] || 0;
          if (currentProgress >= 100) {
            clearInterval(interval);
            return prev;
          }

          return { ...prev, [fileId]: currentProgress + 10 };
        });
      }, 200);

      const response = await apiFetch("/upload/brand-style", {
        method: "POST",
        body: formData,
      });

      setAnalysisResults((prev) => [response.data, ...prev]);

      clearInterval(interval);
      setFileProgress((prev) => ({ ...prev, [fileId]: 100 }));

      toast.success(`${file.name} uploaded successfully!`);
    } catch (error) {
      console.error("Upload failed:", error);
      setFileProgress((prev) => ({ ...prev, [fileId]: -1 }));

      toast.error(`Failed to upload ${file.name}`);
    }
  };
  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto max-w-4xl px-4 py-8">
        {" "}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-foreground">
            Welcome back, {user?.firstName || "User"}!
          </h1>
          <p className="mt-2 text-gray-500">
            Upload your brand samples to get started with consistency analysis.
          </p>
        </div>
        {/* Tab Navigator */}
        <div className="mb-6">
          <div className="border-b border-gray-200">
            <nav className="-mb-px flex space-x-4">
              <button
                onClick={() => setActiveTab("file")}
                className={`py-2 px-1, border-b-2 font-medium text-sm ${
                  activeTab === "file"
                    ? "border-purple-500 text-purple-600"
                    : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                }`}
              >
                File Upload
              </button>
              <button
                onClick={() => setActiveTab("text")}
                className={`py-2 px-1 border-b-2 font-medium text-sm ${
                  activeTab === "text"
                    ? "border-purple-500 text-purple-600"
                    : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                }`}
              >
                Text Input
              </button>
            </nav>
          </div>
        </div>
        {/* File Upload Tab */}
        {activeTab === "file" && (
          <div className="flex flex-col justify-center items-center">
            <p className="text-4xl text-foreground">Upload Brand Style Files</p>
            <p className="mb-2 text-gray-500">
              Any files you think best represent your brands style/voice will be
              helpful!
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
                {uploadedFiles.map((file) => {
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
                        setUploadedFiles((prev) =>
                          prev.filter(
                            (f) => `${f.name}-${f.lastModified}` !== fileId
                          )
                        );
                        setFileProgress((prev) => {
                          const newProgress = { ...prev };
                          delete newProgress[fileId];
                          return newProgress;
                        });
                      }}
                      onRetry={() => {
                        setFileProgress((prev) => ({ ...prev, [fileId]: 0 }));
                        uploadFile(file, fileId);
                      }}
                    />
                  );
                })}
              </FileUpload.List>
            </FileUpload.Root>
          </div>
        )}{" "}
        {/* Text Input Tab */}
        {activeTab === "text" && (
          <div className="space-y-4">
            <div>
              <label
                htmlFor="text-input"
                className="block text-lg font-medium text-foreground"
              >
                Enter Brand Text Content
              </label>
              <p className="text-sm text-gray-500 mb-4">
                Enter any text content that represents your brand&apos;s style,
                voice, or messaging
              </p>
              <textarea
                id="text-input"
                value={textInput}
                onChange={(e) => setTextInput(e.target.value)}
                placeholder="Paste your brand content here... (marketing copy, blog posts, social media posts, etc.)"
                className="w-full min-h-[200px] p-3 border border-gray-300 rounded-md focus:ring-4 focus:ring-purple-500/50 focus:border-transparent"
                maxLength={50000}
              />
              <div className="flex justify-between items-center mt-2">
                <span className="text-sm text-gray-500">
                  {textInput.length.toLocaleString()} / 50,000 characters
                </span>
                <span className="text-sm text-gray-500">
                  {
                    textInput
                      .trim()
                      .split(/\s+/)
                      .filter((word) => word.length > 0).length
                  }{" "}
                  words
                </span>
              </div>
            </div>
            <button
              onClick={handleTextAnalysis}
              disabled={isAnalyzing || !textInput.trim()}
              className="px-6 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isAnalyzing ? "Analyzing..." : "Analyze Text"}
            </button>
          </div>
        )}
        {/* Analysis Results */}
        {analysisResults.length > 0 && (
          <div className="mt-8">
            <h2 className="text-2xl font-bold text-black mb-4">
              Analysis Results
            </h2>
            <div className="space-y-4">
              {analysisResults.map((result, index) => (
                <AnalysisResultCard key={index} result={result} />
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

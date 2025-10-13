"use client";

import { useState, useEffect } from "react";
import { useUser } from "@clerk/nextjs";
import { useRouter } from "next/navigation";
import { apiFetch } from "../../../lib/api";
import { FileUpload } from "@/components/application/file-upload/file-upload-base";
import toast from "react-hot-toast";
import AnalysisResultCard from "@/components/text-analysis/analysis-results-card";

interface AnalysisResult {
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
  analysis: AnalysisResult;
}

interface BrandAnalysisResult {
  alignment_score: number;
  feedback: {
    ai_feedback: string;
    tone_analysis: string;
    suggestions_count: number;
  };
  brand_samples_analyzed: number;
  analysis_succesful: boolean;
  error?: string;
}

export interface BrandAnalysisResponse {
  brand_analysis: BrandAnalysisResult;
  input_info: {
    new_text_length: number;
    brand_samples_count: number;
    analysis_type: string;
  };
}

export default function BrandFileUploader() {
  const { isLoaded, isSignedIn, user } = useUser();
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<"file" | "text" | "comparison">(
    "file"
  );
  const [uploadedFiles, setUploadedFiles] = useState<File[]>([]);
  const [fileProgress, setFileProgress] = useState<Record<string, number>>({});
  const [textInput, setTextInput] = useState("");
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisResults, setAnalysisResults] = useState<UploadResponse[]>([]);

  // brand comparison
  const [brandSamples, setBrandSamples] = useState<string[]>([""]);
  const [newTextForComparison, setNewTextForComparison] = useState("");
  const [brandAnalysisResult, setBrandAnalysisResult] =
    useState<BrandAnalysisResponse | null>(null);

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

  const handleBrandComparison = async () => {
    const filteredSamples = brandSamples.filter(
      (sample) => sample.trim().length > 0
    );
    if (filteredSamples.length === 0) {
      toast.error("Please add at least one brand sample");
      return;
    }
    if (!newTextForComparison.trim()) {
      toast.error("Please enter text to analyze");
      return;
    }
    setIsAnalyzing(true);
    try {
      const response = await apiFetch("/analyze/brand-alignment", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          new_text: newTextForComparison,
          brand_samples: filteredSamples,
        }),
      });
      setBrandAnalysisResult(response.data);
      toast.success(
        `Analysis complete - Alignment: ${response.data.brand_analysis.alignment_score}/100`
      );
    } catch (error) {
      console.error("Brand analysis failed:", error);
      toast.error("Failed to analyze brand alignment");
    } finally {
      setIsAnalyzing(false);
    }
  };
  const addBrandSample = () => {
    setBrandSamples([...brandSamples, ""]);
  };
  const updateBrandSample = (index: number, value: string) => {
    const updated = [...brandSamples];
    updated[index] = value;
    setBrandSamples(updated);
  };
  const removeBrandSample = (index: number) => {
    setBrandSamples(brandSamples.filter((_, i) => i !== index));
  };
  const uploadFile = async (file: File, fileId: string) => {
    const formData = new FormData();
    formData.append("file", file);

    let interval: NodeJS.Timeout | undefined;

    try {
      // Start progress simulation but stop at 90% to wait for response
      interval = setInterval(() => {
        setFileProgress((prev) => {
          const currentProgress = prev[fileId] || 0;
          if (currentProgress >= 90) {
            return prev; // Stop at 90% and wait for actual response
          }
          return { ...prev, [fileId]: currentProgress + 10 };
        });
      }, 200);

      const response = await apiFetch("/upload/brand-style", {
        method: "POST",
        body: formData,
      });

      // Clear interval and set to 100% on success
      clearInterval(interval);
      setFileProgress((prev) => ({ ...prev, [fileId]: 100 }));

      setAnalysisResults((prev) => [response.data, ...prev]);
      toast.success(`${file.name} uploaded successfully!`);
    } catch (error) {
      // Clear interval and set to failed state
      if (interval) clearInterval(interval);
      setFileProgress((prev) => ({ ...prev, [fileId]: -1 }));

      console.error("Upload failed:", error);
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
              <button
                onClick={() => setActiveTab("comparison")}
                className={`py-2 px-1 border-b-2 font-medium text-sm ${
                  activeTab === "comparison"
                    ? "border-purple-500 text-purple-600"
                    : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                }`}
              >
                Brand Comparison
              </button>
            </nav>
          </div>
        </div>{" "}
        {/* File Upload Tab */}
        {activeTab === "file" && (
          <div className="space-y-4">
            {" "}
            <div>
              <div className="block text-lg font-medium text-foreground">
                Upload Brand Style Files
              </div>
              <p className="text-sm text-gray-500 mb-4">
                Any files you think best represent your brand&apos;s style/voice
                will be helpful!
              </p>{" "}
              <FileUpload.Root>
                <FileUpload.DropZone
                  className="hover:bg-neutral-600/30 hover:ring-purple-200 hover:ring-4"
                  hint="PDF, TXT, DOCX, and MD files supported (max 10MB each)"
                  accept=".pdf,.txt,.docx,.md,.markdown"
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
                          const fileFilter = (f: File) =>
                            `${f.name}-${f.lastModified}` !== fileId;
                          setUploadedFiles((prev) => prev.filter(fileFilter));
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
        {/* Brand Comparison Tab */}
        {activeTab === "comparison" && (
          <div className="space-y-6">
            <div>
              <h2 className="text-2xl font-bold text-foreground mb-4">
                Brand Voice Comparison
              </h2>
              <p className="text-gray-500 mb-6">
                Add your brand samples below, then enter new content to see how
                well it aligns with your brand voice.
              </p>
            </div>{" "}
            <div>
              <div className="block text-lg font-medium text-foreground mb-2">
                Brand Samples
              </div>
              <p className="text-sm text-gray-500 mb-4">
                Add 2-5 examples of your brand&apos;s writing style (marketing
                copy, social posts, etc.)
              </p>{" "}
              {brandSamples.map((sample, index) => (
                <div
                  key={`brand-sample-${
                    sample.substring(0, 20) || "empty"
                  }-${index}`}
                  className="mb-4"
                >
                  <div className="flex items-start space-x-2">
                    <div className="flex-1">
                      <textarea
                        value={sample}
                        onChange={(e) =>
                          updateBrandSample(index, e.target.value)
                        }
                        placeholder={`Brand sample ${index + 1}...`}
                        className="w-full h-24 p-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-purple-500 focus:border-transparent resize-none"
                        maxLength={2000}
                      />
                      <div className="text-xs text-gray-400 mt-1">
                        {sample.length}/2000 characters
                      </div>
                    </div>
                    {brandSamples.length > 1 && (
                      <button
                        onClick={() => removeBrandSample(index)}
                        className="p-2 text-red-500 hover:text-red-700"
                      >
                        ×
                      </button>
                    )}
                  </div>
                </div>
              ))}
              {brandSamples.length < 5 && (
                <button
                  onClick={addBrandSample}
                  className="px-4 py-2 text-purple-600 border border-purple-600 rounded-md hover:bg-purple-50"
                >
                  + Add Brand Sample
                </button>
              )}
            </div>{" "}
            <div>
              <label
                htmlFor="new-content-textarea"
                className="block text-lg font-medium text-foreground mb-2"
              >
                New Content to Analyze
              </label>
              <p className="text-sm text-gray-500 mb-4">
                Enter the new content you want to check for brand alignment
              </p>{" "}
              <textarea
                id="new-content-textarea"
                value={newTextForComparison}
                onChange={(e) => setNewTextForComparison(e.target.value)}
                placeholder="Enter your new content here..."
                className="w-full h-32 p-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-purple-500 focus:border-transparent resize-none"
                maxLength={5000}
              />
              <div className="flex justify-between items-center mt-2">
                <span className="text-sm text-gray-500">
                  {newTextForComparison.length.toLocaleString()} / 5,000
                  characters
                </span>
                <span className="text-sm text-gray-500">
                  {
                    newTextForComparison
                      .trim()
                      .split(/\s+/)
                      .filter((word) => word.length > 0).length
                  }{" "}
                  words
                </span>
              </div>
            </div>
            <button
              onClick={handleBrandComparison}
              disabled={
                isAnalyzing ||
                brandSamples.filter((s) => s.trim()).length === 0 ||
                !newTextForComparison.trim()
              }
              className="px-6 py-3 bg-purple-600 text-white rounded-md hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed font-medium"
            >
              {isAnalyzing
                ? "Analyzing Brand Alignment..."
                : "Analyze Brand Alignment"}
            </button>
            {brandAnalysisResult && (
              <div className="mt-8 bg-white border border-gray-200 rounded-lg p-6 shadow-sm">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-xl font-bold text-gray-900">
                    Brand Alignment Analysis
                  </h3>{" "}
                  <div className="flex items-center space-x-2">
                    {(() => {
                      const score =
                        brandAnalysisResult.brand_analysis.alignment_score;
                      let scoreColorClasses = "";
                      if (score >= 70) {
                        scoreColorClasses = "bg-green-100 text-green-800";
                      } else if (score >= 50) {
                        scoreColorClasses = "bg-yellow-100 text-yellow-800";
                      } else {
                        scoreColorClasses = "bg-red-100 text-red-800";
                      }
                      return (
                        <div
                          className={`w-16 h-16 rounded-full flex items-center justify-center text-2xl font-bold ${scoreColorClasses}`}
                        >
                          {score}
                        </div>
                      );
                    })()}
                    <div className="text-right">
                      <div className="text-sm text-gray-500">
                        Alignment Score
                      </div>
                      <div className="text-lg font-semibold text-gray-900">
                        {
                          brandAnalysisResult.brand_analysis.feedback
                            .tone_analysis
                        }
                      </div>
                    </div>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4 mb-6">
                  <div className="text-center">
                    <div className="text-2xl font-bold text-purple-600">
                      {brandAnalysisResult.input_info.brand_samples_count}
                    </div>
                    <div className="text-sm text-gray-500">Brand Samples</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-blue-600">
                      {brandAnalysisResult.input_info.new_text_length.toLocaleString()}
                    </div>
                    <div className="text-sm text-gray-500">
                      Characters Analyzed
                    </div>
                  </div>
                </div>
                <div>
                  <h4 className="text-lg font-semibold text-gray-900 mb-3">
                    AI Feedback
                  </h4>
                  <div className="bg-gray-50 p-4 rounded-md">
                    <p className="text-gray-700 whitespace-pre-line">
                      {brandAnalysisResult.brand_analysis.feedback.ai_feedback}
                    </p>
                  </div>
                </div>
                <div className="mt-6">
                  <h4 className="text-lg font-semibold text-gray-900 mb-3">
                    Suggestions
                  </h4>
                  <div className="bg-gray-50 p-4 rounded-md">
                    <p className="text-gray-700">
                      {brandAnalysisResult.brand_analysis.feedback
                        .suggestions_count > 0
                        ? `${
                            brandAnalysisResult.brand_analysis.feedback
                              .suggestions_count
                          } improvement suggestion${
                            brandAnalysisResult.brand_analysis.feedback
                              .suggestions_count > 1
                              ? "s"
                              : ""
                          } provided.`
                        : "No suggestions needed. Content aligns well with brand."}
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
        {/* Analysis Results */}
        {analysisResults.length > 0 && (
          <div className="mt-8">
            <h2 className="text-2xl font-bold text-black mb-4">
              Analysis Results
            </h2>{" "}
            <div className="space-y-4">
              {analysisResults.map((result, index) => (
                <AnalysisResultCard
                  key={
                    result.file_info?.filename ||
                    result.input_info?.input_type ||
                    `analysis-${index}`
                  }
                  result={result}
                />
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

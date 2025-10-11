import { UploadResponse } from "@/app/upload/page";

interface AnalysisResultCardProps {
  result: UploadResponse;
}

export default function AnalysisResultCard({ result }: Readonly<AnalysisResultCardProps>) {
  const isFileUpload = !!result.file_info;
  
  return (
    <div className="bg-white border border-gray-200 rounded-lg p-6 shadow-sm">
      <div className="flex items-start justify-between mb-4">
        <div>
          <h3 className="text-lg font-semibold text-gray-900">
            {isFileUpload ? result.file_info!.filename : 'Direct Text Input'}
          </h3>
          <p className="text-sm text-gray-500">
            {isFileUpload 
              ? `${result.file_info!.detected_type.toUpperCase()} • ${(result.file_info!.size / 1024).toFixed(1)} KB`
              : `${result.input_info!.length.toLocaleString()} characters`
            }
          </p>
        </div>
        <div className={`px-2 py-1 rounded-full text-xs font-medium ${
          result.analysis.extraction_successful 
            ? 'bg-green-100 text-green-800' 
            : 'bg-red-100 text-red-800'
        }`}>
          {result.analysis.extraction_successful ? 'Success' : 'Failed'}
        </div>
      </div>

      <div className="grid grid-cols-3 gap-4 mb-4">
        <div className="text-center">
          <p className="text-2xl font-bold text-purple-600">
            {result.analysis.word_count.toLocaleString()}
          </p>
          <p className="text-sm text-gray-500">Words</p>
        </div>
        <div className="text-center">
          <p className="text-2xl font-bold text-blue-600">
            {result.analysis.character_count.toLocaleString()}
          </p>
          <p className="text-sm text-gray-500">Characters</p>
        </div>
        <div className="text-center">
          <p className="text-2xl font-bold text-green-600">
            {result.analysis.chunks_created}
          </p>
          <p className="text-sm text-gray-500">Text Chunks</p>
        </div>
      </div>

      {result.analysis.text_preview && (
        <div>
          <h4 className="text-sm font-medium text-gray-900 mb-2">Preview</h4>
          <p className="text-sm text-gray-600 bg-gray-50 p-3 rounded border-l-4 border-purple-500">
            {result.analysis.text_preview}
          </p>
        </div>
      )}
    </div>
  );
}
'use client';

import { useState, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { useRouter } from 'next/navigation';
import { Upload, File, X, CheckCircle, AlertCircle, Loader2 } from 'lucide-react';
import toast from 'react-hot-toast';

interface UploadFile {
  file: File;
  status: 'pending' | 'uploading' | 'processing' | 'done' | 'error';
  progress: number;
  documentId?: string;
  error?: string;
}

export default function UploadPage() {
  const router = useRouter();
  const [files, setFiles] = useState<UploadFile[]>([]);
  const [isUploading, setIsUploading] = useState(false);

  const onDrop = useCallback((acceptedFiles: File[]) => {
    const newFiles = acceptedFiles.map((file) => ({
      file,
      status: 'pending' as const,
      progress: 0,
    }));
    setFiles((prev) => [...prev, ...newFiles]);
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { 'application/pdf': ['.pdf'] },
    multiple: true,
  });

  const removeFile = (index: number) => {
    setFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const uploadFiles = async () => {
    if (files.length === 0) return;
    setIsUploading(true);

    for (let i = 0; i < files.length; i++) {
      const uploadFile = files[i];
      if (uploadFile.status !== 'pending') continue;

      try {
        // Update status to uploading
        setFiles((prev) =>
          prev.map((f, idx) => (idx === i ? { ...f, status: 'uploading', progress: 10 } : f))
        );

        // Get pre-signed URL
        const urlRes = await fetch('/api/uploads', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ filename: uploadFile.file.name, contentType: uploadFile.file.type }),
        });
        const { uploadUrl, documentId } = await urlRes.json();

        // Upload to S3
        await fetch(uploadUrl, {
          method: 'PUT',
          body: uploadFile.file,
          headers: { 'Content-Type': uploadFile.file.type },
        });

        setFiles((prev) =>
          prev.map((f, idx) => (idx === i ? { ...f, status: 'processing', progress: 60, documentId } : f))
        );

        // Trigger extraction
        await fetch(`/api/documents/${documentId}/process`, { method: 'POST' });

        setFiles((prev) =>
          prev.map((f, idx) => (idx === i ? { ...f, status: 'done', progress: 100, documentId } : f))
        );

        toast.success(`${uploadFile.file.name} uploaded and processing started`);
      } catch (error) {
        setFiles((prev) =>
          prev.map((f, idx) =>
            idx === i ? { ...f, status: 'error', error: 'Upload failed. Please try again.' } : f
          )
        );
        toast.error(`Failed to upload ${uploadFile.file.name}`);
      }
    }

    setIsUploading(false);
  };

  const allDone = files.length > 0 && files.every((f) => f.status === 'done');
  const hasPending = files.some((f) => f.status === 'pending');

  return (
    <div className="max-w-3xl mx-auto px-4 py-12">
      <div className="mb-8">
        <h1 className="text-2xl font-semibold text-white">Upload Bond Documents</h1>
        <p className="text-gray-400 text-sm mt-1">
          Upload PDF prospectuses, indentures, or offering memoranda for AI covenant extraction
        </p>
      </div>

      {/* Dropzone */}
      <div
        {...getRootProps()}
        className={`border-2 border-dashed rounded-xl p-12 text-center cursor-pointer transition-colors ${
          isDragActive
            ? 'border-blue-500 bg-blue-950/20'
            : 'border-gray-700 hover:border-gray-600 bg-gray-900/50'
        }`}
      >
        <input {...getInputProps()} />
        <Upload className="h-10 w-10 text-gray-500 mx-auto mb-4" />
        {isDragActive ? (
          <p className="text-blue-400 font-medium">Drop the files here...</p>
        ) : (
          <>
            <p className="text-gray-300 font-medium">Drag and drop PDF files here</p>
            <p className="text-gray-500 text-sm mt-1">or click to browse files</p>
            <p className="text-gray-600 text-xs mt-3">PDF files only • Multiple files supported</p>
          </>
        )}
      </div>

      {/* File List */}
      {files.length > 0 && (
        <div className="mt-6 space-y-3">
          {files.map((uploadFile, index) => (
            <div
              key={index}
              className="flex items-center gap-3 bg-gray-900 border border-gray-800 rounded-lg px-4 py-3"
            >
              <File className="h-4 w-4 text-gray-400 flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-sm text-white truncate">{uploadFile.file.name}</p>
                <p className="text-xs text-gray-500">
                  {(uploadFile.file.size / 1024 / 1024).toFixed(1)} MB
                </p>
                {uploadFile.status === 'uploading' || uploadFile.status === 'processing' ? (
                  <div className="mt-1.5 h-1 bg-gray-800 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-blue-500 rounded-full transition-all duration-300"
                      style={{ width: `${uploadFile.progress}%` }}
                    />
                  </div>
                ) : null}
                {uploadFile.error && (
                  <p className="text-xs text-red-400 mt-0.5">{uploadFile.error}</p>
                )}
              </div>
              <div className="flex items-center gap-2">
                {uploadFile.status === 'pending' && (
                  <span className="text-xs text-gray-500">Ready</span>
                )}
                {(uploadFile.status === 'uploading' || uploadFile.status === 'processing') && (
                  <Loader2 className="h-4 w-4 text-blue-400 animate-spin" />
                )}
                {uploadFile.status === 'done' && (
                  <CheckCircle className="h-4 w-4 text-green-400" />
                )}
                {uploadFile.status === 'error' && (
                  <AlertCircle className="h-4 w-4 text-red-400" />
                )}
                {uploadFile.status === 'pending' && (
                  <button
                    onClick={() => removeFile(index)}
                    className="text-gray-600 hover:text-gray-400 transition-colors"
                  >
                    <X className="h-4 w-4" />
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Actions */}
      <div className="mt-6 flex items-center gap-3">
        {hasPending && (
          <button
            onClick={uploadFiles}
            disabled={isUploading}
            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-white px-6 py-2.5 rounded-lg text-sm font-medium transition-colors"
          >
            {isUploading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Processing...
              </>
            ) : (
              <>
                <Upload className="h-4 w-4" />
                Upload {files.filter((f) => f.status === 'pending').length} file
                {files.filter((f) => f.status === 'pending').length > 1 ? 's' : ''}
              </>
            )}
          </button>
        )}
        {allDone && (
          <button
            onClick={() => router.push('/dashboard')}
            className="flex items-center gap-2 bg-green-700 hover:bg-green-600 text-white px-6 py-2.5 rounded-lg text-sm font-medium transition-colors"
          >
            <CheckCircle className="h-4 w-4" />
            Go to Dashboard
          </button>
        )}
      </div>
    </div>
  );
}

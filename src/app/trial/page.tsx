'use client';

import { useState } from 'react';
import { useDropzone } from 'react-dropzone';
import { Upload, FileText, Loader2, AlertCircle, X } from 'lucide-react';
import Link from 'next/link';

export default function TrialPage() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showTokenError, setShowTokenError] = useState(false);
  const [jobDescription, setJobDescription] = useState('');
  const [resumeFile, setResumeFile] = useState<File | null>(null);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    accept: {
      'application/pdf': ['.pdf'],
    },
    maxFiles: 1,
    maxSize: 10 * 1024 * 1024, // 10MB
    onDrop: (acceptedFiles) => {
      if (acceptedFiles.length > 0) {
        setResumeFile(acceptedFiles[0]);
        setError(null);
      }
    },
    onDropRejected: (fileRejections) => {
      setError(fileRejections[0]?.errors[0]?.message || 'Invalid file');
    },
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!resumeFile || !jobDescription) {
      setError('Please provide both resume and job description');
      return;
    }

    setIsLoading(true);
    setError(null);

    // Simulate API call delay for authenticity
    setTimeout(() => {
      setIsLoading(false);
      setShowTokenError(true);
    }, 2000);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-3xl mx-auto">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-4xl font-bold text-gray-900 mb-2">
                Try AIVIA Free
              </h1>
              <p className="text-gray-600">
                Upload your resume and job description to experience our AI interview platform
              </p>
            </div>
            <a
              href="https://mail.google.com/mail/?view=cm&fs=1&to=iutkarshydv@gmail.com&su=Hiring%20Inquiry&body=I'm%20interested%20in%20hiring%20for%20a%20position."
              target="_blank"
              rel="noopener noreferrer"
              className="px-4 py-2 bg-green-600 text-white rounded-lg font-medium hover:bg-green-700 transition-colors"
            >
              Hire Me
            </a>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Resume Upload */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Resume (PDF)
              </label>
              <div
                {...getRootProps()}
                className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors ${
                  isDragActive
                    ? 'border-purple-500 bg-purple-50'
                    : 'border-gray-300 hover:border-gray-400'
                }`}
              >
                <input {...getInputProps()} />
                {resumeFile ? (
                  <div className="flex items-center justify-center gap-2 text-green-600">
                    <FileText className="w-6 h-6" />
                    <span className="font-medium">{resumeFile.name}</span>
                    <span className="text-sm text-gray-500">
                      ({(resumeFile.size / 1024).toFixed(1)} KB)
                    </span>
                  </div>
                ) : (
                  <>
                    <Upload className="w-12 h-12 mx-auto mb-4 text-gray-400" />
                    <p className="text-gray-600">
                      {isDragActive
                        ? 'Drop the PDF here'
                        : 'Drag & drop your resume PDF here, or click to browse'}
                    </p>
                    <p className="text-sm text-gray-500 mt-2">
                      Maximum file size: 10MB
                    </p>
                  </>
                )}
              </div>
            </div>

            {/* Job Description */}
            <div>
              <label
                htmlFor="jobDescription"
                className="block text-sm font-medium text-gray-700 mb-2"
              >
                Job Description
              </label>
              <textarea
                id="jobDescription"
                value={jobDescription}
                onChange={(e) => setJobDescription(e.target.value)}
                rows={10}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                placeholder="Paste the job description here...

Include key requirements, responsibilities, and qualifications."
                required
              />
              <p className="text-sm text-gray-500 mt-2">
                The AI will use this to tailor interview questions
              </p>
            </div>

            {/* Regular Error Message */}
            {error && !showTokenError && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                <p className="text-red-800">{error}</p>
              </div>
            )}

            {/* Token Exhausted Error Modal */}
            {showTokenError && (
              <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
                <div className="bg-white rounded-xl shadow-2xl max-w-md w-full p-6 relative">
                  <button
                    type="button"
                    onClick={() => setShowTokenError(false)}
                    className="absolute top-4 right-4 text-gray-400 hover:text-gray-600"
                    aria-label="Close modal"
                  >
                    <X className="w-5 h-5" />
                  </button>
                  
                  <div className="flex items-start gap-4 mb-4">
                    <div className="flex-shrink-0">
                      <AlertCircle className="w-8 h-8 text-amber-500" />
                    </div>
                    <div>
                      <h3 className="text-xl font-semibold text-gray-900 mb-2">
                        API Token Limit Reached
                      </h3>
                      <p className="text-gray-600 text-sm mb-4">
                        Our free trial tokens have been exhausted for today due to high usage. 
                        This is a temporary limitation to manage server costs.
                      </p>
                      <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 mb-4">
                        <p className="text-sm text-amber-800">
                          <strong>Error Code:</strong> RATE_LIMIT_EXCEEDED<br />
                          <strong>Status:</strong> 429 Too Many Requests
                        </p>
                      </div>
                      <p className="text-gray-700 text-sm mb-4">
                        <strong>Solutions:</strong>
                      </p>
                      <ul className="text-sm text-gray-600 space-y-2 mb-6">
                        <li className="flex items-start gap-2">
                          <span className="text-green-600 mt-0.5">✓</span>
                          <span>Create a free account to get your personal token allocation</span>
                        </li>
                        <li className="flex items-start gap-2">
                          <span className="text-green-600 mt-0.5">✓</span>
                          <span>Access priority processing and unlimited interviews</span>
                        </li>
                        <li className="flex items-start gap-2">
                          <span className="text-green-600 mt-0.5">✓</span>
                          <span>Save and review your interview history</span>
                        </li>
                      </ul>
                    </div>
                  </div>
                  
                  <div className="flex gap-3">
                    <Link
                      href="/sign-up"
                      className="flex-1 py-3 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-lg font-semibold hover:from-purple-700 hover:to-pink-700 transition-colors text-center"
                    >
                      Create Free Account
                    </Link>
                    <button
                      onClick={() => setShowTokenError(false)}
                      className="px-4 py-3 text-gray-600 hover:text-gray-800 transition-colors"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isLoading || !resumeFile || !jobDescription}
              className="w-full py-4 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-lg font-semibold hover:from-purple-700 hover:to-pink-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Initializing AI Interview...
                </>
              ) : (
                'Start Free Trial Interview'
              )}
            </button>

            <p className="text-center text-sm text-gray-500">
              No credit card required • Takes only 2 minutes
            </p>
          </form>
        </div>
      </div>
    </div>
  );
}

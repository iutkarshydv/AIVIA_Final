'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Loader2, Download, ArrowLeft } from 'lucide-react';
import { SessionTranscriptResponse } from '@/types';

export default function ReportPage() {
  const params = useParams();
  const router = useRouter();
  const sessionId = params.id as string;

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<SessionTranscriptResponse | null>(null);

  useEffect(() => {
    fetchReport();
  }, [sessionId]);

  const fetchReport = async () => {
    try {
      const response = await fetch(`/api/session/${sessionId}/transcript`);

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error?.message || 'Failed to fetch report');
      }

      const reportData = await response.json();
      setData(reportData);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  const calculateOverallScore = () => {
    if (!data || data.evaluations.length === 0) return 0;

    const allScores = data.evaluations.flatMap((e) => Object.values(e.scores));
    const sum = allScores.reduce((acc, val) => acc + val, 0);
    return (sum / allScores.length).toFixed(1);
  };

  const getScoreColor = (score: number) => {
    if (score >= 4) return 'text-green-600';
    if (score >= 3) return 'text-yellow-600';
    return 'text-red-600';
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <Loader2 className="w-12 h-12 animate-spin text-blue-600 mx-auto mb-4" />
          <p className="text-gray-600">Loading report...</p>
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="bg-red-50 border border-red-200 rounded-lg p-8 max-w-md">
          <h2 className="text-2xl font-bold text-red-800 mb-4">Error</h2>
          <p className="text-red-700 mb-6">{error || 'Failed to load report'}</p>
          <button
            onClick={() => router.push('/dashboard')}
            className="px-6 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
          >
            Back to Dashboard
          </button>
        </div>
      </div>
    );
  }

  const overallScore = calculateOverallScore();

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-6xl mx-auto">
          {/* Header */}
          <div className="flex items-center justify-between mb-8">
            <button
              onClick={() => router.push('/dashboard')}
              className="flex items-center gap-2 text-gray-600 hover:text-gray-900"
            >
              <ArrowLeft className="w-5 h-5" />
              Back to Dashboard
            </button>
            <button className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
              <Download className="w-5 h-5" />
              Export PDF
            </button>
          </div>

          <h1 className="text-4xl font-bold text-gray-900 mb-2">
            Interview Report
          </h1>
          <p className="text-gray-600 mb-8">
            Session ID: {sessionId} • {new Date(data.session.createdAt).toLocaleDateString()}
          </p>

          {/* Overall Score */}
          <div className="bg-white rounded-lg shadow-md p-8 mb-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">
              Overall Performance
            </h2>
            <div className="flex items-center gap-8">
              <div className="text-center">
                <div className={`text-6xl font-bold ${getScoreColor(Number(overallScore))}`}>
                  {overallScore}
                </div>
                <div className="text-gray-600 text-sm">out of 5.0</div>
              </div>
              <div className="flex-1">
                <p className="text-gray-700 mb-4">
                  {Number(overallScore) >= 4
                    ? 'Excellent performance! Strong candidate with demonstrated expertise.'
                    : Number(overallScore) >= 3
                    ? 'Good performance. Meets requirements with room for growth.'
                    : 'Below expectations. Significant gaps in knowledge or communication.'}
                </p>
                <div className="text-sm text-gray-600">
                  <span className="font-semibold">Status:</span> {data.session.status} •{' '}
                  <span className="font-semibold">Questions Evaluated:</span>{' '}
                  {data.evaluations.length}
                </div>
              </div>
            </div>
          </div>

          {/* Detailed Evaluations */}
          <div className="bg-white rounded-lg shadow-md p-8 mb-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-6">
              Detailed Evaluations
            </h2>
            <div className="space-y-6">
              {data.evaluations.map((evaluation, idx) => (
                <div key={idx} className="border-l-4 border-blue-500 pl-6">
                  <h3 className="font-semibold text-gray-900 mb-3">
                    {evaluation.questionId || `Question ${idx + 1}`}
                  </h3>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-3">
                    {Object.entries(evaluation.scores).map(([key, value]) => (
                      <div key={key} className="text-sm">
                        <div className="text-gray-600 capitalize mb-1">
                          {key.replace(/([A-Z])/g, ' $1').trim()}
                        </div>
                        <div className={`font-semibold ${getScoreColor(value)}`}>
                          {value}/5
                        </div>
                      </div>
                    ))}
                  </div>
                  <p className="text-gray-700 italic">"{evaluation.rationale}"</p>
                </div>
              ))}
            </div>
          </div>

          {/* Full Transcript */}
          <div className="bg-white rounded-lg shadow-md p-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-6">
              Full Transcript
            </h2>
            <div className="space-y-4">
              {data.transcripts.map((transcript, idx) => (
                <div
                  key={idx}
                  className={`p-4 rounded-lg ${
                    transcript.speaker === 'AGENT'
                      ? 'bg-blue-50'
                      : 'bg-green-50'
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-semibold text-sm">
                      {transcript.speaker === 'AGENT' ? '🤖 Interviewer' : '👤 Candidate'}
                    </span>
                    <span className="text-xs text-gray-500">
                      {new Date(transcript.timestamp).toLocaleTimeString()}
                    </span>
                  </div>
                  <p className="text-gray-800">{transcript.text}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

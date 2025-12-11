'use client';

import { useState, useEffect, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Mic, MicOff, Phone, Loader2 } from 'lucide-react';
import { ElevenLabsRealtimeClient, TranscriptEvent, EvaluationEvent } from '@/lib/elevenlabs-client';

interface Transcript {
  speaker: string;
  text: string;
  timestamp: number;
}

export default function InterviewPage() {
  const params = useParams();
  const router = useRouter();
  const sessionId = params.id as string;

  const [status, setStatus] = useState<'loading' | 'ready' | 'connecting' | 'active' | 'ended' | 'error'>('loading');
  const [error, setError] = useState<string | null>(null);
  const [transcripts, setTranscripts] = useState<Transcript[]>([]);
  const [currentEvaluation, setCurrentEvaluation] = useState<EvaluationEvent | null>(null);
  const [isMuted, setIsMuted] = useState(false);
  const [agentSpeaking, setAgentSpeaking] = useState(false);

  const clientRef = useRef<ElevenLabsRealtimeClient | null>(null);
  const transcriptEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    initializeInterview();

    return () => {
      if (clientRef.current) {
        clientRef.current.disconnect();
      }
    };
  }, [sessionId]);

  useEffect(() => {
    // Auto-scroll transcripts
    transcriptEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [transcripts]);

  const initializeInterview = async () => {
    try {
      setStatus('loading');

      console.log('🔄 Fetching token for session:', sessionId);

      // Get realtime token
      const response = await fetch('/api/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error?.message || 'Failed to get token');
      }

      const data = await response.json();
      console.log('✅ Got WebSocket URL:', data.elevenWsUrl);

      // Initialize audio context
      const audioContext = new AudioContext();
      console.log('🎵 Audio context created, sample rate:', audioContext.sampleRate);

      // Create WebSocket client
      const client = new ElevenLabsRealtimeClient(audioContext);
      clientRef.current = client;

      // Setup event handlers
      client.onConnectionStateChanged((state) => {
        console.log('🔌 Connection state:', state);
        if (state === 'connected') {
          setStatus('active');
          console.log('🎙️ Starting audio streaming...');
          client.startStreaming();
        } else if (state === 'error') {
          setStatus('error');
          setError('Connection failed');
        }
      });

      client.onTranscriptReceived((event: TranscriptEvent) => {
        console.log('📝 Transcript:', event.speaker, event.text);
        handleTranscript(event);
      });

      client.onEvaluationReceived((event: EvaluationEvent) => {
        console.log('📊 Evaluation:', event);
        handleEvaluation(event);
      });

      client.onErrorOccurred((err) => {
        console.error('❌ Client error:', err);
        setError(err.message);
        setStatus('error');
      });

      // Connect to WebSocket
      setStatus('connecting');
      console.log('🚀 Connecting to WebSocket...');
      await client.connect(data.elevenWsUrl);
      console.log('✅ WebSocket connection established');
      setStatus('ready');
    } catch (err) {
      console.error('❌ Failed to initialize interview:', err);
      setError(err instanceof Error ? err.message : 'Failed to initialize');
      setStatus('error');
    }
  };

  const handleTranscript = (event: TranscriptEvent) => {
    if (event.type === 'final') {
      setTranscripts((prev) => [
        ...prev,
        {
          speaker: event.speaker,
          text: event.text,
          timestamp: event.timestamp,
        },
      ]);

      // Track agent speaking state
      if (event.speaker === 'agent') {
        setAgentSpeaking(true);
        setTimeout(() => setAgentSpeaking(false), 2000);
      }
    }
  };

  const handleEvaluation = (event: EvaluationEvent) => {
    setCurrentEvaluation(event);
  };

  const toggleMute = () => {
    if (clientRef.current) {
      if (isMuted) {
        clientRef.current.startStreaming();
      } else {
        clientRef.current.stopStreaming();
      }
      setIsMuted(!isMuted);
    }
  };

  const endInterview = () => {
    if (clientRef.current) {
      clientRef.current.disconnect();
    }
    setStatus('ended');
    router.push(`/report/${sessionId}`);
  };

  if (status === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <Loader2 className="w-12 h-12 animate-spin text-blue-600 mx-auto mb-4" />
          <p className="text-gray-600">Initializing interview...</p>
        </div>
      </div>
    );
  }

  if (status === 'error') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="bg-red-50 border border-red-200 rounded-lg p-8 max-w-md">
          <h2 className="text-2xl font-bold text-red-800 mb-4">Error</h2>
          <p className="text-red-700 mb-6">{error}</p>
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

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-7xl mx-auto">
          {/* Header */}
          <div className="bg-white rounded-lg shadow-md p-6 mb-6">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-2xl font-bold text-gray-900">
                  Voice Interview
                </h1>
                <p className="text-gray-600">
                  Status: <span className="font-semibold text-blue-600">{status}</span>
                </p>
              </div>
              <button
                onClick={endInterview}
                className="flex items-center gap-2 px-6 py-3 bg-red-600 text-white rounded-lg hover:bg-red-700 font-semibold"
              >
                <Phone className="w-5 h-5" />
                End Interview
              </button>
            </div>
          </div>

          <div className="grid md:grid-cols-3 gap-6">
            {/* Transcripts */}
            <div className="md:col-span-2 bg-white rounded-lg shadow-md p-6">
              <h2 className="text-xl font-bold text-gray-900 mb-4">
                Conversation
              </h2>
              <div className="space-y-4 h-96 overflow-y-auto">
                {transcripts.length === 0 ? (
                  <p className="text-gray-500 text-center py-8">
                    Waiting for conversation to start...
                  </p>
                ) : (
                  transcripts.map((t, idx) => (
                    <div
                      key={idx}
                      className={`p-4 rounded-lg ${
                        t.speaker === 'agent'
                          ? 'bg-blue-50 border-l-4 border-blue-500'
                          : 'bg-green-50 border-l-4 border-green-500'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-semibold text-sm">
                          {t.speaker === 'agent' ? '🤖 Interviewer' : '👤 You'}
                        </span>
                        <span className="text-xs text-gray-500">
                          {new Date(t.timestamp).toLocaleTimeString()}
                        </span>
                      </div>
                      <p className="text-gray-800">{t.text}</p>
                    </div>
                  ))
                )}
                <div ref={transcriptEndRef} />
              </div>

              {/* Microphone Control */}
              <div className="mt-6 flex items-center justify-center gap-4">
                <button
                  onClick={toggleMute}
                  className={`p-6 rounded-full transition-all ${
                    isMuted
                      ? 'bg-red-500 hover:bg-red-600'
                      : 'bg-blue-600 hover:bg-blue-700'
                  } text-white shadow-lg`}
                >
                  {isMuted ? <MicOff className="w-8 h-8" /> : <Mic className="w-8 h-8" />}
                </button>
                <p className="text-gray-600">
                  {isMuted ? 'Microphone muted' : 'Microphone active'}
                </p>
              </div>
            </div>

            {/* Evaluation Panel */}
            <div className="space-y-6">
              {/* Agent Status */}
              <div className="bg-white rounded-lg shadow-md p-6">
                <h3 className="text-lg font-bold text-gray-900 mb-4">
                  AI Interviewer
                </h3>
                <div
                  className={`w-24 h-24 mx-auto mb-4 rounded-full flex items-center justify-center text-4xl ${
                    agentSpeaking ? 'animate-speaking bg-blue-100' : 'bg-gray-100'
                  }`}
                >
                  🤖
                </div>
                <p className="text-center text-sm text-gray-600">
                  {agentSpeaking ? 'Speaking...' : 'Listening'}
                </p>
              </div>

              {/* Current Evaluation */}
              {currentEvaluation && (
                <div className="bg-white rounded-lg shadow-md p-6">
                  <h3 className="text-lg font-bold text-gray-900 mb-4">
                    Latest Evaluation
                  </h3>
                  <div className="space-y-2">
                    {Object.entries(currentEvaluation.scores).map(([key, value]) => (
                      <div key={key}>
                        <div className="flex justify-between text-sm mb-1">
                          <span className="capitalize text-gray-700">
                            {key.replace(/([A-Z])/g, ' $1').trim()}
                          </span>
                          <span className="font-semibold">{value}/5</span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-2">
                          <div
                            className="bg-blue-600 rounded-full h-2"
                            style={{ width: `${(value / 5) * 100}%` }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                  <p className="text-sm text-gray-600 mt-4 italic">
                    "{currentEvaluation.rationale}"
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

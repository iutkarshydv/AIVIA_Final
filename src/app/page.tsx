import Link from 'next/link';
import { currentUser } from '@clerk/nextjs';
import { redirect } from 'next/navigation';

export default async function HomePage() {
  const user = await currentUser();

  if (user) {
    redirect('/dashboard');
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      <div className="container mx-auto px-4 py-16">
        <div className="text-center">
          <h1 className="text-6xl font-bold text-gray-900 mb-6">
            AIVIA
          </h1>
          <p className="text-2xl text-gray-700 mb-4">
            AI-Powered Voice Interview Platform
          </p>
          <p className="text-lg text-gray-600 mb-12 max-w-2xl mx-auto">
            Experience the future of technical interviews with real-time AI evaluation,
            natural conversation flow, and instant feedback.
          </p>

          <div className="flex gap-4 justify-center">
            <Link
              href="/sign-up"
              className="px-8 py-4 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 transition-colors"
            >
              Get Started
            </Link>
            <Link
              href="/sign-in"
              className="px-8 py-4 bg-white text-blue-600 rounded-lg font-semibold border-2 border-blue-600 hover:bg-blue-50 transition-colors"
            >
              Sign In
            </Link>
          </div>

          <div className="mt-20 grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
            <div className="bg-white p-6 rounded-xl shadow-lg">
              <div className="text-4xl mb-4">🎙️</div>
              <h3 className="text-xl font-semibold mb-2">Real-Time Voice</h3>
              <p className="text-gray-600">
                Natural conversation with sub-second latency and barge-in support
              </p>
            </div>

            <div className="bg-white p-6 rounded-xl shadow-lg">
              <div className="text-4xl mb-4">🤖</div>
              <h3 className="text-xl font-semibold mb-2">AI Evaluation</h3>
              <p className="text-gray-600">
                Structured assessments with detailed rubric-based scoring
              </p>
            </div>

            <div className="bg-white p-6 rounded-xl shadow-lg">
              <div className="text-4xl mb-4">📊</div>
              <h3 className="text-xl font-semibold mb-2">Instant Reports</h3>
              <p className="text-gray-600">
                Comprehensive transcripts and evaluation reports after each session
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

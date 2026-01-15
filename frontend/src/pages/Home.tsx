import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { checkMembership } from '../services/api';
import { Mic, CheckCircle, XCircle, Star } from 'lucide-react';

export default function Home() {
  const navigate = useNavigate();
  const [membership, setMembership] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    checkMembership()
      .then((data) => {
        setMembership(data);
      })
      .catch(() => {
        // Ignore error, just means no membership
      })
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-gray-50">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-indigo-600 border-t-transparent"></div>
      </div>
    );
  }

  const hasActiveMembership = membership && membership.status === 'active';

  return (
    <div className="min-h-screen bg-gray-50 text-gray-900">
      <div className="mx-auto max-w-4xl px-6 py-12">
        <header className="mb-12 text-center">
          <h1 className="mb-4 text-4xl font-extrabold tracking-tight text-indigo-900">Ringle AI Tutor</h1>
          <p className="text-xl text-gray-600">Master English with your personal AI conversation partner.</p>
        </header>

        <div className="grid gap-8 md:grid-cols-2">
          {/* Status Card */}
          <div className="rounded-2xl bg-white p-8 shadow-xl ring-1 ring-gray-200">
            <h2 className="mb-6 flex items-center text-2xl font-bold">
              Membership Status
            </h2>
            
            <div className="mb-8">
              {hasActiveMembership ? (
                <div className="flex items-center space-x-3 text-green-600">
                  <CheckCircle className="h-8 w-8" />
                  <div>
                    <p className="text-lg font-semibold">Active Member</p>
                    <p className="text-sm text-gray-500">Valid until {new Date(membership.end_date).toLocaleDateString()}</p>
                  </div>
                </div>
              ) : (
                <div className="flex items-center space-x-3 text-gray-500">
                  <XCircle className="h-8 w-8" />
                  <div>
                    <p className="text-lg font-semibold">No Active Membership</p>
                    <p className="text-sm">Subscribe to start learning</p>
                  </div>
                </div>
              )}
            </div>

            {hasActiveMembership ? (
              <button
                onClick={() => navigate('/conversation')}
                className="flex w-full items-center justify-center space-x-2 rounded-lg bg-indigo-600 px-6 py-3 text-lg font-semibold text-white transition hover:bg-indigo-700"
              >
                <Mic className="h-5 w-5" />
                <span>Start Conversation</span>
              </button>
            ) : (
              <button
                onClick={() => navigate('/purchase')}
                className="flex w-full items-center justify-center space-x-2 rounded-lg bg-indigo-600 px-6 py-3 text-lg font-semibold text-white transition hover:bg-indigo-700"
              >
                <Star className="h-5 w-5" />
                <span>Get Membership</span>
              </button>
            )}
          </div>

          {/* Features / Info */}
          <div className="flex flex-col justify-center space-y-6 rounded-2xl bg-indigo-50 p-8">
            <h3 className="text-xl font-bold text-indigo-900">Why Ringle AI?</h3>
            <ul className="space-y-4">
              <li className="flex items-start">
                <div className="mr-3 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-indigo-200 text-indigo-700">1</div>
                <p className="text-gray-700">Real-time conversation with advanced AI</p>
              </li>
              <li className="flex items-start">
                <div className="mr-3 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-indigo-200 text-indigo-700">2</div>
                <p className="text-gray-700">Instant feedback on pronunciation and grammar</p>
              </li>
              <li className="flex items-start">
                <div className="mr-3 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-indigo-200 text-indigo-700">3</div>
                <p className="text-gray-700">Personalized topics tailored to your level</p>
              </li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { purchaseMembership } from '../services/api';
import { Check, CreditCard, ArrowLeft } from 'lucide-react';

export default function Purchase() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);

  const handlePurchase = async () => {
    setLoading(true);
    try {
      await purchaseMembership();
      // Add a small delay to simulate processing
      setTimeout(() => {
        navigate('/');
      }, 1500);
    } catch (error) {
      console.error('Purchase failed', error);
      alert('Purchase failed. Please try again.');
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 px-4 py-12">
      <div className="mx-auto max-w-3xl">
        <button 
          onClick={() => navigate(-1)}
          className="mb-8 flex items-center text-gray-500 hover:text-gray-900"
        >
          <ArrowLeft className="mr-2 h-4 w-4" /> Back
        </button>

        <h1 className="mb-8 text-center text-3xl font-bold text-gray-900">Choose Your Plan</h1>

        <div className="mx-auto max-w-md overflow-hidden rounded-2xl bg-white shadow-xl ring-1 ring-gray-200">
          <div className="bg-indigo-600 p-8 text-center text-white">
            <h2 className="text-2xl font-bold">Premium AI Tutor</h2>
            <p className="mt-2 text-indigo-100">Unlimited conversations</p>
            <div className="mt-6">
              <span className="text-5xl font-extrabold">$19.99</span>
              <span className="text-indigo-200">/month</span>
            </div>
          </div>

          <div className="p-8">
            <ul className="mb-8 space-y-4">
              <li className="flex items-center text-gray-600">
                <Check className="mr-3 h-5 w-5 text-green-500" />
                Unlimited AI Conversations
              </li>
              <li className="flex items-center text-gray-600">
                <Check className="mr-3 h-5 w-5 text-green-500" />
                Real-time Pronunciation Feedback
              </li>
              <li className="flex items-center text-gray-600">
                <Check className="mr-3 h-5 w-5 text-green-500" />
                Advanced Grammar Analysis
              </li>
              <li className="flex items-center text-gray-600">
                <Check className="mr-3 h-5 w-5 text-green-500" />
                24/7 Availability
              </li>
            </ul>

            <button
              onClick={handlePurchase}
              disabled={loading}
              className="flex w-full items-center justify-center space-x-2 rounded-xl bg-indigo-600 py-4 text-lg font-bold text-white shadow-lg transition hover:bg-indigo-700 disabled:opacity-70"
            >
              {loading ? (
                <>
                  <div className="h-5 w-5 animate-spin rounded-full border-2 border-white border-t-transparent"></div>
                  <span>Processing...</span>
                </>
              ) : (
                <>
                  <CreditCard className="h-5 w-5" />
                  <span>Subscribe Now</span>
                </>
              )}
            </button>
            <p className="mt-4 text-center text-xs text-gray-400">
              Secure payment processing. Cancel anytime.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

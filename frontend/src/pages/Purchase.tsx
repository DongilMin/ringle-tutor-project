import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useUser } from '../context/UserContext';
import { purchaseMembership, getPlans } from '../services/api';
import type { MembershipType, PlanData } from '../services/api';
import {
  Check,
  CreditCard,
  ArrowLeft,
  BookOpen,
  MessageCircle,
  BarChart3,
  Shield,
  Lock,
  AlertCircle,
  CheckCircle,
  Loader2,
} from 'lucide-react';

interface PlanDisplay {
  type: MembershipType;
  name: string;
  nameKo: string;
  price: number;
  duration: number;
  features: {
    icon: React.ReactNode;
    label: string;
    included: boolean;
  }[];
  popular?: boolean;
}

// Feature display configuration
const FEATURE_CONFIG: Record<string, { icon: React.ReactNode; label: string }> = {
  learning: { icon: <BookOpen className="h-5 w-5" />, label: '학습 기능' },
  conversation: { icon: <MessageCircle className="h-5 w-5" />, label: 'AI 대화' },
  analysis: { icon: <BarChart3 className="h-5 w-5" />, label: '레벨 분석' },
};

const ALL_FEATURES = ['learning', 'conversation', 'analysis'];

// Convert API plan data to display format
const convertToDisplayPlan = (plan: PlanData): PlanDisplay => ({
  type: plan.type,
  name: plan.name,
  nameKo: plan.name_ko,
  price: plan.price,
  duration: plan.duration,
  popular: plan.popular,
  features: ALL_FEATURES.map((feature) => ({
    icon: FEATURE_CONFIG[feature]?.icon || <BookOpen className="h-5 w-5" />,
    label: FEATURE_CONFIG[feature]?.label || feature,
    included: plan.features.includes(feature),
  })),
});

type PaymentStep = 'loading' | 'select' | 'payment' | 'processing' | 'success' | 'error';

interface CardInfo {
  number: string;
  expiry: string;
  cvc: string;
  name: string;
}

const formatPrice = (price: number) => {
  return new Intl.NumberFormat('ko-KR').format(price);
};

const formatCardNumber = (value: string) => {
  const v = value.replace(/\D/g, '').slice(0, 16);
  const parts = [];
  for (let i = 0; i < v.length; i += 4) {
    parts.push(v.slice(i, i + 4));
  }
  return parts.join(' ');
};

const formatExpiry = (value: string) => {
  const v = value.replace(/\D/g, '').slice(0, 4);
  if (v.length >= 2) {
    return v.slice(0, 2) + '/' + v.slice(2);
  }
  return v;
};

export default function Purchase() {
  const navigate = useNavigate();
  const { currentUser, refreshMembership } = useUser();
  const [plans, setPlans] = useState<PlanDisplay[]>([]);
  const [selectedPlan, setSelectedPlan] = useState<MembershipType>('premium');
  const [step, setStep] = useState<PaymentStep>('loading');
  const [cardInfo, setCardInfo] = useState<CardInfo>({
    number: '',
    expiry: '',
    cvc: '',
    name: '',
  });
  const [errors, setErrors] = useState<Partial<CardInfo>>({});
  const [errorMessage, setErrorMessage] = useState('');

  // Fetch plans from API (Single Source of Truth)
  useEffect(() => {
    const fetchPlans = async () => {
      try {
        const planData = await getPlans();
        // Show all plans including enterprise
        const displayPlans = planData.map(convertToDisplayPlan);
        setPlans(displayPlans);
        setStep('select');
      } catch (error) {
        console.error('Failed to fetch plans:', error);
        setErrorMessage('플랜 정보를 불러오는데 실패했습니다.');
        setStep('error');
      }
    };

    fetchPlans();
  }, []);

  useEffect(() => {
    if (!currentUser) {
      navigate('/');
    }
  }, [currentUser, navigate]);

  const validateCard = (): boolean => {
    const newErrors: Partial<CardInfo> = {};

    // Card number validation (16 digits)
    const cardNumberClean = cardInfo.number.replace(/\s/g, '');
    if (cardNumberClean.length !== 16) {
      newErrors.number = '카드번호 16자리를 입력해주세요';
    }

    // Expiry validation (MM/YY)
    const expiryClean = cardInfo.expiry.replace('/', '');
    if (expiryClean.length !== 4) {
      newErrors.expiry = '유효기간을 입력해주세요';
    } else {
      const month = parseInt(expiryClean.slice(0, 2));
      if (month < 1 || month > 12) {
        newErrors.expiry = '유효하지 않은 월입니다';
      }
    }

    // CVC validation
    if (cardInfo.cvc.length < 3) {
      newErrors.cvc = 'CVC 3자리를 입력해주세요';
    }

    // Name validation
    if (cardInfo.name.trim().length < 2) {
      newErrors.name = '카드 소유자명을 입력해주세요';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleProceedToPayment = () => {
    setStep('payment');
  };

  const handlePayment = async () => {
    if (!validateCard()) return;

    setStep('processing');

    try {
      // Simulate PG processing delay
      await new Promise((resolve) => setTimeout(resolve, 2000));

      // Call the actual API (which uses mock PG)
      await purchaseMembership(selectedPlan, currentUser?.id);

      // Refresh membership data
      await refreshMembership();

      setStep('success');

      // Redirect to dashboard after success
      setTimeout(() => {
        navigate('/dashboard');
      }, 2000);
    } catch (error) {
      console.error('Payment failed', error);
      setErrorMessage('결제 처리 중 오류가 발생했습니다. 다시 시도해주세요.');
      setStep('error');
    }
  };

  const handleCardInputChange = (field: keyof CardInfo, value: string) => {
    let formattedValue = value;

    if (field === 'number') {
      formattedValue = formatCardNumber(value);
    } else if (field === 'expiry') {
      formattedValue = formatExpiry(value);
    } else if (field === 'cvc') {
      formattedValue = value.replace(/\D/g, '').slice(0, 4);
    }

    setCardInfo((prev) => ({ ...prev, [field]: formattedValue }));
    setErrors((prev) => ({ ...prev, [field]: undefined }));
  };

  const selectedPlanData = plans.find((p) => p.type === selectedPlan);

  // Loading State
  if (step === 'loading') {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50">
        <div className="text-center">
          <Loader2 className="mx-auto mb-4 h-10 w-10 animate-spin text-indigo-600" />
          <p className="text-gray-600">플랜 정보를 불러오는 중...</p>
        </div>
      </div>
    );
  }

  // Processing State
  if (step === 'processing') {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-indigo-100">
            <div className="h-10 w-10 animate-spin rounded-full border-4 border-indigo-600 border-t-transparent"></div>
          </div>
          <h2 className="mb-2 text-xl font-bold text-gray-900">결제 처리 중</h2>
          <p className="text-gray-600">잠시만 기다려주세요...</p>
          <div className="mt-4 text-sm text-gray-400">
            <Shield className="mr-1 inline h-4 w-4" />
            안전한 결제 처리 중
          </div>
        </div>
      </div>
    );
  }

  // Success State
  if (step === 'success') {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-green-100">
            <CheckCircle className="h-10 w-10 text-green-600" />
          </div>
          <h2 className="mb-2 text-xl font-bold text-gray-900">결제 완료!</h2>
          <p className="text-gray-600">{selectedPlanData?.nameKo} 멤버십이 활성화되었습니다.</p>
          <p className="mt-4 text-sm text-gray-400">잠시 후 대시보드로 이동합니다...</p>
        </div>
      </div>
    );
  }

  // Error State
  if (step === 'error') {
    const isLoadError = plans.length === 0;
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-red-100">
            <AlertCircle className="h-10 w-10 text-red-600" />
          </div>
          <h2 className="mb-2 text-xl font-bold text-gray-900">
            {isLoadError ? '로딩 실패' : '결제 실패'}
          </h2>
          <p className="text-gray-600">{errorMessage}</p>
          <button
            onClick={() => (isLoadError ? window.location.reload() : setStep('payment'))}
            className="mt-6 rounded-lg bg-indigo-600 px-6 py-3 font-semibold text-white hover:bg-indigo-700"
          >
            다시 시도
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 px-4 py-12">
      <div className="mx-auto max-w-4xl">
        <button
          onClick={() => (step === 'payment' ? setStep('select') : navigate('/dashboard'))}
          className="mb-8 flex items-center text-gray-500 hover:text-gray-900"
        >
          <ArrowLeft className="mr-2 h-4 w-4" />{' '}
          {step === 'payment' ? '플랜 선택으로' : '대시보드로'}
        </button>

        {step === 'select' ? (
          <>
            <h1 className="mb-2 text-center text-3xl font-bold text-gray-900">멤버십 선택</h1>
            <p className="mb-8 text-center text-gray-600">나에게 맞는 플랜을 선택하세요</p>

            <div className="grid gap-6 md:grid-cols-3">
              {plans.map((plan) => (
                <div
                  key={plan.type}
                  onClick={() => setSelectedPlan(plan.type)}
                  className={`relative cursor-pointer overflow-hidden rounded-2xl bg-white shadow-lg transition-all ${
                    selectedPlan === plan.type
                      ? 'ring-2 ring-indigo-600 ring-offset-2'
                      : 'ring-1 ring-gray-200 hover:ring-gray-300'
                  }`}
                >
                  {plan.popular && (
                    <div className="absolute right-4 top-4 rounded-full bg-indigo-600 px-3 py-1 text-xs font-semibold text-white">
                      추천
                    </div>
                  )}

                  <div
                    className={`p-6 ${plan.popular ? 'bg-indigo-600 text-white' : 'bg-gray-100 text-gray-900'}`}
                  >
                    <h2 className="text-xl font-bold">
                      {plan.nameKo} <span className="font-normal opacity-75">({plan.name})</span>
                    </h2>
                    <div className="mt-4">
                      <span className="text-4xl font-extrabold">₩{formatPrice(plan.price)}</span>
                      <span className={plan.popular ? 'text-indigo-200' : 'text-gray-500'}>
                        /{plan.duration}일
                      </span>
                    </div>
                  </div>

                  <div className="p-6">
                    <ul className="space-y-3">
                      {plan.features.map((feature, idx) => (
                        <li
                          key={idx}
                          className={`flex items-center ${feature.included ? 'text-gray-700' : 'text-gray-400'}`}
                        >
                          <span
                            className={`mr-3 ${feature.included ? 'text-green-500' : 'text-gray-300'}`}
                          >
                            {feature.included ? <Check className="h-5 w-5" /> : feature.icon}
                          </span>
                          <span className={!feature.included ? 'line-through' : ''}>
                            {feature.label}
                          </span>
                        </li>
                      ))}
                    </ul>

                    <div className="mt-6 flex items-center justify-center">
                      <div
                        className={`h-6 w-6 rounded-full border-2 ${
                          selectedPlan === plan.type
                            ? 'border-indigo-600 bg-indigo-600'
                            : 'border-gray-300'
                        } flex items-center justify-center`}
                      >
                        {selectedPlan === plan.type && <Check className="h-4 w-4 text-white" />}
                      </div>
                      <span className="ml-2 text-sm text-gray-600">
                        {selectedPlan === plan.type ? '선택됨' : '선택하기'}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-8">
              <button
                onClick={handleProceedToPayment}
                className="flex w-full items-center justify-center space-x-2 rounded-xl bg-indigo-600 py-4 text-lg font-bold text-white shadow-lg transition hover:bg-indigo-700"
              >
                <CreditCard className="h-5 w-5" />
                <span>결제하기</span>
              </button>
            </div>
          </>
        ) : (
          <>
            <h1 className="mb-2 text-center text-3xl font-bold text-gray-900">결제 정보 입력</h1>
            <p className="mb-8 text-center text-gray-600">
              {selectedPlanData?.nameKo} 멤버십 - ₩{formatPrice(selectedPlanData?.price || 0)}
            </p>

            <div className="mx-auto max-w-md">
              <div className="rounded-2xl bg-white p-6 shadow-lg ring-1 ring-gray-100">
                <div className="mb-6 flex items-center justify-between rounded-lg bg-gray-50 p-4">
                  <div>
                    <p className="font-medium text-gray-900">{selectedPlanData?.nameKo}</p>
                    <p className="text-sm text-gray-500">{selectedPlanData?.duration}일 이용권</p>
                  </div>
                  <p className="text-xl font-bold text-indigo-600">
                    ₩{formatPrice(selectedPlanData?.price || 0)}
                  </p>
                </div>

                <div className="space-y-4">
                  {/* Card Number */}
                  <div>
                    <label className="mb-1 block text-sm font-medium text-gray-700">카드번호</label>
                    <div className="relative">
                      <input
                        type="text"
                        value={cardInfo.number}
                        onChange={(e) => handleCardInputChange('number', e.target.value)}
                        placeholder="0000 0000 0000 0000"
                        className={`w-full rounded-lg border px-4 py-3 pr-10 ${
                          errors.number ? 'border-red-500' : 'border-gray-300'
                        } focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200`}
                      />
                      <CreditCard className="absolute right-3 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400" />
                    </div>
                    {errors.number && <p className="mt-1 text-sm text-red-500">{errors.number}</p>}
                  </div>

                  {/* Expiry & CVC */}
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="mb-1 block text-sm font-medium text-gray-700">
                        유효기간
                      </label>
                      <input
                        type="text"
                        value={cardInfo.expiry}
                        onChange={(e) => handleCardInputChange('expiry', e.target.value)}
                        placeholder="MM/YY"
                        className={`w-full rounded-lg border px-4 py-3 ${
                          errors.expiry ? 'border-red-500' : 'border-gray-300'
                        } focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200`}
                      />
                      {errors.expiry && (
                        <p className="mt-1 text-sm text-red-500">{errors.expiry}</p>
                      )}
                    </div>
                    <div>
                      <label className="mb-1 block text-sm font-medium text-gray-700">CVC</label>
                      <input
                        type="text"
                        value={cardInfo.cvc}
                        onChange={(e) => handleCardInputChange('cvc', e.target.value)}
                        placeholder="000"
                        className={`w-full rounded-lg border px-4 py-3 ${
                          errors.cvc ? 'border-red-500' : 'border-gray-300'
                        } focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200`}
                      />
                      {errors.cvc && <p className="mt-1 text-sm text-red-500">{errors.cvc}</p>}
                    </div>
                  </div>

                  {/* Card Holder Name */}
                  <div>
                    <label className="mb-1 block text-sm font-medium text-gray-700">
                      카드 소유자명
                    </label>
                    <input
                      type="text"
                      value={cardInfo.name}
                      onChange={(e) => handleCardInputChange('name', e.target.value)}
                      placeholder="홍길동"
                      className={`w-full rounded-lg border px-4 py-3 ${
                        errors.name ? 'border-red-500' : 'border-gray-300'
                      } focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200`}
                    />
                    {errors.name && <p className="mt-1 text-sm text-red-500">{errors.name}</p>}
                  </div>
                </div>

                <button
                  onClick={handlePayment}
                  className="mt-6 flex w-full items-center justify-center gap-2 rounded-lg bg-indigo-600 py-4 font-bold text-white transition hover:bg-indigo-700"
                >
                  <Lock className="h-5 w-5" />₩{formatPrice(selectedPlanData?.price || 0)} 결제하기
                </button>

                <div className="mt-4 flex items-center justify-center gap-2 text-sm text-gray-400">
                  <Shield className="h-4 w-4" />
                  <span>SSL 보안 결제 | 카드정보는 저장되지 않습니다</span>
                </div>
              </div>

              <p className="mt-4 text-center text-xs text-gray-400">
                * 이것은 데모 결제입니다. 실제 결제가 발생하지 않습니다.
              </p>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

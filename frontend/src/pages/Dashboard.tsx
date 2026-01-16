import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useUser } from '../context/UserContext';
import {
  LogOut,
  Crown,
  BookOpen,
  MessageCircle,
  BarChart3,
  CreditCard,
  Lock,
  CheckCircle,
  XCircle,
  Calendar,
} from 'lucide-react';

const membershipLabels: Record<string, { name: string; color: string; bgColor: string }> = {
  basic: { name: '베이직', color: 'text-gray-700', bgColor: 'bg-gray-100' },
  premium: { name: '프리미엄', color: 'text-indigo-700', bgColor: 'bg-indigo-100' },
};

const FEATURES = [
  {
    id: 'learning',
    name: '학습',
    description: 'AI와 함께 영어 학습 자료로 공부',
    icon: BookOpen,
    route: '/learning',
  },
  {
    id: 'conversation',
    name: '대화',
    description: 'AI 튜터와 실시간 영어 대화',
    icon: MessageCircle,
    route: '/conversation',
  },
  {
    id: 'analysis',
    name: '분석',
    description: '대화 기반 레벨 분석 리포트',
    icon: BarChart3,
    route: '/analysis',
  },
] as const;

export default function Dashboard() {
  const navigate = useNavigate();
  const { currentUser, membership, isLoading, hasFeature, logout, refreshMembership } = useUser();

  useEffect(() => {
    if (!currentUser) {
      navigate('/');
    }
  }, [currentUser, navigate]);

  if (!currentUser) {
    return null;
  }

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  const handleFeatureClick = (feature: (typeof FEATURES)[number]) => {
    if (hasFeature(feature.id)) {
      navigate(feature.route);
    }
  };

  const daysRemaining = membership?.days_remaining ?? 0;
  const isExpiringSoon = daysRemaining > 0 && daysRemaining <= 7;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="border-b bg-white shadow-sm">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-600">
              <span className="font-bold text-white">R</span>
            </div>
            <div>
              <h1 className="font-bold text-gray-900">Ringle AI Tutor</h1>
              <p className="text-sm text-gray-500">{currentUser.name}님 환영합니다</p>
            </div>
          </div>
          <button
            onClick={handleLogout}
            className="flex items-center gap-2 rounded-lg px-4 py-2 text-gray-600 hover:bg-gray-100"
          >
            <LogOut className="h-5 w-5" />
            로그아웃
          </button>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-6 py-8">
        {/* Membership Status Card */}
        <div className="mb-8 rounded-2xl bg-white p-6 shadow-lg ring-1 ring-gray-100">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div
                className={`flex h-14 w-14 items-center justify-center rounded-xl ${
                  membership?.is_active ? 'bg-indigo-100' : 'bg-gray-100'
                }`}
              >
                <Crown
                  className={`h-7 w-7 ${membership?.is_active ? 'text-indigo-600' : 'text-gray-400'}`}
                />
              </div>
              <div>
                <div className="flex items-center gap-3">
                  <h2 className="text-xl font-bold text-gray-900">멤버십 상태</h2>
                  {membership?.is_active ? (
                    <span
                      className={`rounded-full px-3 py-1 text-sm font-medium ${
                        membershipLabels[membership.membership_type]?.bgColor || 'bg-gray-100'
                      } ${membershipLabels[membership.membership_type]?.color || 'text-gray-700'}`}
                    >
                      {membershipLabels[membership.membership_type]?.name ||
                        membership.membership_type}
                    </span>
                  ) : (
                    <span className="rounded-full bg-gray-100 px-3 py-1 text-sm font-medium text-gray-500">
                      비활성
                    </span>
                  )}
                </div>
                {membership?.is_active ? (
                  <div className="mt-1 flex items-center gap-4 text-sm text-gray-600">
                    <span className="flex items-center gap-1">
                      <Calendar className="h-4 w-4" />
                      {membership.end_date}까지
                    </span>
                    <span
                      className={`font-medium ${isExpiringSoon ? 'text-orange-600' : 'text-green-600'}`}
                    >
                      {daysRemaining}일 남음
                    </span>
                  </div>
                ) : (
                  <p className="mt-1 text-sm text-gray-500">멤버십을 구매하여 학습을 시작하세요</p>
                )}
              </div>
            </div>
            <button
              onClick={() => navigate('/purchase')}
              className="flex items-center gap-2 rounded-lg bg-indigo-600 px-5 py-2.5 font-semibold text-white transition hover:bg-indigo-700"
            >
              <CreditCard className="h-5 w-5" />
              {membership?.is_active ? '업그레이드' : '멤버십 구매'}
            </button>
          </div>

          {/* Expiring Soon Warning */}
          {isExpiringSoon && (
            <div className="mt-4 rounded-lg bg-orange-50 px-4 py-3 text-sm text-orange-700">
              ⚠️ 멤버십이 곧 만료됩니다. 연장하여 학습을 계속하세요!
            </div>
          )}
        </div>

        {/* Features Grid */}
        <h3 className="mb-4 text-lg font-bold text-gray-900">기능</h3>
        <div className="grid gap-6 md:grid-cols-3">
          {FEATURES.map((feature) => {
            const hasAccess = hasFeature(feature.id);
            const Icon = feature.icon;

            return (
              <button
                key={feature.id}
                onClick={() => handleFeatureClick(feature)}
                disabled={!hasAccess}
                className={`group relative rounded-2xl p-6 text-left transition ${
                  hasAccess
                    ? 'bg-white shadow-lg ring-1 ring-gray-100 hover:shadow-xl hover:ring-indigo-200'
                    : 'cursor-not-allowed bg-gray-100 opacity-60'
                }`}
              >
                {/* Lock overlay for unavailable features */}
                {!hasAccess && (
                  <div className="absolute right-4 top-4">
                    <Lock className="h-5 w-5 text-gray-400" />
                  </div>
                )}

                <div
                  className={`mb-4 flex h-12 w-12 items-center justify-center rounded-xl ${
                    hasAccess ? 'bg-indigo-100' : 'bg-gray-200'
                  }`}
                >
                  <Icon className={`h-6 w-6 ${hasAccess ? 'text-indigo-600' : 'text-gray-400'}`} />
                </div>

                <h4
                  className={`mb-1 text-lg font-bold ${hasAccess ? 'text-gray-900' : 'text-gray-500'}`}
                >
                  {feature.name}
                </h4>
                <p className={`text-sm ${hasAccess ? 'text-gray-600' : 'text-gray-400'}`}>
                  {feature.description}
                </p>

                {/* Access status */}
                <div className="mt-4 flex items-center gap-2 text-sm">
                  {hasAccess ? (
                    <>
                      <CheckCircle className="h-4 w-4 text-green-500" />
                      <span className="text-green-600">이용 가능</span>
                    </>
                  ) : (
                    <>
                      <XCircle className="h-4 w-4 text-gray-400" />
                      <span className="text-gray-500">멤버십 필요</span>
                    </>
                  )}
                </div>
              </button>
            );
          })}
        </div>

        {/* Membership Plans Info */}
        {!membership?.is_active && (
          <div className="mt-8 rounded-2xl bg-gradient-to-r from-indigo-500 to-purple-600 p-6 text-white">
            <h3 className="mb-4 text-xl font-bold">멤버십 플랜</h3>
            <div className="grid gap-4 md:grid-cols-2">
              <div className="rounded-xl bg-white/10 p-4">
                <h4 className="font-bold">베이직</h4>
                <p className="text-sm text-white/80">₩9,900 / 30일</p>
                <p className="mt-2 text-sm">• 학습 기능</p>
              </div>
              <div className="rounded-xl bg-white/20 p-4 ring-2 ring-white/50">
                <div className="mb-1 text-xs font-medium text-yellow-300">BEST</div>
                <h4 className="font-bold">프리미엄</h4>
                <p className="text-sm text-white/80">₩19,900 / 60일</p>
                <p className="mt-2 text-sm">• 학습 + 대화 + 분석</p>
              </div>
            </div>
          </div>
        )}

        {/* Refresh Button */}
        {isLoading && (
          <div className="mt-4 text-center text-sm text-gray-500">멤버십 정보 로딩 중...</div>
        )}
        <button
          onClick={refreshMembership}
          className="mt-4 text-sm text-gray-400 hover:text-gray-600"
        >
          멤버십 정보 새로고침
        </button>
      </main>
    </div>
  );
}

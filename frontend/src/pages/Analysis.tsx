import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useUser } from '../context/UserContext';
import {
  ArrowLeft,
  BarChart3,
  TrendingUp,
  MessageCircle,
  Clock,
  Target,
  Award,
} from 'lucide-react';

const ANALYSIS_DATA = {
  overallScore: 72,
  previousScore: 68,
  totalConversations: 15,
  totalMinutes: 124,
  skills: [
    { name: 'Fluency', score: 75, color: 'bg-blue-500' },
    { name: 'Grammar', score: 68, color: 'bg-green-500' },
    { name: 'Vocabulary', score: 80, color: 'bg-purple-500' },
    { name: 'Pronunciation', score: 65, color: 'bg-orange-500' },
  ],
  recentSessions: [
    { date: '2025-01-15', topic: 'Business Meeting', score: 75, duration: '12분' },
    { date: '2025-01-14', topic: 'Travel Planning', score: 72, duration: '8분' },
    { date: '2025-01-13', topic: 'Daily Routine', score: 70, duration: '10분' },
  ],
  recommendations: [
    'Try using more complex sentence structures',
    'Focus on verb tense consistency',
    'Practice pronunciation of "th" sounds',
  ],
};

export default function Analysis() {
  const navigate = useNavigate();
  const { currentUser, hasFeature } = useUser();

  useEffect(() => {
    if (!currentUser) {
      navigate('/');
    } else if (!hasFeature('analysis')) {
      navigate('/dashboard');
    }
  }, [currentUser, hasFeature, navigate]);

  if (!currentUser || !hasFeature('analysis')) {
    return null;
  }

  const scoreDiff = ANALYSIS_DATA.overallScore - ANALYSIS_DATA.previousScore;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="border-b bg-white shadow-sm">
        <div className="mx-auto flex max-w-4xl items-center gap-4 px-6 py-4">
          <button
            onClick={() => navigate('/dashboard')}
            className="rounded-lg p-2 text-gray-500 hover:bg-gray-100"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-100">
              <BarChart3 className="h-5 w-5 text-indigo-600" />
            </div>
            <div>
              <h1 className="font-bold text-gray-900">분석</h1>
              <p className="text-sm text-gray-500">대화 기반 레벨 분석 리포트</p>
            </div>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-4xl px-6 py-8">
        {/* Overall Score Card */}
        <div className="mb-8 rounded-2xl bg-gradient-to-r from-indigo-500 to-purple-600 p-6 text-white">
          <div className="flex items-center justify-between">
            <div>
              <p className="mb-1 text-sm text-white/80">전체 점수</p>
              <div className="flex items-baseline gap-2">
                <span className="text-5xl font-bold">{ANALYSIS_DATA.overallScore}</span>
                <span className="text-xl text-white/80">/ 100</span>
              </div>
              <div className="mt-2 flex items-center gap-1 text-sm">
                <TrendingUp className="h-4 w-4" />
                <span className={scoreDiff >= 0 ? 'text-green-300' : 'text-red-300'}>
                  {scoreDiff >= 0 ? '+' : ''}
                  {scoreDiff} 지난 주 대비
                </span>
              </div>
            </div>
            <div className="flex h-24 w-24 items-center justify-center rounded-full bg-white/20">
              <Award className="h-12 w-12" />
            </div>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="mb-8 grid grid-cols-2 gap-4">
          <div className="rounded-xl bg-white p-5 shadow-sm ring-1 ring-gray-100">
            <div className="flex items-center gap-3">
              <div className="rounded-lg bg-blue-100 p-2">
                <MessageCircle className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <p className="text-sm text-gray-500">총 대화 횟수</p>
                <p className="text-2xl font-bold text-gray-900">
                  {ANALYSIS_DATA.totalConversations}회
                </p>
              </div>
            </div>
          </div>
          <div className="rounded-xl bg-white p-5 shadow-sm ring-1 ring-gray-100">
            <div className="flex items-center gap-3">
              <div className="rounded-lg bg-green-100 p-2">
                <Clock className="h-5 w-5 text-green-600" />
              </div>
              <div>
                <p className="text-sm text-gray-500">총 학습 시간</p>
                <p className="text-2xl font-bold text-gray-900">{ANALYSIS_DATA.totalMinutes}분</p>
              </div>
            </div>
          </div>
        </div>

        {/* Skills Breakdown */}
        <div className="mb-8 rounded-xl bg-white p-6 shadow-sm ring-1 ring-gray-100">
          <h3 className="mb-4 flex items-center gap-2 font-bold text-gray-900">
            <Target className="h-5 w-5 text-indigo-600" />
            영역별 점수
          </h3>
          <div className="space-y-4">
            {ANALYSIS_DATA.skills.map((skill) => (
              <div key={skill.name}>
                <div className="mb-1 flex justify-between text-sm">
                  <span className="font-medium text-gray-700">{skill.name}</span>
                  <span className="text-gray-500">{skill.score}/100</span>
                </div>
                <div className="h-3 overflow-hidden rounded-full bg-gray-100">
                  <div
                    className={`h-full rounded-full ${skill.color} transition-all`}
                    style={{ width: `${skill.score}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Recent Sessions */}
        <div className="mb-8 rounded-xl bg-white p-6 shadow-sm ring-1 ring-gray-100">
          <h3 className="mb-4 font-bold text-gray-900">최근 대화 기록</h3>
          <div className="space-y-3">
            {ANALYSIS_DATA.recentSessions.map((session, idx) => (
              <div
                key={idx}
                className="flex items-center justify-between rounded-lg bg-gray-50 p-3"
              >
                <div>
                  <p className="font-medium text-gray-900">{session.topic}</p>
                  <p className="text-sm text-gray-500">
                    {session.date} | {session.duration}
                  </p>
                </div>
                <div className="text-right">
                  <span className="text-lg font-bold text-indigo-600">{session.score}</span>
                  <span className="text-sm text-gray-400">/100</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Recommendations */}
        <div className="rounded-xl bg-white p-6 shadow-sm ring-1 ring-gray-100">
          <h3 className="mb-4 font-bold text-gray-900">AI 추천 학습 포인트</h3>
          <ul className="space-y-2">
            {ANALYSIS_DATA.recommendations.map((rec, idx) => (
              <li key={idx} className="flex items-start gap-2 text-gray-600">
                <span className="mt-1.5 h-1.5 w-1.5 flex-shrink-0 rounded-full bg-indigo-600" />
                {rec}
              </li>
            ))}
          </ul>
        </div>
      </main>
    </div>
  );
}

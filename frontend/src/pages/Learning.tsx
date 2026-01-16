import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useUser } from '../context/UserContext';
import { ArrowLeft, BookOpen, FileText, Volume2, CheckCircle } from 'lucide-react';

const SAMPLE_LESSONS = [
  {
    id: 1,
    title: 'Business English Basics',
    description: '비즈니스 상황에서 자주 사용되는 표현 학습',
    level: 'Intermediate',
    duration: '15분',
    completed: true,
  },
  {
    id: 2,
    title: 'Daily Conversations',
    description: '일상 대화에서 사용하는 자연스러운 표현',
    level: 'Beginner',
    duration: '10분',
    completed: true,
  },
  {
    id: 3,
    title: 'Presentation Skills',
    description: '프레젠테이션에서 활용할 수 있는 표현',
    level: 'Advanced',
    duration: '20분',
    completed: false,
  },
  {
    id: 4,
    title: 'Interview Preparation',
    description: '영어 면접을 위한 핵심 표현 및 팁',
    level: 'Intermediate',
    duration: '25분',
    completed: false,
  },
];

export default function Learning() {
  const navigate = useNavigate();
  const { currentUser, hasFeature } = useUser();

  useEffect(() => {
    if (!currentUser) {
      navigate('/');
    } else if (!hasFeature('learning')) {
      navigate('/dashboard');
    }
  }, [currentUser, hasFeature, navigate]);

  if (!currentUser || !hasFeature('learning')) {
    return null;
  }

  const completedCount = SAMPLE_LESSONS.filter((l) => l.completed).length;
  const progress = (completedCount / SAMPLE_LESSONS.length) * 100;

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
              <BookOpen className="h-5 w-5 text-indigo-600" />
            </div>
            <div>
              <h1 className="font-bold text-gray-900">학습</h1>
              <p className="text-sm text-gray-500">AI와 함께 영어 학습 자료로 공부</p>
            </div>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-4xl px-6 py-8">
        {/* Progress Card */}
        <div className="mb-8 rounded-2xl bg-gradient-to-r from-indigo-500 to-purple-600 p-6 text-white">
          <h2 className="mb-2 text-lg font-bold">학습 진행률</h2>
          <div className="mb-2 h-3 overflow-hidden rounded-full bg-white/20">
            <div
              className="h-full rounded-full bg-white transition-all"
              style={{ width: `${progress}%` }}
            />
          </div>
          <p className="text-sm text-white/80">
            {completedCount}/{SAMPLE_LESSONS.length} 레슨 완료 ({Math.round(progress)}%)
          </p>
        </div>

        {/* Lessons List */}
        <h3 className="mb-4 text-lg font-bold text-gray-900">학습 자료</h3>
        <div className="space-y-4">
          {SAMPLE_LESSONS.map((lesson) => (
            <div
              key={lesson.id}
              className="flex items-center justify-between rounded-xl bg-white p-5 shadow-sm ring-1 ring-gray-100 transition hover:shadow-md"
            >
              <div className="flex items-center gap-4">
                <div
                  className={`flex h-12 w-12 items-center justify-center rounded-xl ${
                    lesson.completed ? 'bg-green-100' : 'bg-gray-100'
                  }`}
                >
                  {lesson.completed ? (
                    <CheckCircle className="h-6 w-6 text-green-600" />
                  ) : (
                    <FileText className="h-6 w-6 text-gray-400" />
                  )}
                </div>
                <div>
                  <h4 className="font-semibold text-gray-900">{lesson.title}</h4>
                  <p className="text-sm text-gray-500">{lesson.description}</p>
                  <div className="mt-1 flex items-center gap-3 text-xs text-gray-400">
                    <span>{lesson.level}</span>
                    <span>|</span>
                    <span>{lesson.duration}</span>
                  </div>
                </div>
              </div>
              <button
                className={`flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition ${
                  lesson.completed
                    ? 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                    : 'bg-indigo-600 text-white hover:bg-indigo-700'
                }`}
              >
                <Volume2 className="h-4 w-4" />
                {lesson.completed ? '복습' : '시작'}
              </button>
            </div>
          ))}
        </div>
      </main>
    </div>
  );
}

import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useUser, type User } from '../context/UserContext';
import { getDemoUsers } from '../services/api';
import { Users, Shield, LogIn, Loader2 } from 'lucide-react';

export default function Home() {
  const navigate = useNavigate();
  const { setCurrentUser, setIsAdmin, logout } = useUser();
  const [users, setUsers] = useState<User[]>([]);
  const [selectedUserId, setSelectedUserId] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);

  // Home 페이지 진입 시 이전 로그인 상태 초기화 및 유저 목록 로드
  useEffect(() => {
    logout();

    const fetchUsers = async () => {
      try {
        const fetchedUsers = await getDemoUsers();
        setUsers(fetchedUsers);
        if (fetchedUsers.length > 0) {
          setSelectedUserId(fetchedUsers[0].id);
        }
      } catch (error) {
        console.error('Failed to fetch users:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchUsers();
  }, [logout]);

  const handleUserLogin = () => {
    const user = users.find((u) => u.id === selectedUserId);
    if (user) {
      setIsAdmin(false);
      setCurrentUser(user);
      navigate('/dashboard');
    }
  };

  const handleAdminLogin = () => {
    setCurrentUser(null);
    setIsAdmin(true);
    navigate('/admin');
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-indigo-50 via-white to-purple-50">
      <div className="w-full max-w-md px-6">
        {/* Logo & Title */}
        <div className="mb-10 text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-indigo-600 shadow-lg">
            <span className="text-2xl font-bold text-white">R</span>
          </div>
          <h1 className="text-3xl font-bold text-gray-900">Ringle AI Tutor</h1>
          <p className="mt-2 text-gray-600">AI와 함께하는 영어 회화 학습</p>
        </div>

        {/* Login Options */}
        <div className="space-y-6">
          {/* User Login Card */}
          <div className="rounded-2xl bg-white p-6 shadow-xl ring-1 ring-gray-100">
            <div className="mb-4 flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-indigo-100">
                <Users className="h-5 w-5 text-indigo-600" />
              </div>
              <div>
                <h2 className="font-semibold text-gray-900">유저로 접속</h2>
                <p className="text-sm text-gray-500">학습 및 대화 기능 이용</p>
              </div>
            </div>

            <div className="mb-4">
              <label className="mb-2 block text-sm font-medium text-gray-700">유저 선택</label>
              {loading ? (
                <div className="flex items-center justify-center py-3">
                  <Loader2 className="h-5 w-5 animate-spin text-indigo-600" />
                  <span className="ml-2 text-sm text-gray-500">유저 목록 로딩 중...</span>
                </div>
              ) : (
                <select
                  value={selectedUserId ?? ''}
                  onChange={(e) => setSelectedUserId(Number(e.target.value))}
                  className="w-full rounded-lg border border-gray-300 px-4 py-3 text-gray-900 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200"
                >
                  {users.map((user) => (
                    <option key={user.id} value={user.id}>
                      {user.name} ({user.email})
                    </option>
                  ))}
                </select>
              )}
            </div>

            <button
              onClick={handleUserLogin}
              disabled={loading || !selectedUserId}
              className="flex w-full items-center justify-center gap-2 rounded-lg bg-indigo-600 px-4 py-3 font-semibold text-white transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <LogIn className="h-5 w-5" />
              유저로 로그인
            </button>
          </div>

          {/* Admin Login Card */}
          <div className="rounded-2xl bg-white p-6 shadow-xl ring-1 ring-gray-100">
            <div className="mb-4 flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-purple-100">
                <Shield className="h-5 w-5 text-purple-600" />
              </div>
              <div>
                <h2 className="font-semibold text-gray-900">어드민으로 접속</h2>
                <p className="text-sm text-gray-500">멤버십 관리 및 유저 관리</p>
              </div>
            </div>

            <button
              onClick={handleAdminLogin}
              className="flex w-full items-center justify-center gap-2 rounded-lg bg-purple-600 px-4 py-3 font-semibold text-white transition hover:bg-purple-700"
            >
              <Shield className="h-5 w-5" />
              어드민으로 로그인
            </button>
          </div>
        </div>

        {/* Footer */}
        <p className="mt-8 text-center text-sm text-gray-400">
          로그인 기능이 없는 데모 버전입니다.
          <br />
          유저 선택 시 해당 유저로 고정됩니다.
        </p>
      </div>
    </div>
  );
}

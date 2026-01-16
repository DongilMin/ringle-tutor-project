import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useUser } from '../context/UserContext';
import { adminApi } from '../services/api';
import type { AdminMembership, AdminUser } from '../services/api';
import { ArrowLeft, Plus, Trash2, Users, Crown, AlertCircle, LogOut } from 'lucide-react';

const membershipLabels: Record<string, { name: string; color: string }> = {
  basic: { name: '베이직', color: 'bg-gray-500' },
  premium: { name: '프리미엄', color: 'bg-indigo-600' },
  enterprise: { name: '엔터프라이즈', color: 'bg-amber-600' },
};

export default function Admin() {
  const navigate = useNavigate();
  const { isAdmin, logout } = useUser();
  const [memberships, setMemberships] = useState<AdminMembership[]>([]);
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [createForm, setCreateForm] = useState({
    user_id: '',
    membership_type: 'premium',
  });
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);

  // Redirect if not admin
  useEffect(() => {
    if (!isAdmin) {
      navigate('/');
    }
  }, [isAdmin, navigate]);

  useEffect(() => {
    if (isAdmin) {
      loadData();
    }
  }, [isAdmin]);

  const loadData = async () => {
    try {
      const [membershipsData, usersData] = await Promise.all([
        adminApi.getMemberships(),
        adminApi.getUsers(),
      ]);
      setMemberships(Array.isArray(membershipsData) ? membershipsData : []);
      setUsers(Array.isArray(usersData) ? usersData : []);
    } catch (error) {
      console.error('Failed to load data', error);
    } finally {
      setLoading(false);
    }
  };

  // Get users who already have active membership (for duplicate prevention)
  const usersWithActiveMembership = useMemo(() => {
    return new Set(memberships.filter((m) => m.status === 'active').map((m) => m.user_id));
  }, [memberships]);

  // Filter users who don't have active membership
  const availableUsers = useMemo(() => {
    return users.filter((u) => !usersWithActiveMembership.has(u.id));
  }, [users, usersWithActiveMembership]);

  const handleCreate = async () => {
    setCreateError(null);

    if (!createForm.user_id) {
      setCreateError('유저를 선택해주세요');
      return;
    }

    const userId = parseInt(createForm.user_id);

    // Client-side duplicate check
    if (usersWithActiveMembership.has(userId)) {
      setCreateError('이 유저는 이미 활성 멤버십을 보유하고 있습니다');
      return;
    }

    setCreating(true);
    try {
      await adminApi.createMembership({
        user_id: userId,
        membership_type: createForm.membership_type,
      });
      setShowCreateModal(false);
      setCreateForm({ user_id: '', membership_type: 'premium' });
      setCreateError(null);
      loadData();
    } catch (error) {
      console.error('Failed to create membership', error);
      if (error instanceof Error && error.message.includes('duplicate')) {
        setCreateError('이 유저는 이미 활성 멤버십을 보유하고 있습니다');
      } else {
        setCreateError('멤버십 생성에 실패했습니다');
      }
    } finally {
      setCreating(false);
    }
  };

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  const handleDelete = async (id: number) => {
    if (!confirm('정말로 이 멤버십을 취소하시겠습니까?')) return;

    try {
      await adminApi.deleteMembership(id);
      loadData();
    } catch (error) {
      console.error('Failed to delete membership', error);
      alert('멤버십 삭제에 실패했습니다');
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'active':
        return (
          <span className="rounded-full bg-green-100 px-2 py-1 text-xs text-green-800">활성</span>
        );
      case 'expired':
        return (
          <span className="rounded-full bg-gray-100 px-2 py-1 text-xs text-gray-800">만료</span>
        );
      case 'cancelled':
        return <span className="rounded-full bg-red-100 px-2 py-1 text-xs text-red-800">취소</span>;
      default:
        return (
          <span className="rounded-full bg-gray-100 px-2 py-1 text-xs text-gray-800">{status}</span>
        );
    }
  };

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-gray-50">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-indigo-600 border-t-transparent"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 px-4 py-8">
      <div className="mx-auto max-w-6xl">
        {/* Header */}
        <div className="mb-8 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button
              onClick={() => navigate('/')}
              className="rounded-lg p-2 text-gray-500 hover:bg-gray-100"
            >
              <ArrowLeft className="h-5 w-5" />
            </button>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">어드민 - 멤버십 관리</h1>
              <p className="text-sm text-gray-500">유저 멤버십을 부여하거나 취소할 수 있습니다</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => setShowCreateModal(true)}
              className="flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700"
            >
              <Plus className="h-4 w-4" />
              멤버십 부여
            </button>
            <button
              onClick={handleLogout}
              className="flex items-center gap-2 rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
            >
              <LogOut className="h-4 w-4" />
              로그아웃
            </button>
          </div>
        </div>

        {/* Stats */}
        <div className="mb-6 grid grid-cols-3 gap-4">
          <div className="rounded-lg bg-white p-4 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="rounded-full bg-indigo-100 p-2">
                <Crown className="h-5 w-5 text-indigo-600" />
              </div>
              <div>
                <p className="text-sm text-gray-500">전체 멤버십</p>
                <p className="text-2xl font-bold">{memberships.length}</p>
              </div>
            </div>
          </div>
          <div className="rounded-lg bg-white p-4 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="rounded-full bg-green-100 p-2">
                <Users className="h-5 w-5 text-green-600" />
              </div>
              <div>
                <p className="text-sm text-gray-500">활성 멤버십</p>
                <p className="text-2xl font-bold">
                  {memberships.filter((m) => m.status === 'active').length}
                </p>
              </div>
            </div>
          </div>
          <div className="rounded-lg bg-white p-4 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="rounded-full bg-gray-100 p-2">
                <Users className="h-5 w-5 text-gray-600" />
              </div>
              <div>
                <p className="text-sm text-gray-500">만료/취소</p>
                <p className="text-2xl font-bold">
                  {memberships.filter((m) => m.status !== 'active').length}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Membership List */}
        <div className="rounded-lg bg-white shadow-sm">
          <div className="border-b px-6 py-4">
            <h2 className="font-semibold text-gray-900">멤버십 목록</h2>
          </div>
          {memberships.length === 0 ? (
            <div className="p-8 text-center text-gray-500">등록된 멤버십이 없습니다</div>
          ) : (
            <div className="divide-y">
              {memberships.map((membership) => (
                <div key={membership.id} className="flex items-center justify-between px-6 py-4">
                  <div className="flex items-center gap-4">
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gray-100">
                      <Users className="h-5 w-5 text-gray-600" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-gray-900">
                          {membership.user?.email || `User #${membership.user_id}`}
                        </span>
                        <span
                          className={`${membershipLabels[membership.membership_type]?.color || 'bg-gray-500'} rounded-full px-2 py-0.5 text-xs text-white`}
                        >
                          {membershipLabels[membership.membership_type]?.name ||
                            membership.membership_type}
                        </span>
                        {getStatusBadge(membership.status)}
                      </div>
                      <p className="text-sm text-gray-500">
                        {membership.start_date} ~ {membership.end_date}
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => handleDelete(membership.id)}
                    disabled={membership.status === 'cancelled'}
                    className="rounded-lg p-2 text-red-500 hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    <Trash2 className="h-5 w-5" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Create Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="w-full max-w-md rounded-lg bg-white p-6 shadow-xl">
            <h3 className="mb-4 text-lg font-bold">멤버십 부여</h3>

            {/* Error Message */}
            {createError && (
              <div className="mb-4 flex items-center gap-2 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">
                <AlertCircle className="h-4 w-4 flex-shrink-0" />
                {createError}
              </div>
            )}

            {/* No available users warning */}
            {availableUsers.length === 0 ? (
              <div className="rounded-lg bg-yellow-50 px-4 py-3 text-sm text-yellow-700">
                모든 유저가 이미 활성 멤버십을 보유하고 있습니다.
              </div>
            ) : (
              <div className="space-y-4">
                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700">유저 선택</label>
                  <select
                    value={createForm.user_id}
                    onChange={(e) => {
                      setCreateForm({ ...createForm, user_id: e.target.value });
                      setCreateError(null);
                    }}
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  >
                    <option value="">유저를 선택하세요</option>
                    {availableUsers.map((user) => (
                      <option key={user.id} value={user.id}>
                        {user.name} ({user.email})
                      </option>
                    ))}
                  </select>
                  <p className="mt-1 text-xs text-gray-500">
                    {availableUsers.length}명의 유저에게 멤버십 부여 가능
                  </p>
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700">
                    멤버십 종류
                  </label>
                  <select
                    value={createForm.membership_type}
                    onChange={(e) =>
                      setCreateForm({ ...createForm, membership_type: e.target.value })
                    }
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  >
                    <option value="basic">베이직 (학습, 30일, ₩9,900)</option>
                    <option value="premium">프리미엄 (학습+대화+분석, 60일, ₩19,900)</option>
                    <option value="enterprise">엔터프라이즈 (학습+대화+분석, 90일, ₩49,900)</option>
                  </select>
                </div>
              </div>
            )}

            <div className="mt-6 flex justify-end gap-3">
              <button
                onClick={() => {
                  setShowCreateModal(false);
                  setCreateError(null);
                  setCreateForm({ user_id: '', membership_type: 'premium' });
                }}
                className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
              >
                취소
              </button>
              <button
                onClick={handleCreate}
                disabled={creating || availableUsers.length === 0}
                className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {creating ? '처리 중...' : '부여'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

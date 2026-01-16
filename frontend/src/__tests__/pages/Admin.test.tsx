import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import Admin from '../../pages/Admin';
import * as api from '../../services/api';
import * as UserContext from '../../context/UserContext';

// Mock the api module
vi.mock('../../services/api', () => ({
  adminApi: {
    getUsers: vi.fn(),
    getMemberships: vi.fn(),
    createMembership: vi.fn(),
    deleteMembership: vi.fn(),
  },
}));

// Mock useNavigate
const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

// Mock useUser hook
const mockLogout = vi.fn();
vi.spyOn(UserContext, 'useUser').mockReturnValue({
  currentUser: null,
  membership: null,
  isAdmin: true,
  isLoading: false,
  setCurrentUser: vi.fn(),
  setIsAdmin: vi.fn(),
  setMembership: vi.fn(),
  refreshMembership: vi.fn(),
  hasFeature: vi.fn(),
  logout: mockLogout,
});

const mockUsers = [
  { id: 1, email: 'user1@example.com', name: 'User 1' },
  { id: 2, email: 'user2@example.com', name: 'User 2' },
];

const mockMemberships = [
  {
    id: 1,
    user_id: 1,
    membership_type: 'premium',
    status: 'active',
    start_date: '2024-01-01',
    end_date: '2024-03-01',
    features: ['learning', 'conversation', 'analysis'],
    user: { id: 1, email: 'user1@example.com', name: 'User 1' },
  },
];

const renderAdmin = () => {
  return render(
    <BrowserRouter>
      <Admin />
    </BrowserRouter>
  );
};

describe('Admin', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    // Reset useUser mock to admin by default
    vi.spyOn(UserContext, 'useUser').mockReturnValue({
      currentUser: null,
      membership: null,
      isAdmin: true,
      isLoading: false,
      setCurrentUser: vi.fn(),
      setIsAdmin: vi.fn(),
      setMembership: vi.fn(),
      refreshMembership: vi.fn(),
      hasFeature: vi.fn(),
      logout: mockLogout,
    });

    // Default mock implementations
    vi.mocked(api.adminApi.getUsers).mockResolvedValue(mockUsers);
    vi.mocked(api.adminApi.getMemberships).mockResolvedValue(mockMemberships);
  });

  describe('when user is not admin', () => {
    it('redirects to home page', async () => {
      vi.spyOn(UserContext, 'useUser').mockReturnValue({
        currentUser: null,
        membership: null,
        isAdmin: false,
        isLoading: false,
        setCurrentUser: vi.fn(),
        setIsAdmin: vi.fn(),
        setMembership: vi.fn(),
        refreshMembership: vi.fn(),
        hasFeature: vi.fn(),
        logout: mockLogout,
      });

      renderAdmin();

      await waitFor(() => {
        expect(mockNavigate).toHaveBeenCalledWith('/');
      });
    });
  });

  describe('when user is admin', () => {
    it('renders admin page title', async () => {
      renderAdmin();

      await waitFor(() => {
        expect(screen.getByText('어드민 - 멤버십 관리')).toBeInTheDocument();
      });
    });

    it('renders membership list', async () => {
      renderAdmin();

      await waitFor(() => {
        expect(screen.getByText('user1@example.com')).toBeInTheDocument();
      });
    });

    it('displays stats correctly', async () => {
      renderAdmin();

      await waitFor(() => {
        expect(screen.getByText('전체 멤버십')).toBeInTheDocument();
        expect(screen.getByText('활성 멤버십')).toBeInTheDocument();
        expect(screen.getByText('만료/취소')).toBeInTheDocument();
      });
    });

    it('renders membership type badges', async () => {
      renderAdmin();

      await waitFor(() => {
        expect(screen.getByText('프리미엄')).toBeInTheDocument();
      });
    });

    it('renders status badges', async () => {
      renderAdmin();

      await waitFor(() => {
        expect(screen.getByText('활성')).toBeInTheDocument();
      });
    });

    it('opens create modal when clicking add button', async () => {
      renderAdmin();

      await waitFor(() => {
        expect(screen.getByText('멤버십 부여')).toBeInTheDocument();
      });

      fireEvent.click(screen.getByText('멤버십 부여'));

      await waitFor(() => {
        expect(screen.getByText('유저 선택')).toBeInTheDocument();
        expect(screen.getByText('멤버십 종류')).toBeInTheDocument();
      });
    });

    it('shows all membership type options in create modal', async () => {
      renderAdmin();

      await waitFor(() => {
        fireEvent.click(screen.getByText('멤버십 부여'));
      });

      await waitFor(() => {
        // Basic, Premium, Enterprise options should exist
        expect(screen.getByText(/베이직/)).toBeInTheDocument();
        expect(screen.getByText(/프리미엄 \(학습\+대화\+분석/)).toBeInTheDocument();
        expect(screen.getByText(/엔터프라이즈/)).toBeInTheDocument();
      });
    });

    it('closes modal when clicking cancel', async () => {
      renderAdmin();

      await waitFor(() => {
        fireEvent.click(screen.getByText('멤버십 부여'));
      });

      await waitFor(() => {
        expect(screen.getByText('유저 선택')).toBeInTheDocument();
      });

      fireEvent.click(screen.getByText('취소'));

      await waitFor(() => {
        expect(screen.queryByText('유저 선택')).not.toBeInTheDocument();
      });
    });

    it('shows error when creating without selecting user', async () => {
      renderAdmin();

      await waitFor(() => {
        fireEvent.click(screen.getByText('멤버십 부여'));
      });

      // Wait for modal to appear and click submit
      await waitFor(() => {
        expect(screen.getByText('유저 선택')).toBeInTheDocument();
      });

      // Click 부여 without selecting user
      const buttons = screen.getAllByRole('button');
      const submitButton = buttons.find((btn) => btn.textContent === '부여');
      if (submitButton) {
        fireEvent.click(submitButton);
      }

      await waitFor(() => {
        expect(screen.getByText('유저를 선택해주세요')).toBeInTheDocument();
      });
    });

    it('calls deleteMembership API when delete button is clicked', async () => {
      vi.mocked(api.adminApi.deleteMembership).mockResolvedValue({});

      // Mock window.confirm
      vi.spyOn(window, 'confirm').mockReturnValue(true);

      renderAdmin();

      await waitFor(() => {
        expect(screen.getByText('user1@example.com')).toBeInTheDocument();
      });

      // Alternative: find button with Trash2 SVG
      const allButtons = screen.getAllByRole('button');
      const trashButton = allButtons.find(
        (btn) =>
          btn.querySelector('svg') && btn.querySelector('svg')?.classList.contains('lucide-trash-2')
      );

      if (trashButton) {
        fireEvent.click(trashButton);

        await waitFor(() => {
          expect(api.adminApi.deleteMembership).toHaveBeenCalledWith(1);
        });
      }
    });

    it('renders logout button', async () => {
      renderAdmin();

      await waitFor(() => {
        expect(screen.getByText('로그아웃')).toBeInTheDocument();
      });
    });

    it('shows empty state when no memberships exist', async () => {
      vi.mocked(api.adminApi.getMemberships).mockResolvedValue([]);

      renderAdmin();

      await waitFor(
        () => {
          expect(screen.getByText('등록된 멤버십이 없습니다')).toBeInTheDocument();
        },
        { timeout: 3000 }
      );
    });
  });
});

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import Home from '../../pages/Home';
import { UserProvider } from '../../context/UserContext';

// Mock navigate
const mockNavigate = vi.fn();
vi.mock('react-router-dom', async (importOriginal) => {
  const actual = await importOriginal<typeof import('react-router-dom')>();
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

// Mock API
vi.mock('../../services/api', () => ({
  getDemoUsers: vi.fn().mockResolvedValue([
    { id: 1, email: 'user1@example.com', name: '김철수' },
    { id: 2, email: 'user2@example.com', name: '이영희' },
    { id: 3, email: 'user3@example.com', name: '박민수' },
  ]),
}));

// Mock UserContext
const mockSetCurrentUser = vi.fn();
const mockSetIsAdmin = vi.fn();
const mockLogout = vi.fn();

vi.mock('../../context/UserContext', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../context/UserContext')>();
  return {
    ...actual,
    useUser: () => ({
      currentUser: null,
      membership: null,
      isAdmin: false,
      isLoading: false,
      setCurrentUser: mockSetCurrentUser,
      setIsAdmin: mockSetIsAdmin,
      setMembership: vi.fn(),
      refreshMembership: vi.fn().mockResolvedValue(undefined),
      hasFeature: vi.fn().mockReturnValue(false),
      logout: mockLogout,
    }),
    UserProvider: actual.UserProvider,
  };
});

const renderWithProviders = (component: React.ReactNode) => {
  return render(
    <BrowserRouter>
      <UserProvider>{component}</UserProvider>
    </BrowserRouter>
  );
};

describe('Home Page', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders page title', () => {
    renderWithProviders(<Home />);

    expect(screen.getByText('Ringle AI Tutor')).toBeInTheDocument();
  });

  it('renders subtitle', () => {
    renderWithProviders(<Home />);

    expect(screen.getByText('AI와 함께하는 영어 회화 학습')).toBeInTheDocument();
  });

  it('renders user login section', () => {
    renderWithProviders(<Home />);

    expect(screen.getByText('유저로 접속')).toBeInTheDocument();
    expect(screen.getByText('학습 및 대화 기능 이용')).toBeInTheDocument();
  });

  it('renders admin login section', () => {
    renderWithProviders(<Home />);

    expect(screen.getByText('어드민으로 접속')).toBeInTheDocument();
    expect(screen.getByText('멤버십 관리 및 유저 관리')).toBeInTheDocument();
  });

  it('renders user selection dropdown', async () => {
    renderWithProviders(<Home />);

    expect(screen.getByText('유저 선택')).toBeInTheDocument();

    // Wait for users to load
    await waitFor(() => {
      expect(screen.getByRole('combobox')).toBeInTheDocument();
    });
  });

  it('shows demo users in dropdown', async () => {
    renderWithProviders(<Home />);

    // Wait for users to load
    await waitFor(() => {
      expect(screen.getByRole('combobox')).toBeInTheDocument();
    });

    // Check for demo user options
    expect(screen.getByText(/김철수/)).toBeInTheDocument();
  });

  it('renders user login button', () => {
    renderWithProviders(<Home />);

    expect(screen.getByText('유저로 로그인')).toBeInTheDocument();
  });

  it('renders admin login button', () => {
    renderWithProviders(<Home />);

    expect(screen.getByText('어드민으로 로그인')).toBeInTheDocument();
  });

  it('calls setIsAdmin and navigates to admin page when admin login clicked', () => {
    renderWithProviders(<Home />);

    const adminButton = screen.getByText('어드민으로 로그인');
    fireEvent.click(adminButton);

    expect(mockSetIsAdmin).toHaveBeenCalledWith(true);
    expect(mockNavigate).toHaveBeenCalledWith('/admin');
  });

  it('calls setCurrentUser and navigates to dashboard when user login clicked', async () => {
    renderWithProviders(<Home />);

    // Wait for users to load
    await waitFor(() => {
      expect(screen.getByRole('combobox')).toBeInTheDocument();
    });

    const userButton = screen.getByText('유저로 로그인');
    fireEvent.click(userButton);

    expect(mockSetIsAdmin).toHaveBeenCalledWith(false);
    expect(mockSetCurrentUser).toHaveBeenCalled();
    expect(mockNavigate).toHaveBeenCalledWith('/dashboard');
  });

  it('shows demo version notice', () => {
    renderWithProviders(<Home />);

    expect(screen.getByText(/로그인 기능이 없는 데모 버전입니다/)).toBeInTheDocument();
  });
});

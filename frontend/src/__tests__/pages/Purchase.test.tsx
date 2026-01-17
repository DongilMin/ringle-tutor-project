import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import Purchase from '../../pages/Purchase';
import { UserProvider } from '../../context/UserContext';
import * as api from '../../services/api';

// Mock the api module
vi.mock('../../services/api', () => ({
  purchaseMembership: vi.fn(),
  getCurrentMembership: vi.fn().mockResolvedValue(null),
  getPlans: vi.fn(),
}));

// Mock user context with a test user
const mockUser = { id: 1, email: 'test@example.com', name: 'Test User' };

const mockPlans = [
  {
    type: 'basic' as const,
    name: 'Basic',
    name_ko: '베이직',
    price: 9900,
    duration: 30,
    features: ['learning'],
    popular: false,
  },
  {
    type: 'premium' as const,
    name: 'Premium',
    name_ko: '프리미엄',
    price: 19900,
    duration: 60,
    features: ['learning', 'conversation', 'analysis'],
    popular: true,
  },
  {
    type: 'enterprise' as const,
    name: 'Enterprise',
    name_ko: '엔터프라이즈',
    price: 49900,
    duration: 90,
    features: ['learning', 'conversation', 'analysis'],
    popular: false,
  },
];

const renderWithProviders = (component: React.ReactNode) => {
  return render(
    <BrowserRouter>
      <UserProvider>{component}</UserProvider>
    </BrowserRouter>
  );
};

// We need to set up the user in the context before rendering
vi.mock('../../context/UserContext', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../context/UserContext')>();
  return {
    ...actual,
    useUser: () => ({
      currentUser: mockUser,
      membership: null,
      isAdmin: false,
      isLoading: false,
      setCurrentUser: vi.fn(),
      setIsAdmin: vi.fn(),
      setMembership: vi.fn(),
      refreshMembership: vi.fn().mockResolvedValue(undefined),
      hasFeature: vi.fn().mockReturnValue(false),
      logout: vi.fn(),
    }),
    UserProvider: actual.UserProvider,
  };
});

describe('Purchase Page', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Default mock for getPlans
    vi.mocked(api.getPlans).mockResolvedValue(mockPlans);
  });

  it('shows loading state initially', () => {
    // Make getPlans hang
    vi.mocked(api.getPlans).mockImplementation(() => new Promise(() => {}));

    renderWithProviders(<Purchase />);

    expect(screen.getByText('플랜 정보를 불러오는 중...')).toBeInTheDocument();
  });

  it('renders purchase title after loading', async () => {
    renderWithProviders(<Purchase />);

    await waitFor(() => {
      expect(screen.getByText('멤버십 선택')).toBeInTheDocument();
      expect(screen.getByText('나에게 맞는 플랜을 선택하세요')).toBeInTheDocument();
    });
  });

  it('renders basic plan details from API', async () => {
    renderWithProviders(<Purchase />);

    await waitFor(() => {
      expect(screen.getByText(/베이직/)).toBeInTheDocument();
      expect(screen.getByText('₩9,900')).toBeInTheDocument();
      expect(screen.getByText('/30일')).toBeInTheDocument();
    });
  });

  it('renders premium plan details from API', async () => {
    renderWithProviders(<Purchase />);

    await waitFor(() => {
      // Premium text appears in plan card
      expect(screen.getAllByText(/프리미엄/).length).toBeGreaterThanOrEqual(1);
      expect(screen.getByText('₩19,900')).toBeInTheDocument();
      expect(screen.getByText('/60일')).toBeInTheDocument();
      expect(screen.getByText('추천')).toBeInTheDocument();
    });
  });

  it('shows enterprise plan details from API', async () => {
    renderWithProviders(<Purchase />);

    await waitFor(() => {
      expect(screen.getByText('멤버십 선택')).toBeInTheDocument();
    });

    // Enterprise should be visible
    expect(screen.getByText(/엔터프라이즈/)).toBeInTheDocument();
    expect(screen.getByText('₩49,900')).toBeInTheDocument();
    expect(screen.getByText('/90일')).toBeInTheDocument();
  });

  it('renders feature list', async () => {
    renderWithProviders(<Purchase />);

    await waitFor(() => {
      // All 3 plans have learning feature, so it appears 3 times
      expect(screen.getAllByText('학습 기능')).toHaveLength(3);
      expect(screen.getAllByText('AI 대화')).toHaveLength(3);
      expect(screen.getAllByText('레벨 분석')).toHaveLength(3);
    });
  });

  it('renders subscribe button', async () => {
    renderWithProviders(<Purchase />);

    await waitFor(() => {
      expect(screen.getByText('결제하기')).toBeInTheDocument();
    });
  });

  it('navigates to payment step when clicking purchase button', async () => {
    renderWithProviders(<Purchase />);

    await waitFor(() => {
      expect(screen.getByText('결제하기')).toBeInTheDocument();
    });

    const purchaseButton = screen.getByText('결제하기');
    fireEvent.click(purchaseButton);

    await waitFor(() => {
      expect(screen.getByText('결제 정보 입력')).toBeInTheDocument();
    });
  });

  it('shows card input fields in payment step', async () => {
    renderWithProviders(<Purchase />);

    await waitFor(() => {
      expect(screen.getByText('결제하기')).toBeInTheDocument();
    });

    const purchaseButton = screen.getByText('결제하기');
    fireEvent.click(purchaseButton);

    await waitFor(() => {
      expect(screen.getByText('카드번호')).toBeInTheDocument();
      expect(screen.getByText('유효기간')).toBeInTheDocument();
      expect(screen.getByText('CVC')).toBeInTheDocument();
      expect(screen.getByText('카드 소유자명')).toBeInTheDocument();
    });
  });

  it('validates card number length', async () => {
    renderWithProviders(<Purchase />);

    await waitFor(() => {
      expect(screen.getByText('결제하기')).toBeInTheDocument();
    });

    // Go to payment step
    fireEvent.click(screen.getByText('결제하기'));

    await waitFor(() => {
      expect(screen.getByText('카드번호')).toBeInTheDocument();
    });

    // Fill in incomplete card info
    const cardInput = screen.getByPlaceholderText('0000 0000 0000 0000');
    fireEvent.change(cardInput, { target: { value: '1234' } });

    // Try to submit
    const submitButton = screen.getByText(/결제하기/);
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText('카드번호 16자리를 입력해주세요')).toBeInTheDocument();
    });
  });

  it('shows error state when API fails', async () => {
    vi.mocked(api.getPlans).mockRejectedValue(new Error('API Error'));

    renderWithProviders(<Purchase />);

    await waitFor(() => {
      expect(screen.getByText('로딩 실패')).toBeInTheDocument();
      expect(screen.getByText('플랜 정보를 불러오는데 실패했습니다.')).toBeInTheDocument();
    });
  });
});

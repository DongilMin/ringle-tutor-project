import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import Purchase from '../../pages/Purchase';
import { UserProvider } from '../../context/UserContext';

vi.mock('../../services/api', () => ({
  purchaseMembership: vi.fn(),
  getCurrentMembership: vi.fn().mockResolvedValue(null),
}));

// Mock user context with a test user
const mockUser = { id: 1, email: 'test@example.com', name: 'Test User' };

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
  });

  it('renders purchase title', () => {
    renderWithProviders(<Purchase />);

    expect(screen.getByText('멤버십 선택')).toBeInTheDocument();
    expect(screen.getByText('나에게 맞는 플랜을 선택하세요')).toBeInTheDocument();
  });

  it('renders basic plan details', () => {
    renderWithProviders(<Purchase />);

    expect(screen.getByText(/베이직/)).toBeInTheDocument();
    expect(screen.getByText('₩9,900')).toBeInTheDocument();
    expect(screen.getByText('/30일')).toBeInTheDocument();
  });

  it('renders premium plan details', () => {
    renderWithProviders(<Purchase />);

    // Premium text appears in plan card
    expect(screen.getAllByText(/프리미엄/).length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText('₩19,900')).toBeInTheDocument();
    expect(screen.getByText('/60일')).toBeInTheDocument();
    expect(screen.getByText('추천')).toBeInTheDocument();
  });

  it('renders feature list', () => {
    renderWithProviders(<Purchase />);

    // Both plans have learning feature, so it appears twice
    expect(screen.getAllByText('학습 기능')).toHaveLength(2);
    expect(screen.getAllByText('AI 대화')).toHaveLength(2);
    expect(screen.getAllByText('레벨 분석')).toHaveLength(2);
  });

  it('renders subscribe button', () => {
    renderWithProviders(<Purchase />);

    expect(screen.getByText('결제하기')).toBeInTheDocument();
  });

  it('navigates to payment step when clicking purchase button', async () => {
    renderWithProviders(<Purchase />);

    const purchaseButton = screen.getByText('결제하기');
    fireEvent.click(purchaseButton);

    await waitFor(() => {
      expect(screen.getByText('결제 정보 입력')).toBeInTheDocument();
    });
  });

  it('shows card input fields in payment step', async () => {
    renderWithProviders(<Purchase />);

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

  it('shows back button to return to plan selection', async () => {
    renderWithProviders(<Purchase />);

    // Go to payment step
    fireEvent.click(screen.getByText('결제하기'));

    await waitFor(() => {
      expect(screen.getByText('플랜 선택으로')).toBeInTheDocument();
    });
  });

  it('shows secure payment message', async () => {
    renderWithProviders(<Purchase />);

    // Go to payment step
    fireEvent.click(screen.getByText('결제하기'));

    await waitFor(() => {
      expect(screen.getByText(/SSL 보안 결제/)).toBeInTheDocument();
    });
  });

  it('shows demo payment notice', async () => {
    renderWithProviders(<Purchase />);

    // Go to payment step
    fireEvent.click(screen.getByText('결제하기'));

    await waitFor(() => {
      expect(
        screen.getByText('* 이것은 데모 결제입니다. 실제 결제가 발생하지 않습니다.')
      ).toBeInTheDocument();
    });
  });
});

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import Purchase from '../../pages/Purchase';
import * as api from '../../services/api';

vi.mock('../../services/api');

describe('Purchase Page', () => {
  const mockPlans = [
    {
      id: 'basic',
      name: 'Basic Plan',
      price: 29900,
      currency: 'KRW',
      duration_days: 30,
      features: ['30 conversations per month', 'Basic AI feedback'],
    },
    {
      id: 'premium',
      name: 'Premium Plan',
      price: 59900,
      currency: 'KRW',
      duration_days: 30,
      features: ['Unlimited conversations', 'Advanced AI feedback'],
    },
    {
      id: 'enterprise',
      name: 'Enterprise Plan',
      price: 99900,
      currency: 'KRW',
      duration_days: 30,
      features: ['Everything in Premium', 'Dedicated support'],
    },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(api.membershipPlansApi.getAll).mockResolvedValue({
      success: true,
      data: mockPlans,
    });
  });

  it('renders purchase title', () => {
    render(<Purchase />);

    expect(screen.getByText('Purchase Membership')).toBeInTheDocument();
  });

  it('renders plan selector', async () => {
    render(<Purchase />);

    await waitFor(() => {
      expect(screen.getByText('Select a Membership Plan')).toBeInTheDocument();
    });

    expect(screen.getByText('Basic Plan')).toBeInTheDocument();
    expect(screen.getByText('Premium Plan')).toBeInTheDocument();
    expect(screen.getByText('Enterprise Plan')).toBeInTheDocument();
  });
});

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { PlanSelector } from '../../components/PlanSelector';
import * as api from '../../services/api';

vi.mock('../../services/api');

describe('PlanSelector', () => {
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
  });

  it('shows loading state initially', () => {
    vi.mocked(api.membershipPlansApi.getAll).mockReturnValue(new Promise(() => {}));

    const mockOnSelectPlan = vi.fn();
    render(<PlanSelector onSelectPlan={mockOnSelectPlan} />);

    expect(screen.getByText('Loading plans...')).toBeInTheDocument();
  });

  it('renders all plans including Enterprise', async () => {
    vi.mocked(api.membershipPlansApi.getAll).mockResolvedValue({
      success: true,
      data: mockPlans,
    });

    const mockOnSelectPlan = vi.fn();
    render(<PlanSelector onSelectPlan={mockOnSelectPlan} />);

    await waitFor(() => {
      expect(screen.getByText('Select a Membership Plan')).toBeInTheDocument();
    });

    expect(screen.getByText('Basic Plan')).toBeInTheDocument();
    expect(screen.getByText('Premium Plan')).toBeInTheDocument();
    expect(screen.getByText('Enterprise Plan')).toBeInTheDocument();
  });

  it('displays prices in KRW format', async () => {
    vi.mocked(api.membershipPlansApi.getAll).mockResolvedValue({
      success: true,
      data: mockPlans,
    });

    const mockOnSelectPlan = vi.fn();
    render(<PlanSelector onSelectPlan={mockOnSelectPlan} />);

    await waitFor(() => {
      expect(screen.getByText('₩29,900/month')).toBeInTheDocument();
    });

    expect(screen.getByText('₩59,900/month')).toBeInTheDocument();
    expect(screen.getByText('₩99,900/month')).toBeInTheDocument();
  });

  it('calls onSelectPlan when basic plan is selected', async () => {
    vi.mocked(api.membershipPlansApi.getAll).mockResolvedValue({
      success: true,
      data: mockPlans,
    });

    const mockOnSelectPlan = vi.fn();
    render(<PlanSelector onSelectPlan={mockOnSelectPlan} />);

    await waitFor(() => {
      expect(screen.getByText('Select Basic Plan')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText('Select Basic Plan'));

    expect(mockOnSelectPlan).toHaveBeenCalledWith('basic');
  });

  it('calls onSelectPlan when premium plan is selected', async () => {
    vi.mocked(api.membershipPlansApi.getAll).mockResolvedValue({
      success: true,
      data: mockPlans,
    });

    const mockOnSelectPlan = vi.fn();
    render(<PlanSelector onSelectPlan={mockOnSelectPlan} />);

    await waitFor(() => {
      expect(screen.getByText('Select Premium Plan')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText('Select Premium Plan'));

    expect(mockOnSelectPlan).toHaveBeenCalledWith('premium');
  });

  it('calls onSelectPlan when enterprise plan is selected', async () => {
    vi.mocked(api.membershipPlansApi.getAll).mockResolvedValue({
      success: true,
      data: mockPlans,
    });

    const mockOnSelectPlan = vi.fn();
    render(<PlanSelector onSelectPlan={mockOnSelectPlan} />);

    await waitFor(() => {
      expect(screen.getByText('Select Enterprise Plan')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText('Select Enterprise Plan'));

    expect(mockOnSelectPlan).toHaveBeenCalledWith('enterprise');
  });

  it('shows error message when API call fails', async () => {
    vi.mocked(api.membershipPlansApi.getAll).mockResolvedValue({
      success: false,
      error: {
        code: 'NETWORK_ERROR',
        message: 'Failed to fetch plans',
      },
    });

    const mockOnSelectPlan = vi.fn();
    render(<PlanSelector onSelectPlan={mockOnSelectPlan} />);

    await waitFor(() => {
      expect(screen.getByText('Error: Failed to fetch plans')).toBeInTheDocument();
    });
  });
});

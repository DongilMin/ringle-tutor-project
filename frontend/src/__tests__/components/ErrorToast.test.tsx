import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';
import { ErrorToast } from '../../components/ErrorToast';

describe('ErrorToast', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('renders error message', () => {
    render(<ErrorToast message="Test error message" onDismiss={() => {}} />);
    expect(screen.getByText('Test error message')).toBeInTheDocument();
  });

  it('renders alert icon', () => {
    render(<ErrorToast message="Error" onDismiss={() => {}} />);
    // AlertCircle icon should be present
    expect(document.querySelector('svg')).toBeInTheDocument();
  });

  it('calls onDismiss when dismiss button is clicked', async () => {
    const onDismiss = vi.fn();
    render(<ErrorToast message="Error" onDismiss={onDismiss} />);

    const dismissButton = screen.getByTitle('Dismiss');
    fireEvent.click(dismissButton);

    // Wait for animation delay
    act(() => {
      vi.advanceTimersByTime(300);
    });

    expect(onDismiss).toHaveBeenCalledTimes(1);
  });

  it('renders retry button when onRetry is provided', () => {
    const onRetry = vi.fn();
    render(<ErrorToast message="Error" onDismiss={() => {}} onRetry={onRetry} />);

    expect(screen.getByTitle('Retry')).toBeInTheDocument();
  });

  it('does not render retry button when onRetry is not provided', () => {
    render(<ErrorToast message="Error" onDismiss={() => {}} />);
    expect(screen.queryByTitle('Retry')).not.toBeInTheDocument();
  });

  it('calls onRetry when retry button is clicked', () => {
    const onRetry = vi.fn();
    render(<ErrorToast message="Error" onDismiss={() => {}} onRetry={onRetry} />);

    const retryButton = screen.getByTitle('Retry');
    fireEvent.click(retryButton);

    expect(onRetry).toHaveBeenCalledTimes(1);
  });

  it('auto-hides after default duration', async () => {
    const onDismiss = vi.fn();
    render(<ErrorToast message="Error" onDismiss={onDismiss} />);

    // Default autoHideDuration is 5000ms
    act(() => {
      vi.advanceTimersByTime(5000);
    });

    // Wait for animation delay
    act(() => {
      vi.advanceTimersByTime(300);
    });

    expect(onDismiss).toHaveBeenCalledTimes(1);
  });

  it('auto-hides after custom duration', async () => {
    const onDismiss = vi.fn();
    render(<ErrorToast message="Error" onDismiss={onDismiss} autoHideDuration={2000} />);

    // Should not hide before duration
    act(() => {
      vi.advanceTimersByTime(1500);
    });
    expect(onDismiss).not.toHaveBeenCalled();

    // Should hide after duration
    act(() => {
      vi.advanceTimersByTime(500);
    });

    // Wait for animation delay
    act(() => {
      vi.advanceTimersByTime(300);
    });

    expect(onDismiss).toHaveBeenCalledTimes(1);
  });

  it('does not auto-hide when autoHideDuration is 0', async () => {
    const onDismiss = vi.fn();
    render(<ErrorToast message="Error" onDismiss={onDismiss} autoHideDuration={0} />);

    act(() => {
      vi.advanceTimersByTime(10000);
    });

    expect(onDismiss).not.toHaveBeenCalled();
  });

  it('applies visible styles initially', () => {
    const { container } = render(<ErrorToast message="Error" onDismiss={() => {}} />);

    const toast = container.firstChild;
    expect(toast).toHaveClass('opacity-100');
    expect(toast).toHaveClass('translate-y-0');
  });

  it('renders with red background color', () => {
    render(<ErrorToast message="Error" onDismiss={() => {}} />);

    const toastContent = document.querySelector('.bg-red-600');
    expect(toastContent).toBeInTheDocument();
  });

  it('renders with correct positioning classes', () => {
    const { container } = render(<ErrorToast message="Error" onDismiss={() => {}} />);

    const toast = container.firstChild;
    expect(toast).toHaveClass('fixed');
    expect(toast).toHaveClass('bottom-4');
    expect(toast).toHaveClass('left-1/2');
    expect(toast).toHaveClass('-translate-x-1/2');
    expect(toast).toHaveClass('z-50');
  });

  it('clears timer on unmount', () => {
    const onDismiss = vi.fn();
    const { unmount } = render(<ErrorToast message="Error" onDismiss={onDismiss} />);

    // Unmount before auto-hide
    unmount();

    act(() => {
      vi.advanceTimersByTime(10000);
    });

    // onDismiss should not be called after unmount
    expect(onDismiss).not.toHaveBeenCalled();
  });

  it('displays long error messages', () => {
    const longMessage =
      'This is a very long error message that should still be displayed correctly in the toast component';
    render(<ErrorToast message={longMessage} onDismiss={() => {}} />);
    expect(screen.getByText(longMessage)).toBeInTheDocument();
  });
});

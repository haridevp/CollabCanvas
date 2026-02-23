import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import ForgotPasswordPage from '../../pages/ForgotPasswordPage';

// MOCK: forgotPassword API
const mockForgotPassword = vi.fn();

vi.mock('../../utils/authService', () => ({
  forgotPassword: (email: string) => mockForgotPassword(email)
}));

describe('ForgotPasswordPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders initial UI correctly', () => {
    render(
      <MemoryRouter>
        <ForgotPasswordPage />
      </MemoryRouter>
    );

    expect(screen.getByText(/Reset Password/i)).toBeInTheDocument();
    expect(
      screen.getByText(/Enter your email and we'll send a reset link/i)
    ).toBeInTheDocument();

    expect(screen.getByLabelText(/Email Address/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Send Reset Link/i })).toBeInTheDocument();
    expect(screen.getByText(/Back to Login/i)).toBeInTheDocument();
  });

  test('shows error if email is empty', async () => {
    const user = userEvent.setup();
    render(
      <MemoryRouter>
        <ForgotPasswordPage />
      </MemoryRouter>
    );

    // click submit with empty input
    await user.click(screen.getByRole('button', { name: /Send Reset Link/i }));

    expect(
      await screen.findByText(/Please enter your email address/i)
    ).toBeInTheDocument();

    expect(mockForgotPassword).not.toHaveBeenCalled();
  });

  test('shows error if email format is invalid', async () => {
    const user = userEvent.setup();
    render(
      <MemoryRouter>
        <ForgotPasswordPage />
      </MemoryRouter>
    );

    await user.type(screen.getByLabelText(/Email Address/i), 'notanemail');
    await user.click(screen.getByRole('button', { name: /Send Reset Link/i }));

    expect(
      await screen.findByText(/Please enter a valid email address/i)
    ).toBeInTheDocument();

    expect(mockForgotPassword).not.toHaveBeenCalled();
  });

  test('calls forgotPassword(email) when email is valid', async () => {
    const user = userEvent.setup();

    mockForgotPassword.mockResolvedValue({
      success: true,
      message: 'Reset email sent'
    });

    render(
      <MemoryRouter>
        <ForgotPasswordPage />
      </MemoryRouter>
    );

    await user.type(screen.getByLabelText(/Email Address/i), 'user@example.com');
    await user.click(screen.getByRole('button', { name: /Send Reset Link/i }));

    await waitFor(() => {
      expect(mockForgotPassword).toHaveBeenCalledWith('user@example.com');
    });
  });

  test('shows success UI when API returns success=true', async () => {
    const user = userEvent.setup();

    mockForgotPassword.mockResolvedValue({
      success: true,
      message: 'Reset email sent'
    });

    render(
      <MemoryRouter>
        <ForgotPasswordPage />
      </MemoryRouter>
    );

    await user.type(screen.getByLabelText(/Email Address/i), 'user@example.com');
    await user.click(screen.getByRole('button', { name: /Send Reset Link/i }));

    expect(await screen.findByText(/Check Your Email/i)).toBeInTheDocument();
    expect(screen.getByText(/We've sent a password reset link to/i)).toBeInTheDocument();
    expect(screen.getByText('user@example.com')).toBeInTheDocument();
  });

  test('shows API error message when API returns success=false', async () => {
    const user = userEvent.setup();

    mockForgotPassword.mockResolvedValue({
      success: false,
      message: 'Too many requests'
    });

    render(
      <MemoryRouter>
        <ForgotPasswordPage />
      </MemoryRouter>
    );

    await user.type(screen.getByLabelText(/Email Address/i), 'user@example.com');
    await user.click(screen.getByRole('button', { name: /Send Reset Link/i }));

    expect(await screen.findByText(/Too many requests/i)).toBeInTheDocument();
  });

  test('shows default error message when API throws (no response message)', async () => {
    const user = userEvent.setup();

    mockForgotPassword.mockRejectedValue(new Error('Network down'));

    render(
      <MemoryRouter>
        <ForgotPasswordPage />
      </MemoryRouter>
    );

    await user.type(screen.getByLabelText(/Email Address/i), 'user@example.com');
    await user.click(screen.getByRole('button', { name: /Send Reset Link/i }));

    expect(
      await screen.findByText(/Failed to send reset email\. Please try again\./i)
    ).toBeInTheDocument();
  });

  test('shows backend error message when API throws with response.data.message', async () => {
    const user = userEvent.setup();

    mockForgotPassword.mockRejectedValue({
      response: { data: { message: 'Email service down' } }
    });

    render(
      <MemoryRouter>
        <ForgotPasswordPage />
      </MemoryRouter>
    );

    await user.type(screen.getByLabelText(/Email Address/i), 'user@example.com');
    await user.click(screen.getByRole('button', { name: /Send Reset Link/i }));

    expect(await screen.findByText(/Email service down/i)).toBeInTheDocument();
  });

  test('disables input + button while loading', async () => {
    const user = userEvent.setup();

    // Make promise never resolve so loading stays true
    mockForgotPassword.mockImplementation(() => new Promise(() => { }));

    render(
      <MemoryRouter>
        <ForgotPasswordPage />
      </MemoryRouter>
    );

    const input = screen.getByLabelText(/Email Address/i);
    const button = screen.getByRole('button', { name: /Send Reset Link/i });

    await user.type(input, 'user@example.com');
    await user.click(button);

    expect(input).toBeDisabled();
    expect(button).toBeDisabled();
  });

  test('Try Different Email button returns to form', async () => {
    const user = userEvent.setup();

    mockForgotPassword.mockResolvedValue({
      success: true,
      message: 'Reset email sent'
    });

    render(
      <MemoryRouter>
        <ForgotPasswordPage />
      </MemoryRouter>
    );

    await user.type(screen.getByLabelText(/Email Address/i), 'user@example.com');
    await user.click(screen.getByRole('button', { name: /Send Reset Link/i }));

    expect(await screen.findByText(/Check Your Email/i)).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /Try Different Email/i }));

    expect(screen.getByText(/Reset Password/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Email Address/i)).toBeInTheDocument();
  });

  test('clears the email input after success (security)', async () => {
    const user = userEvent.setup();

    mockForgotPassword.mockResolvedValue({
      success: true,
      message: 'Reset email sent'
    });

    render(
      <MemoryRouter>
        <ForgotPasswordPage />
      </MemoryRouter>
    );

    const input = screen.getByLabelText(/Email Address/i);

    await user.type(input, 'user@example.com');
    await user.click(screen.getByRole('button', { name: /Send Reset Link/i }));

    expect(await screen.findByText(/Check Your Email/i)).toBeInTheDocument();

    // go back
    await user.click(screen.getByRole('button', { name: /Try Different Email/i }));

    // input should be empty
    expect(screen.getByLabelText(/Email Address/i)).toHaveValue('');
  });
});

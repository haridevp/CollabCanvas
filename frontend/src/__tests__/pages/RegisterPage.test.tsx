import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from "react-router-dom";
import { vi, describe, it, expect, beforeEach } from "vitest";
import RegisterPage from '../../pages/RegisterPage';
import { registerUser } from '../../utils/authService';
import { validateEmailFormat } from '../../utils/emailValidation';
import { useNavigate } from 'react-router-dom';

// ================== MOCKS ==================

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    Link: ({ to, children, ...rest }: any) => (
      <a href={to} {...rest}>
        {children}
      </a>
    ),
    useNavigate: vi.fn(),
  };
});

vi.mock('../../components/ui/Button', () => ({
  Button: ({ children, disabled, isLoading, variant, ...rest }: any) => (
    <button disabled={disabled} data-loading={isLoading ? 'true' : 'false'} {...rest}>
      {children}
    </button>
  ),
}));

vi.mock('../../components/ui/PasswordStrengthMeter', () => ({
  PasswordStrengthMeter: ({ password }: any) => (
    <div data-testid="password-meter">Strength for: {password}</div>
  ),
}));

vi.mock('../../components/ui/UsernameChecker', () => ({
  UsernameChecker: ({ username, onAvailabilityChange }: any) => (
    <div data-testid="username-checker">
      <div>Username: {username}</div>
      <button onClick={() => onAvailabilityChange(true)}>Mark Available</button>
      <button onClick={() => onAvailabilityChange(false)}>Mark Unavailable</button>
    </div>
  ),
}));

vi.mock('../../utils/authService', () => ({
  registerUser: vi.fn(),
}));

vi.mock('../../utils/emailValidation', () => ({
  validateEmailFormat: vi.fn(),
}));

vi.mock('../../utils/navigation', () => ({
  openInNewTab: vi.fn(),
}));

vi.mock('../../components/ui/Modal', () => ({
  Modal: ({ isOpen, title, children }: any) =>
    isOpen ? (
      <div data-testid="modal">
        <h2>{title}</h2>
        {children}
      </div>
    ) : null,
}));

vi.mock('../../components/legal/TermsOfServiceContent', () => ({
  TermsOfServiceContent: () => <div data-testid="tos-content">TOS Content</div>,
}));

vi.mock('../../components/legal/PrivacyPolicyContent', () => ({
  PrivacyPolicyContent: () => <div data-testid="pp-content">PP Content</div>,
}));

// ================== TESTS ==================

describe('RegisterPage', () => {
  const navigateMock = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    (useNavigate as any).mockReturnValue(navigateMock);

    vi.spyOn(window, 'alert').mockImplementation(() => { });

    // Default: valid email
    vi.mocked(validateEmailFormat).mockImplementation((email: string) => ({
      valid: email.includes('@'),
      message: email.includes('@') ? '' : 'Invalid email format',
    }));
  });

  it('renders all main inputs and submit button', () => {
    render(
      <MemoryRouter>
        <RegisterPage />
      </MemoryRouter>
    );

    expect(screen.getByLabelText(/Full name/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Username/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Email address/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/^Password$/i)).toBeInTheDocument();

    expect(screen.getByRole('button', { name: /Sign Up/i })).toBeInTheDocument();
    expect(screen.getByTestId('username-checker')).toBeInTheDocument();
    expect(screen.getByTestId('password-meter')).toBeInTheDocument();
  });

  it("clicking Terms of Service opens modal", async () => {
    const user = userEvent.setup();
    render(
      <MemoryRouter>
        <RegisterPage />
      </MemoryRouter>
    );

    const tosLink = screen.getByRole("button", { name: /Terms of Service/i });
    expect(tosLink).toBeInTheDocument();

    await user.click(tosLink);
    expect(screen.getByTestId("modal")).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /Terms of Service/i })).toBeInTheDocument();
  });

  it("clicking Privacy Policy opens modal", async () => {
    const user = userEvent.setup();
    render(
      <MemoryRouter>
        <RegisterPage />
      </MemoryRouter>
    );

    const ppLink = screen.getByRole("button", { name: /Privacy Policy/i });
    expect(ppLink).toBeInTheDocument();

    await user.click(ppLink);
    expect(screen.getByTestId("modal")).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /Privacy Policy/i })).toBeInTheDocument();
  });

  it('email validation: invalid email shows error message and aria-invalid=true', () => {
    vi.mocked(validateEmailFormat).mockReturnValueOnce({
      valid: false,
      message: 'Invalid email format',
    });

    render(
      <MemoryRouter>
        <RegisterPage />
      </MemoryRouter>
    );

    const emailInput = screen.getByLabelText(/Email address/i);

    fireEvent.change(emailInput, { target: { value: 'bademail' } });

    expect(screen.getByRole('alert')).toHaveTextContent('Invalid email format');
    expect(emailInput).toHaveAttribute('aria-invalid', 'true');
  });

  it('submit: missing fields shows alert and does not call registerUser', async () => {
    render(
      <MemoryRouter>
        <RegisterPage />
      </MemoryRouter>
    );

    const submit = screen.getByRole('button', { name: /Sign Up/i });
    expect(submit).toBeDisabled();

    fireEvent.click(submit);
    expect(registerUser).not.toHaveBeenCalled();
  });

  it('submit: username not available shows alert', async () => {
    render(
      <MemoryRouter>
        <RegisterPage />
      </MemoryRouter>
    );

    fireEvent.change(screen.getByLabelText(/Full name/i), { target: { value: 'John Doe' } });
    fireEvent.change(screen.getByLabelText(/Username/i), { target: { value: 'john' } });
    fireEvent.change(screen.getByLabelText(/Email address/i), { target: { value: 'john@test.com' } });
    fireEvent.change(screen.getByLabelText(/^Password$/i), { target: { value: 'password123' } });

    // do NOT mark available
    const submit = screen.getByRole('button', { name: /Sign Up/i });
    expect(submit).toBeDisabled();

    fireEvent.click(submit);
    expect(registerUser).not.toHaveBeenCalled();
  });

  it('submit: invalid email shows alert', async () => {
    vi.mocked(validateEmailFormat).mockReturnValue({
      valid: false,
      message: 'Email invalid',
    });

    render(
      <MemoryRouter>
        <RegisterPage />
      </MemoryRouter>
    );

    fireEvent.change(screen.getByLabelText(/Full name/i), { target: { value: 'John Doe' } });
    fireEvent.change(screen.getByLabelText(/Username/i), { target: { value: 'john' } });
    fireEvent.change(screen.getByLabelText(/Email address/i), { target: { value: 'bad' } });
    fireEvent.change(screen.getByLabelText(/^Password$/i), { target: { value: 'password123' } });

    fireEvent.click(screen.getByRole('button', { name: /Mark Available/i }));

    const submit = screen.getByRole('button', { name: /Sign Up/i });
    expect(submit).toBeDisabled();

    fireEvent.click(submit);
    expect(registerUser).not.toHaveBeenCalled();
  });

  it('submit: not agreeing to terms shows alert', async () => {
    render(
      <MemoryRouter>
        <RegisterPage />
      </MemoryRouter>
    );

    fireEvent.change(screen.getByLabelText(/Full name/i), { target: { value: 'John Doe' } });
    fireEvent.change(screen.getByLabelText(/Username/i), { target: { value: 'john' } });
    fireEvent.change(screen.getByLabelText(/Email address/i), { target: { value: 'john@test.com' } });
    fireEvent.change(screen.getByLabelText(/^Password$/i), { target: { value: 'password123' } });

    fireEvent.click(screen.getByRole('button', { name: /Mark Available/i }));

    // do NOT check terms
    const submit = screen.getByRole('button', { name: /Sign Up/i });
    expect(submit).toBeDisabled();

    fireEvent.click(submit);
    expect(registerUser).not.toHaveBeenCalled();
  });

  it('submit: password too short shows alert', async () => {
    render(
      <MemoryRouter>
        <RegisterPage />
      </MemoryRouter>
    );

    fireEvent.change(screen.getByLabelText(/Full name/i), { target: { value: 'John Doe' } });
    fireEvent.change(screen.getByLabelText(/Username/i), { target: { value: 'john' } });
    fireEvent.change(screen.getByLabelText(/Email address/i), { target: { value: 'john@test.com' } });
    fireEvent.change(screen.getByLabelText(/^Password$/i), { target: { value: 'short' } });

    fireEvent.click(screen.getByRole('button', { name: /Mark Available/i }));

    fireEvent.click(screen.getByLabelText(/Agree to terms and conditions/i));

    fireEvent.click(screen.getByRole('button', { name: /Sign Up/i }));

    expect(window.alert).toHaveBeenCalledWith('Password must be at least 8 characters long');
    expect(registerUser).not.toHaveBeenCalled();
  });

  it('successful registration: calls registerUser with normalized data and navigates', async () => {
    vi.mocked(registerUser).mockResolvedValueOnce({ success: true, message: 'Registration successful' });

    render(
      <MemoryRouter>
        <RegisterPage />
      </MemoryRouter>
    );

    fireEvent.change(screen.getByLabelText(/Full name/i), { target: { value: 'John Doe' } });
    fireEvent.change(screen.getByLabelText(/Username/i), { target: { value: 'JohnUser' } });
    fireEvent.change(screen.getByLabelText(/Email address/i), { target: { value: 'John@Test.com' } });
    fireEvent.change(screen.getByLabelText(/^Password$/i), { target: { value: 'password123' } });

    fireEvent.click(screen.getByRole('button', { name: /Mark Available/i }));
    fireEvent.click(screen.getByLabelText(/Agree to terms and conditions/i));

    fireEvent.click(screen.getByRole('button', { name: /Sign Up/i }));

    await waitFor(() => {
      expect(registerUser).toHaveBeenCalledTimes(1);
    });

    expect(registerUser).toHaveBeenCalledWith({
      fullName: 'John Doe',
      username: 'johnuser',
      email: 'john@test.com',
      password: 'password123',
    });

    expect(navigateMock).toHaveBeenCalledWith('/registration-success', {
      state: {
        email: 'John@Test.com',
        message: 'Registration successful! Please check your email.',
      },
    });
  });

  it('failed registration: shows alert with backend message', async () => {
    vi.mocked(registerUser).mockResolvedValueOnce({
      success: false,
      message: 'Username already exists',
    });

    render(<RegisterPage />);

    fireEvent.change(screen.getByLabelText(/Full name/i), { target: { value: 'John Doe' } });
    fireEvent.change(screen.getByLabelText(/Username/i), { target: { value: 'johnuser' } });
    fireEvent.change(screen.getByLabelText(/Email address/i), { target: { value: 'john@test.com' } });
    fireEvent.change(screen.getByLabelText(/^Password$/i), { target: { value: 'password123' } });

    fireEvent.click(screen.getByRole('button', { name: /Mark Available/i }));
    fireEvent.click(screen.getByLabelText(/Agree to terms and conditions/i));

    fireEvent.click(screen.getByRole('button', { name: /Sign Up/i }));

    await waitFor(() => {
      expect(registerUser).toHaveBeenCalledTimes(1);
    });

    expect(window.alert).toHaveBeenCalledWith('Username already exists');
  });

  it('thrown error registration: shows fallback alert message', async () => {
    vi.mocked(registerUser).mockRejectedValueOnce(new Error('Network error'));

    render(<RegisterPage />);

    fireEvent.change(screen.getByLabelText(/Full name/i), { target: { value: 'John Doe' } });
    fireEvent.change(screen.getByLabelText(/Username/i), { target: { value: 'johnuser' } });
    fireEvent.change(screen.getByLabelText(/Email address/i), { target: { value: 'john@test.com' } });
    fireEvent.change(screen.getByLabelText(/^Password$/i), { target: { value: 'password123' } });

    fireEvent.click(screen.getByRole('button', { name: /Mark Available/i }));
    fireEvent.click(screen.getByLabelText(/Agree to terms and conditions/i));

    fireEvent.click(screen.getByRole('button', { name: /Sign Up/i }));

    await waitFor(() => {
      expect(registerUser).toHaveBeenCalledTimes(1);
    });

    expect(window.alert).toHaveBeenCalledWith('Registration failed. Please try again.');
  });

  it('submit button disabled when terms not checked / username not available / email invalid', () => {
    vi.mocked(validateEmailFormat).mockReturnValue({
      valid: false,
      message: 'Bad email',
    });

    render(<RegisterPage />);

    const submit = screen.getByRole('button', { name: /Sign Up/i });

    // Initially: username unavailable + email invalid + terms unchecked => disabled
    expect(submit).toBeDisabled();

    // Make email valid
    vi.mocked(validateEmailFormat).mockReturnValue({
      valid: true,
      message: '',
    });

    fireEvent.change(screen.getByLabelText(/Email address/i), {
      target: { value: 'good@test.com' },
    });

    // Still disabled because username not marked available + terms not checked
    expect(submit).toBeDisabled();

    // Mark username available
    fireEvent.click(screen.getByRole('button', { name: /Mark Available/i }));
    expect(submit).toBeDisabled();

    // Agree terms
    fireEvent.click(screen.getByLabelText(/Agree to terms and conditions/i));
    expect(submit).not.toBeDisabled();
  });
});
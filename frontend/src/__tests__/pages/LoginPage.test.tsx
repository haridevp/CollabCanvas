import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { vi, describe, it, expect, beforeEach } from "vitest";
import LoginPage from "../../pages/LoginPage";

/* -------------------- MOCKS -------------------- */

// mock navigate
const mockNavigate = vi.fn();

// mock AuthContext
const mockLogin = vi.fn();

// mock authService
const mockLoginWithEmailPassword = vi.fn();
const mockGetDeviceType = vi.fn();

// react-router mocks
vi.mock("react-router-dom", async () => {
  const actual = await vi.importActual("react-router-dom");
  return {
    ...actual,
    useNavigate: () => mockNavigate,
    useLocation: () => ({
      state: null,
    }),
  };
});

// AuthContext mock
vi.mock("../../services/AuthContext", () => ({
  useAuth: () => ({
    login: mockLogin,
  }),
}));

// authService mock
vi.mock("../../utils/authService", () => ({
  loginWithEmailPassword: (creds: any, activity: any) =>
    mockLoginWithEmailPassword(creds, activity),
  getDeviceType: () => mockGetDeviceType(),
}));

describe("LoginPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
  });

  it("renders login UI", () => {
    render(
      <MemoryRouter>
        <LoginPage />
      </MemoryRouter>
    );

    expect(screen.getByText(/Welcome back/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/^Email Address$/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/^Password$/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Sign In/i })).toBeInTheDocument();

    expect(screen.getByText(/Recent Login Activity/i)).toBeInTheDocument();
  });

  it("shows no activity message if none exist in localStorage", () => {
    render(
      <MemoryRouter>
        <LoginPage />
      </MemoryRouter>
    );
    expect(screen.getByText(/No recent activity found/i)).toBeInTheDocument();
  });

  it("loads recent activities from localStorage (max 3)", () => {
    localStorage.setItem(
      "login_activities",
      JSON.stringify([
        { timestamp: "2025-01-01T10:00:00Z", ipAddress: "1.1.1.1", deviceType: "Chrome" },
        { timestamp: "2025-01-01T11:00:00Z", ipAddress: "2.2.2.2", deviceType: "Firefox" },
        { timestamp: "2025-01-01T12:00:00Z", ipAddress: "3.3.3.3", deviceType: "Edge" },
        { timestamp: "2025-01-01T13:00:00Z", ipAddress: "4.4.4.4", deviceType: "Safari" },
      ])
    );

    render(
      <MemoryRouter>
        <LoginPage />
      </MemoryRouter>
    );

    // only first 3 should show
    expect(screen.getByText(/1\.1\.1\.1/i)).toBeInTheDocument();
    expect(screen.getByText(/2\.2\.2\.2/i)).toBeInTheDocument();
    expect(screen.getByText(/3\.3\.3\.3/i)).toBeInTheDocument();

    expect(screen.queryByText(/4\.4\.4\.4/i)).not.toBeInTheDocument();
  });

  it("loads remembered email from localStorage and checks rememberMe", () => {
    localStorage.setItem("remembered_email", "saved@example.com");

    render(
      <MemoryRouter>
        <LoginPage />
      </MemoryRouter>
    );

    expect(screen.getByLabelText(/^Email Address$/i)).toHaveValue("saved@example.com");
    expect(screen.getByRole("checkbox", { name: /Remember me/i })).toBeChecked();
  });

  it("shows validation error if email or password missing", async () => {
    const user = userEvent.setup();
    render(
      <MemoryRouter>
        <LoginPage />
      </MemoryRouter>
    );

    await user.click(screen.getByRole("button", { name: /Sign In/i }));

    expect(
      await screen.findByText(/Please enter both email and password/i)
    ).toBeInTheDocument();

    expect(mockLoginWithEmailPassword).not.toHaveBeenCalled();
  });

  it("toggles password visibility when eye button clicked", async () => {
    const user = userEvent.setup();
    render(
      <MemoryRouter>
        <LoginPage />
      </MemoryRouter>
    );

    const passwordInput = screen.getByLabelText(/^Password$/i);
    const toggleBtn = screen.getByRole("button", { name: /Show password/i });

    expect(passwordInput).toHaveAttribute("type", "password");

    await user.click(toggleBtn);

    expect(passwordInput).toHaveAttribute("type", "text");

    // button label flips
    expect(screen.getByRole("button", { name: /Hide password/i })).toBeInTheDocument();
  });

  it("calls loginWithEmailPassword with correct args", async () => {
    const user = userEvent.setup();

    mockGetDeviceType.mockReturnValue("Windows");
    mockLoginWithEmailPassword.mockResolvedValue({
      success: true,
      token: "abc123",
      user: { id: 1, name: "Sid" },
    });

    render(
      <MemoryRouter>
        <LoginPage />
      </MemoryRouter>
    );

    await user.type(screen.getByLabelText(/^Email Address$/i), "user@example.com");
    await user.type(screen.getByLabelText(/^Password$/i), "pass123");

    await user.click(screen.getByRole("button", { name: /Sign In/i }));

    await waitFor(() => {
      expect(mockLoginWithEmailPassword).toHaveBeenCalledWith(
        { email: "user@example.com", password: "pass123" },
        { deviceType: "Windows", ipAddress: "Auto-detected by server" }
      );
    });
  });

  it("on success: calls AuthContext login() and navigates to /dashboard by default", async () => {
    const user = userEvent.setup();

    mockGetDeviceType.mockReturnValue("Windows");
    mockLoginWithEmailPassword.mockResolvedValue({
      success: true,
      token: "token123",
      user: { id: 99, email: "user@example.com" },
    });

    render(
      <MemoryRouter>
        <LoginPage />
      </MemoryRouter>
    );

    await user.type(screen.getByLabelText(/^Email Address$/i), "user@example.com");
    await user.type(screen.getByLabelText(/^Password$/i), "pass123");
    await user.click(screen.getByRole("button", { name: /Sign In/i }));

    await waitFor(() => {
      expect(mockLogin).toHaveBeenCalledWith("token123", {
        id: 99,
        email: "user@example.com",
      });
    });

    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith("/dashboard", { replace: true });
    });
  });

  it("on success: if rememberMe checked, stores remembered_email", async () => {
    const user = userEvent.setup();

    mockGetDeviceType.mockReturnValue("Windows");
    mockLoginWithEmailPassword.mockResolvedValue({
      success: true,
      token: "token123",
      user: { id: 1 },
    });

    render(
      <MemoryRouter>
        <LoginPage />
      </MemoryRouter>
    );

    await user.type(screen.getByLabelText(/^Email Address$/i), "remember@example.com");
    await user.type(screen.getByLabelText(/^Password$/i), "pass123");

    await user.click(screen.getByRole("checkbox", { name: /Remember me/i }));
    await user.click(screen.getByRole("button", { name: /Sign In/i }));

    await waitFor(() => {
      expect(localStorage.getItem("remembered_email")).toBe("remember@example.com");
    });
  });

  it("on success: if rememberMe NOT checked, removes remembered_email", async () => {
    const user = userEvent.setup();

    localStorage.setItem("remembered_email", "old@example.com");

    mockGetDeviceType.mockReturnValue("Windows");
    mockLoginWithEmailPassword.mockResolvedValue({
      success: true,
      token: "token123",
      user: { id: 1 },
    });

    render(
      <MemoryRouter>
        <LoginPage />
      </MemoryRouter>
    );

    const emailInput = screen.getByLabelText(/^Email Address$/i);
    await user.clear(emailInput);
    await user.type(emailInput, "new@example.com");
    await user.type(screen.getByLabelText(/^Password$/i), "pass123");

    // Uncheck remember me
    await user.click(screen.getByRole("checkbox", { name: /Remember me/i }));
    await user.click(screen.getByRole("button", { name: /Sign In/i }));

    await waitFor(() => {
      expect(localStorage.getItem("remembered_email")).toBe(null);
    });
  });

  it("shows API error message when result.success=false", async () => {
    const user = userEvent.setup();

    mockGetDeviceType.mockReturnValue("Windows");
    mockLoginWithEmailPassword.mockResolvedValue({
      success: false,
      message: "Invalid credentials",
    });

    render(
      <MemoryRouter>
        <LoginPage />
      </MemoryRouter>
    );

    await user.type(screen.getByLabelText(/^Email Address$/i), "user@example.com");
    await user.type(screen.getByLabelText(/^Password$/i), "wrongpass");
    await user.click(screen.getByRole("button", { name: /Sign In/i }));

    expect(await screen.findByText(/Invalid credentials/i)).toBeInTheDocument();
  });

  it("shows connection error when API throws", async () => {
    const user = userEvent.setup();

    mockGetDeviceType.mockReturnValue("Windows");
    const networkError: any = new Error("Network error");
    networkError.request = {}; // Trigger connection error path
    mockLoginWithEmailPassword.mockRejectedValue(networkError);

    render(
      <MemoryRouter>
        <LoginPage />
      </MemoryRouter>
    );

    await user.type(screen.getByLabelText(/^Email Address$/i), "user@example.com");
    await user.type(screen.getByLabelText(/^Password$/i), "pass123");
    await user.click(screen.getByRole("button", { name: /Sign In/i }));

    expect(
      await screen.findByText(/Could not connect to the server/i)
    ).toBeInTheDocument();
  });

  it("disables inputs while loading", async () => {
    const user = userEvent.setup();

    mockGetDeviceType.mockReturnValue("Windows");
    mockLoginWithEmailPassword.mockImplementation(() => new Promise(() => { }));

    render(
      <MemoryRouter>
        <LoginPage />
      </MemoryRouter>
    );

    const emailInput = screen.getByLabelText(/^Email Address$/i);
    const passwordInput = screen.getByLabelText(/^Password$/i);
    const submitBtn = screen.getByRole("button", { name: /Sign In/i });

    await user.type(emailInput, "user@example.com");
    await user.type(passwordInput, "pass123");
    await user.click(submitBtn);

    expect(emailInput).toBeDisabled();
    expect(passwordInput).toBeDisabled();
  });
});

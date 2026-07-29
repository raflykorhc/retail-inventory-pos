import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import LoginPage from './page';
import { BrowserRouter } from 'react-router-dom';
import { authService } from '../../services/authService';
import { useAuthStore } from '../../store/useAuthStore';
import { toast } from 'sonner';

// Mock dependencies
jest.mock('../../services/authService');
jest.mock('../../store/useAuthStore');
jest.mock('sonner', () => ({
  toast: {
    success: jest.fn(),
    error: jest.fn(),
    info: jest.fn(),
  },
}));

// Mock react-router-dom hooks
const mockNavigate = jest.fn();
jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useNavigate: () => mockNavigate,
  useLocation: () => ({ state: {} }),
}));

// Mock framer-motion to avoid animation issues in tests
jest.mock('motion/react', () => ({
  motion: {
    div: ({ children, ...props }: any) => <div {...props}>{children}</div>,
    button: ({ children, ...props }: any) => <button {...props}>{children}</button>,
    h1: ({ children, ...props }: any) => <h1 {...props}>{children}</h1>,
  },
  AnimatePresence: ({ children }: any) => <>{children}</>,
}));

describe('LoginPage', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (useAuthStore as any).mockReturnValue({
      setAuth: jest.fn(),
      isAuthenticated: false,
    });
    // @ts-ignore
    useAuthStore.getState = jest.fn().mockReturnValue({ user: null });
  });

  it('renders login form and brand information', () => {
    render(
      <BrowserRouter>
        <LoginPage />
      </BrowserRouter>
    );
    
    expect(screen.getByText(/SUKSES/i)).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/Masukkan username/i)).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/••••••••/i)).toBeInTheDocument();
    expect(screen.getByText(/MASUK KE SISTEM/i)).toBeInTheDocument();
  });

  it('shows validation errors when fields are empty', async () => {
    render(
      <BrowserRouter>
        <LoginPage />
      </BrowserRouter>
    );

    fireEvent.click(screen.getByText(/MASUK KE SISTEM/i));

    await waitFor(() => {
      expect(screen.getByText(/Username minimal 3 karakter/i)).toBeInTheDocument();
      expect(screen.getByText(/Password minimal 4 karakter/i)).toBeInTheDocument();
    });
  });

  it('handles successful login and redirects based on role', async () => {
    const mockUser = { username: 'admin', role: 'ADMIN' };
    const mockResponse = { token: 'token-123', user: mockUser };
    (authService.login as jest.Mock).mockResolvedValue(mockResponse);

    render(
      <BrowserRouter>
        <LoginPage />
      </BrowserRouter>
    );

    fireEvent.change(screen.getByPlaceholderText(/Masukkan username/i), { target: { value: 'admin' } });
    fireEvent.change(screen.getByPlaceholderText(/••••••••/i), { target: { value: 'password123' } });
    
    fireEvent.click(screen.getByText(/MASUK KE SISTEM/i));

    await waitFor(() => {
      expect(authService.login).toHaveBeenCalledWith({
        username: 'admin',
        password: 'password123'
      });
      expect(toast.success).toHaveBeenCalledWith(expect.stringContaining('Berhasil Masuk'), expect.any(Object));
      expect(mockNavigate).toHaveBeenCalledWith('/dashboard', { replace: true });
    });
  });

  it('shows error toast when login fails', async () => {
    (authService.login as jest.Mock).mockRejectedValue({
      response: { data: { error: 'Invalid credentials' } }
    });

    render(
      <BrowserRouter>
        <LoginPage />
      </BrowserRouter>
    );

    fireEvent.change(screen.getByPlaceholderText(/Masukkan username/i), { target: { value: 'wrong' } });
    fireEvent.change(screen.getByPlaceholderText(/••••••••/i), { target: { value: 'wrong' } });
    
    fireEvent.click(screen.getByText(/MASUK KE SISTEM/i));

    await waitFor(() => {
      expect(screen.getByText(/Invalid credentials/i)).toBeInTheDocument();
      expect(toast.error).toHaveBeenCalled();
    });
  });
});

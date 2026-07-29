import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import DebtsPage from './page';
import { useTheme } from '../../context/ThemeContext';

// Mocking ThemeContext
jest.mock('../../context/ThemeContext', () => ({
  useTheme: jest.fn(),
}));

// Mocking lucide-react
jest.mock('lucide-react', () => ({
  Receipt: () => <div data-testid="icon-receipt" />,
  Search: () => <div data-testid="icon-search" />,
  Filter: () => <div data-testid="icon-filter" />,
  CreditCard: () => <div data-testid="icon-credit-card" />,
  Calendar: () => <div data-testid="icon-calendar" />,
  User: () => <div data-testid="icon-user" />,
  CheckCircle2: () => <div data-testid="icon-check" />,
  AlertCircle: () => <div data-testid="icon-alert" />,
  History: () => <div data-testid="icon-history" />,
  ArrowRight: () => <div data-testid="icon-arrow-right" />,
  Plus: () => <div data-testid="icon-plus" />,
  X: () => <div data-testid="icon-x" />,
  Bell: () => <div data-testid="icon-bell" />,
  Send: () => <div data-testid="icon-send" />,
  Loader2: () => <div data-testid="icon-loader" />,
}));

// Mocking fetch
global.fetch = jest.fn();

const mockDebts = [
  {
    id: '1',
    saleId: 'sale-1',
    amountDue: 100000,
    remainingBalance: 50000,
    dueDate: new Date(Date.now() + 86400000).toISOString(), // Tomorrow
    status: 'PARTIAL',
    lastReminderSent: null,
    sale: {
      invoiceNumber: 'INV-001',
      customer: {
        name: 'John Doe',
        phone: '08123456789',
        email: 'john@example.com'
      }
    }
  },
  {
    id: '2',
    saleId: 'sale-2',
    amountDue: 200000,
    remainingBalance: 200000,
    dueDate: new Date(Date.now() - 86400000).toISOString(), // Yesterday
    status: 'UNPAID',
    lastReminderSent: null,
    sale: {
      invoiceNumber: 'INV-002',
      customer: {
        name: 'Jane Smith',
        phone: '08987654321',
        email: 'jane@example.com'
      }
    }
  }
];

const mockThemeContext = {
  theme: 'light',
  toggleTheme: jest.fn(),
};

describe('DebtsPage Component', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (global.fetch as jest.Mock).mockImplementation((url) => {
      if (url === '/api/debts') {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve(mockDebts),
        });
      }
      if (url.includes('/remind')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ message: 'Reminder sent' }),
        });
      }
      return Promise.reject(new Error('Unknown URL'));
    });
  });

  const renderWithTheme = (ui: React.ReactElement) => {
    (useTheme as jest.Mock).mockReturnValue(mockThemeContext);
    return render(ui);
  };

  it('should render the page title and stats', async () => {
    renderWithTheme(<DebtsPage />);
    
    expect(screen.getByText('Total Piutang Aktif')).toBeInTheDocument();
    
    await waitFor(() => {
      expect(screen.getByText('Rp 250.000')).toBeInTheDocument(); // 50k + 200k
    });
  });

  it('should display the list of debts', async () => {
    renderWithTheme(<DebtsPage />);
    
    await waitFor(() => {
      expect(screen.getByText('John Doe')).toBeInTheDocument();
      expect(screen.getByText('Jane Smith')).toBeInTheDocument();
      expect(screen.getByText('INV-001')).toBeInTheDocument();
      expect(screen.getByText('INV-002')).toBeInTheDocument();
    });
  });

  it('should filter debts based on search query', async () => {
    renderWithTheme(<DebtsPage />);
    
    await waitFor(() => expect(screen.getByText('John Doe')).toBeInTheDocument());
    
    const searchInput = screen.getByPlaceholderText('Cari pelanggan atau invoice...');
    fireEvent.change(searchInput, { target: { value: 'John' } });
    
    await waitFor(() => {
      expect(screen.getByText('John Doe')).toBeInTheDocument();
      expect(screen.queryByText('Jane Smith')).not.toBeInTheDocument();
    }, { timeout: 3000 });
  });

  it('should handle sending a reminder', async () => {
    renderWithTheme(<DebtsPage />);
    
    await waitFor(() => expect(screen.getAllByTitle('Kirim Pengingat')[0]).toBeInTheDocument());
    
    const remindButtons = screen.getAllByTitle('Kirim Pengingat');
    fireEvent.click(remindButtons[0]);
    
    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(expect.stringContaining('/api/debts/1/remind'), expect.any(Object));
      expect(screen.getByText('Reminder sent')).toBeInTheDocument();
    });
  });

  it('should handle API errors gracefully', async () => {
    (global.fetch as jest.Mock).mockImplementationOnce(() => 
      Promise.resolve({
        ok: false,
        json: () => Promise.resolve({ error: 'Failed to fetch' }),
      })
    );
    
    renderWithTheme(<DebtsPage />);
    
    await waitFor(() => {
      // Should not crash, maybe show empty state or error message if implemented
      // In current code, it logs to console and sets empty array
      expect(screen.queryByText('John Doe')).not.toBeInTheDocument();
    });
  });

  it('should show nearing due count correctly', async () => {
    renderWithTheme(<DebtsPage />);
    
    await waitFor(() => {
      // The text is "1 Transaksi" in the summary card
      // Using a regex to match "1 Transaksi" even with whitespace
      expect(screen.getByText(/1\s+Transaksi/)).toBeInTheDocument();
    });
  });
});

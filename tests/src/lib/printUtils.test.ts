import { handlePrintInvoice } from './printUtils';

describe('printUtils', () => {
  let mockWindow: any;

  beforeEach(() => {
    // Setup mock window
    mockWindow = {
      document: {
        open: jest.fn(),
        write: jest.fn(),
        close: jest.fn(),
      },
    };
    
    // Mock window.open
    jest.spyOn(window, 'open').mockReturnValue(mockWindow);
    // Mock alert
    jest.spyOn(window, 'alert').mockImplementation(() => {});
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('should open a new window and write HTML invoice content', () => {
    const mockSale = {
      invoiceNumber: 'INV-TEST-123',
      createdAt: '2024-01-01T10:00:00Z',
      totalAmount: 150000,
      items: [
        { 
          product: { name: 'Paku 5cm' }, 
          quantity: 2, 
          priceAtSale: 75000, 
          unit: { name: 'Kg' } 
        }
      ],
      customer: { name: 'Toko Bangunan A' }
    };

    handlePrintInvoice(mockSale);

    expect(window.open).toHaveBeenCalledWith('', '_blank');
    expect(mockWindow.document.open).toHaveBeenCalled();
    
    // Verify specific content in the generated HTML
    const writtenHtml = mockWindow.document.write.mock.calls[0][0];
    expect(writtenHtml).toContain('INV-TEST-123');
    expect(writtenHtml).toContain('Paku 5cm');
    expect(writtenHtml).toContain('Toko Bangunan A');
    expect(writtenHtml).toContain('150.000'); // Formatted currency check
    
    expect(mockWindow.document.close).toHaveBeenCalled();
  });

  it('should show alert if popup is blocked', () => {
    jest.spyOn(window, 'open').mockReturnValue(null);
    
    handlePrintInvoice({});
    
    expect(window.alert).toHaveBeenCalledWith(expect.stringContaining('izinkan pop-up'));
  });
});

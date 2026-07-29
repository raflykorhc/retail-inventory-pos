import React from 'react';
import { render, screen } from '@testing-library/react';
import { SummaryCard } from './SummaryCard';
import { DollarSign } from 'lucide-react';

// Mock recharts because it uses ResponsiveContainer which is hard to test in JSDOM
jest.mock('recharts', () => ({
  ResponsiveContainer: ({ children }: any) => <div>{children}</div>,
  LineChart: ({ children }: any) => <div>{children}</div>,
  Line: () => <div />,
}));

describe('SummaryCard', () => {
  it('renders title and value correctly', () => {
    render(
      <SummaryCard 
        title="Total Sales" 
        value="Rp 1.000.000" 
        icon={<DollarSign data-testid="icon" />} 
        color="blue" 
      />
    );

    expect(screen.getByText(/Total Sales/i)).toBeInTheDocument();
    expect(screen.getByText(/Rp 1.000.000/i)).toBeInTheDocument();
  });

  it('displays trend information when provided', () => {
    render(
      <SummaryCard 
        title="Revenue" 
        value="500" 
        icon={<DollarSign />} 
        color="green" 
        trend="+12%" 
        isPositive={true} 
      />
    );

    expect(screen.getByText(/\+12%/)).toBeInTheDocument();
  });

  it('applies color classes correctly', () => {
    const { container } = render(
      <SummaryCard 
        title="Alerts" 
        value="5" 
        icon={<DollarSign />} 
        color="red" 
      />
    );

    // Check for red color class on the icon container
    const iconContainer = container.querySelector('.bg-status-danger\\/10');
    expect(iconContainer).toBeInTheDocument();
  });
});

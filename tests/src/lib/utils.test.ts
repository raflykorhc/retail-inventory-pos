import { cn, formatCurrency, formatCompactCurrency } from './utils';

describe('Utility Functions', () => {
  describe('cn', () => {
    it('should merge tailwind classes correctly', () => {
      expect(cn('px-2', 'py-2')).toBe('px-2 py-2');
      expect(cn('px-2 py-2', 'p-4')).toBe('p-4');
    });

    it('should handle conditional classes', () => {
      expect(cn('px-2', true && 'py-2', false && 'm-2')).toBe('px-2 py-2');
    });

    it('should handle undefined and null', () => {
      expect(cn('px-2', undefined, null)).toBe('px-2');
    });
  });

  describe('formatCurrency', () => {
    it('should format number as IDR currency', () => {
      // Note: Intl.NumberFormat might use non-breaking spaces or different characters
      // depending on the environment. We can test for the presence of "Rp" and the number.
      const result = formatCurrency(10000);
      expect(result).toContain('Rp');
      expect(result).toContain('10.000');
    });

    it('should handle string input', () => {
      const result = formatCurrency('5000');
      expect(result).toContain('Rp');
      expect(result).toContain('5.000');
    });

    it('should handle zero', () => {
      const result = formatCurrency(0);
      expect(result).toContain('Rp');
      expect(result).toContain('0');
    });

    it('should handle negative numbers', () => {
      const result = formatCurrency(-1000);
      expect(result).toContain('-Rp');
      expect(result).toContain('1.000');
    });
  });

  describe('formatCompactCurrency', () => {
    it('should format thousands as RB', () => {
      expect(formatCompactCurrency(1000)).toBe('1RB');
      expect(formatCompactCurrency(1500)).toBe('1.5RB');
      expect(formatCompactCurrency(999000)).toBe('999RB');
    });

    it('should format millions as JT', () => {
      expect(formatCompactCurrency(1000000)).toBe('1JT');
      expect(formatCompactCurrency(2500000)).toBe('2.5JT');
      expect(formatCompactCurrency(999000000)).toBe('999JT');
    });

    it('should format billions as M', () => {
      expect(formatCompactCurrency(1000000000)).toBe('1M');
      expect(formatCompactCurrency(1200000000)).toBe('1.2M');
    });

    it('should return string for values under 1000', () => {
      expect(formatCompactCurrency(500)).toBe('500');
      expect(formatCompactCurrency(0)).toBe('0');
    });

    it('should handle string input', () => {
      expect(formatCompactCurrency('2000')).toBe('2RB');
    });
  });
});

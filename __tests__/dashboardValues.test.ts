import { dashboardNumber, monthlyRevenue, displayAmount, displayDate } from '../src/utils/dashboardValues';

test('zero is valid but missing and invalid values remain unavailable', () => {
  expect(dashboardNumber('0')).toBe(0);
  for (const value of [null, undefined, '', 'bad', Infinity]) expect(dashboardNumber(value)).toBeNull();
  expect(displayAmount(null)).toBe('—');
  expect(displayAmount(0)).toBe('₹0.00');
  expect(displayDate('bad')).toBe('—');
});

test('empty current month returns zero and December is excluded in January', () => {
  expect(monthlyRevenue([{ month: '2025-12', type: 'medicine', revenue: 800 }], new Date(2026, 0, 1))).toEqual({
    treatmentRevenue: 0, medicineRevenue: 0, revenueThisMonth: 0,
  });
});

test('malformed revenue is unavailable instead of silently displaying zero', () => {
  expect(() => monthlyRevenue([{ month: '2026-09', type: 'medicine', revenue: 'bad' }], new Date(2026, 8, 1))).toThrow();
});

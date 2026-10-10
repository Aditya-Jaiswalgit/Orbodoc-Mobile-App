export function dashboardNumber(value: unknown): number | null {
  if (value === null || value === undefined || value === '') return null;
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}

export interface RevenueRow {
  month: string;
  type: string;
  revenue: number | string;
}

export function monthlyRevenue(rows: RevenueRow[], now = new Date()) {
  const month = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  let treatment = 0;
  let medicine = 0;
  for (const row of rows) {
    if (String(row.month).slice(0, 7) !== month) continue;
    const value = dashboardNumber(row.revenue);
    if (value === null) throw new Error('Invalid revenue amount');
    const type = String(row.type || '').trim().toLowerCase();
    if (type === 'treatment') treatment += value;
    if (type === 'medicine') medicine += value;
  }
  return { treatmentRevenue: treatment, medicineRevenue: medicine, revenueThisMonth: treatment + medicine };
}

export function displayAmount(value: number | null) {
  return value === null ? '—' : `₹${value.toFixed(2)}`;
}

export function displayDate(value?: string | null) {
  if (!value) return '—';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? '—' : date.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
}

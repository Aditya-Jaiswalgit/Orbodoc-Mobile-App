import { buildMonthlyAppointments } from '../src/utils/monthlyAppointments';

const now = new Date(2026, 8, 28);

test('sums monthly backend counts and groups status aliases by day', () => {
  const result = buildMonthlyAppointments([
    { appointment_date: '2026-09-01', status: 'approved', count: '3' },
    { appointment_date: '2026-09-01', status: 'complete', count: '2' },
    { appointment_date: '2026-09-02', status: ' Completed ', count: 4 },
    { appointment_date: '2026-09-02', status: 'cancel', count: '1' },
    { appointment_date: '2026-09-02', status: 'cancelled', count: 2 },
    { appointment_date: '2026-09-02', status: 'canceled', count: '3' },
    { appointment_date: '2026-09-30', status: 'pending', count: '5' },
  ], now);

  expect(result).toEqual({
    appointments: 20,
    completed: 6,
    cancelled: 6,
    daily: [
      { date: '2026-09-01', approved: 3, completed: 2, cancelled: 0 },
      { date: '2026-09-02', approved: 0, completed: 4, cancelled: 6 },
      { date: '2026-09-30', approved: 0, completed: 0, cancelled: 0 },
    ],
  });
});

test('excludes other months and years, uses local calendar month, and sorts days', () => {
  const result = buildMonthlyAppointments([
    { appointment_date: '2025-01-02', status: 'complete', count: 100 },
    { appointment_date: '2025-12-31', status: 'cancel', count: 100 },
    { appointment_date: '2026-02-01', status: 'approved', count: 100 },
    { appointment_date: '2026-01-20', status: 'complete', count: 2 },
    { appointment_date: '2026-01-01T00:00:00', status: 'approved', count: '1' },
  ], new Date(2026, 0, 1, 0, 5));

  expect(result.appointments).toBe(3);
  expect(result.completed).toBe(2);
  expect(result.cancelled).toBe(0);
  expect(result.daily.map(row => row.date)).toEqual(['2026-01-01', '2026-01-20']);
});

test('empty API rows produce real zeros without sample chart data', () => {
  expect(buildMonthlyAppointments([], now)).toEqual({
    appointments: 0, completed: 0, cancelled: 0, daily: [],
  });
});

test('invalid counts do not corrupt totals', () => {
  const result = buildMonthlyAppointments([
    { appointment_date: '2026-09-01', status: 'complete', count: 'bad' },
    { appointment_date: '2026-09-01', status: 'cancel', count: -1 },
    { appointment_date: '2026-09-01', status: 'approved', count: Infinity },
    { appointment_date: '2026-09-01', status: 'complete', count: '0' },
  ], now);
  expect(result.appointments).toBe(0);
  expect(result.completed).toBe(0);
  expect(result.cancelled).toBe(0);
});

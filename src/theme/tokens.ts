/** Shared mobile tokens derived from the ORBO DOC web theme. */
export const colors = {
  background: '#F8FAFC',
  surface: '#FFFFFF',
  foreground: '#1E293B',
  text: '#0F172A',
  muted: '#64748B',
  subtle: '#94A3B8',
  primary: '#27A599',
  primaryDark: '#1D7C72',
  mint: '#E6F7F5',
  mintBorder: '#BFE7E1',
  navy: '#151E2D',
  border: '#E2E8F0',
  input: '#CBD5E1',
  secondary: '#F1F5F9',
  destructive: '#DC2626',
  destructiveDark: '#B91C1C',
  destructiveSoft: '#FEF2F2',
  success: '#2EB877',
  successDark: '#15803D',
  successSoft: '#DCFCE7',
  warning: '#F9A91F',
  warningDark: '#B45309',
  warningSoft: '#FEF3C7',
  info: '#0E7490',
  infoSoft: '#ECFEFF',
} as const;

export const spacing = {
  xxs: 2,
  tiny: 6,
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
  xxxl: 32,
} as const;

export const radii = {
  sm: 6,
  md: 8,
  lg: 12,
  xl: 16,
  pill: 999,
} as const;

export const typography = {
  family: 'Inter',
  size: { micro: 10, xs: 11, sm: 12, caption: 13, body: 14, subtitle: 16, lg: 18, title: 20, heading: 22, display: 24 },
  lineHeight: { compact: 16, body: 20, subtitle: 24, title: 28, display: 32 },
  weight: { regular: '400', medium: '500', semibold: '600', bold: '700', extrabold: '800', black: '900' },
} as const;

export const shadows = {
  card: {
    shadowColor: '#1E293B',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 3,
    elevation: 1,
  },
  elevated: {
    shadowColor: '#1E293B',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
} as const;

export const iconSizes = { sm: 16, md: 20, lg: 24 } as const;

export const statusColors = {
  success: { foreground: colors.successDark, background: colors.successSoft },
  warning: { foreground: colors.warningDark, background: colors.warningSoft },
  destructive: { foreground: colors.destructiveDark, background: colors.destructiveSoft },
  info: { foreground: colors.info, background: colors.infoSoft },
  neutral: { foreground: colors.muted, background: colors.secondary },
} as const;

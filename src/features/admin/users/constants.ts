// src/features/admin/users/constants.ts
import {
  ShieldCheck,
  Building2,
  Stethoscope,
  CalendarCheck,
  User,
  Pill,
  Calculator,
  TestTube,
} from 'lucide-react-native';

export interface RoleConfigItem {
  label: string;
  color: string;
  badgeBg: string;
  badgeText: string;
  borderColor: string;
  icon: any;
  description: string;
}

export const roleConfig: Record<string, RoleConfigItem> = {
  super_admin: {
    label: 'Super Admin',
    color: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400 border-purple-200',
    badgeBg: '#F3E8FF',
    badgeText: '#7E22CE',
    borderColor: '#E9D5FF',
    icon: ShieldCheck,
    description: 'Full system access & management',
  },
  clinic_admin: {
    label: 'Clinic Admin',
    color: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400 border-blue-200',
    badgeBg: '#DBEAFE',
    badgeText: '#1D4ED8',
    borderColor: '#BFDBFE',
    icon: Building2,
    description: 'Clinic management & setup',
  },
  doctor: {
    label: 'Doctor',
    color: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400 border-emerald-200',
    badgeBg: '#D1FAE5',
    badgeText: '#047857',
    borderColor: '#A7F3D0',
    icon: Stethoscope,
    description: 'Patient care & medical records',
  },
  receptionist: {
    label: 'Receptionist',
    color: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400 border-amber-200',
    badgeBg: '#FEF3C7',
    badgeText: '#B45309',
    borderColor: '#FDE68A',
    icon: CalendarCheck,
    description: 'Appointments & front desk',
  },
  patient: {
    label: 'Patient',
    color: 'bg-teal-100 text-teal-700 dark:bg-teal-900/30 dark:text-teal-400 border-teal-200',
    badgeBg: '#CCFBF1',
    badgeText: '#0F766E',
    borderColor: '#99F6E4',
    icon: User,
    description: 'Portal user',
  },
  pharmacist: {
    label: 'Pharmacist',
    color: 'bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-400 border-rose-200',
    badgeBg: '#FFE4E6',
    badgeText: '#BE123C',
    borderColor: '#FECDD3',
    icon: Pill,
    description: 'Pharmacy & inventory',
  },
  accountant: {
    label: 'Accountant',
    color: 'bg-cyan-100 text-cyan-700 dark:bg-cyan-900/30 dark:text-cyan-400 border-cyan-200',
    badgeBg: '#CFFAFE',
    badgeText: '#0E7490',
    borderColor: '#A5F3FC',
    icon: Calculator,
    description: 'Billing & finances',
  },
  lab_technician: {
    label: 'Lab Tech',
    color: 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400 border-indigo-200',
    badgeBg: '#E0E7FF',
    badgeText: '#4338CA',
    borderColor: '#C7D2FE',
    icon: TestTube,
    description: 'Lab test management',
  },
};

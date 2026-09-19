import React from 'react';
import {
  LayoutDashboard,
  Calendar,
  Users,
  CreditCard,
  Pill,
  Video,
  FlaskConical,
  Bell,
  Menu,
  X,
  LogOut,
  ChevronRight,
  ChevronLeft,
  Search,
  Plus,
  Trash2,
  Edit,
  CheckCircle,
  AlertCircle,
  Clock,
  Phone,
  Mail,
  MapPin,
  FileText,
  UserCheck,
  Stethoscope,
  Activity,
  Shield,
  Filter,
  ChevronDown,
  ChevronUp,
  UserCog,
  UserPlus,
  CalendarCheck,
  CalendarX,
  IndianRupee,
  WalletCards,
  ArrowUpRight,
  ShieldCheck,
  Check,
  TestTube,
} from 'lucide-react-native';

export interface IconProps {
  color?: string;
  size?: number;
  strokeWidth?: number;
}

// 1. Dashboard Grid Icon
export const DashboardIcon: React.FC<IconProps> = ({ color = '#0d9488', size = 20, strokeWidth = 2 }) => (
  <LayoutDashboard color={color} size={size} strokeWidth={strokeWidth} />
);

// 2. Calendar / Book Appointment Icon
export const CalendarIcon: React.FC<IconProps> = ({ color = '#0d9488', size = 20, strokeWidth = 2 }) => (
  <Calendar color={color} size={size} strokeWidth={strokeWidth} />
);

// 3. Patients / User Profile Icon
export const PatientUserIcon: React.FC<IconProps> = ({ color = '#0d9488', size = 20, strokeWidth = 2 }) => (
  <Users color={color} size={size} strokeWidth={strokeWidth} />
);

// 4. Billing / Card Icon
export const BillingCardIcon: React.FC<IconProps> = ({ color = '#0d9488', size = 20, strokeWidth = 2 }) => (
  <CreditCard color={color} size={size} strokeWidth={strokeWidth} />
);

// 5. Medicine / Pharmacy Pill Icon
export const MedicinePillIcon: React.FC<IconProps> = ({ color = '#0d9488', size = 20, strokeWidth = 2 }) => (
  <Pill color={color} size={size} strokeWidth={strokeWidth} />
);

// 6. Video Services Icon
export const VideoCamIcon: React.FC<IconProps> = ({ color = '#0d9488', size = 20, strokeWidth = 2 }) => (
  <Video color={color} size={size} strokeWidth={strokeWidth} />
);

// 7. Lab Tests Icon
export const LabTubeIcon: React.FC<IconProps> = ({ color = '#0d9488', size = 20, strokeWidth = 2 }) => (
  <FlaskConical color={color} size={size} strokeWidth={strokeWidth} />
);

// 8. Notifications Bell Icon
export const BellNotificationIcon: React.FC<IconProps> = ({ color = '#0d9488', size = 20, strokeWidth = 2 }) => (
  <Bell color={color} size={size} strokeWidth={strokeWidth} />
);

// Re-export Lucide Icons for app-wide convenience
export {
  LayoutDashboard,
  Calendar,
  Users,
  CreditCard,
  Pill,
  Video,
  FlaskConical,
  Bell,
  Menu,
  X,
  LogOut,
  ChevronRight,
  ChevronLeft,
  Search,
  Plus,
  Trash2,
  Edit,
  CheckCircle,
  AlertCircle,
  Clock,
  Phone,
  Mail,
  MapPin,
  FileText,
  UserCheck,
  Stethoscope,
  Activity,
  Shield,
  Filter,
  ChevronDown,
  ChevronUp,
  UserCog,
  UserPlus,
  CalendarCheck,
  CalendarX,
  IndianRupee,
  WalletCards,
  ArrowUpRight,
  ShieldCheck,
  Check,
  TestTube,
};

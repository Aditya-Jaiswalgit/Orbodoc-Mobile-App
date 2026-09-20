// src/lib/permissions.ts

export type UserRole = 
  | 'super_admin'
  | 'clinic_admin'
  | 'doctor'
  | 'receptionist'
  | 'patient'
  | 'pharmacist'
  | 'accountant'
  | 'lab_technician';

export type Module = 
  | 'dashboard'
  | 'users'
  | 'doctors'
  | 'patients'
  | 'appointments'
  | 'emr'
  | 'prescriptions'
  | 'medicines'
  | 'inventory'
  | 'lab_tests'
  | 'billing'
  | 'payments'
  | 'reports'
  | 'settings';

export type Permission = 'view' | 'create' | 'update' | 'delete';

export interface ModulePermissions {
  view: boolean;
  create: boolean;
  update: boolean;
  delete: boolean;
}

export type RolePermissions = Record<Module, ModulePermissions>;

// Default permissions matrix per role
export const rolePermissions: Record<UserRole, RolePermissions> = {
  super_admin: {
    dashboard: { view: true, create: true, update: true, delete: true },
    users: { view: true, create: true, update: true, delete: true },
    doctors: { view: true, create: true, update: true, delete: true },
    patients: { view: true, create: true, update: true, delete: true },
    appointments: { view: true, create: true, update: true, delete: true },
    emr: { view: true, create: true, update: true, delete: true },
    prescriptions: { view: true, create: true, update: true, delete: true },
    medicines: { view: true, create: true, update: true, delete: true },
    inventory: { view: true, create: true, update: true, delete: true },
    lab_tests: { view: true, create: true, update: true, delete: true },
    billing: { view: true, create: true, update: true, delete: true },
    payments: { view: true, create: true, update: true, delete: true },
    reports: { view: true, create: true, update: true, delete: true },
    settings: { view: true, create: true, update: true, delete: true },
  },
  clinic_admin: {
    dashboard: { view: true, create: false, update: false, delete: false },
    users: { view: true, create: true, update: true, delete: true },
    doctors: { view: true, create: true, update: true, delete: true },
    patients: { view: true, create: true, update: true, delete: true },
    appointments: { view: true, create: true, update: true, delete: true },
    emr: { view: true, create: false, update: false, delete: false },
    prescriptions: { view: true, create: false, update: false, delete: false },
    medicines: { view: true, create: true, update: true, delete: true },
    inventory: { view: true, create: true, update: true, delete: true },
    lab_tests: { view: true, create: true, update: true, delete: true },
    billing: { view: true, create: true, update: true, delete: true },
    payments: { view: true, create: true, update: true, delete: true },
    reports: { view: true, create: true, update: false, delete: false },
    settings: { view: true, create: true, update: true, delete: false },
  },
  doctor: {
    dashboard: { view: true, create: false, update: false, delete: false },
    users: { view: false, create: false, update: false, delete: false },
    doctors: { view: true, create: false, update: false, delete: false },
    patients: { view: true, create: false, update: true, delete: false },
    appointments: { view: true, create: false, update: true, delete: false },
    emr: { view: true, create: true, update: true, delete: false },
    prescriptions: { view: true, create: true, update: true, delete: false },
    medicines: { view: true, create: false, update: false, delete: false },
    inventory: { view: false, create: false, update: false, delete: false },
    lab_tests: { view: true, create: true, update: false, delete: false },
    billing: { view: false, create: false, update: false, delete: false },
    payments: { view: false, create: false, update: false, delete: false },
    reports: { view: true, create: false, update: false, delete: false },
    settings: { view: true, create: false, update: true, delete: false },
  },
  receptionist: {
    dashboard: { view: true, create: false, update: false, delete: false },
    users: { view: false, create: false, update: false, delete: false },
    doctors: { view: true, create: false, update: false, delete: false },
    patients: { view: true, create: true, update: true, delete: false },
    appointments: { view: true, create: true, update: true, delete: true },
    emr: { view: false, create: false, update: false, delete: false },
    prescriptions: { view: false, create: false, update: false, delete: false },
    medicines: { view: false, create: false, update: false, delete: false },
    inventory: { view: false, create: false, update: false, delete: false },
    lab_tests: { view: false, create: false, update: false, delete: false },
    billing: { view: true, create: true, update: true, delete: false },
    payments: { view: true, create: true, update: true, delete: false },
    reports: { view: false, create: false, update: false, delete: false },
    settings: { view: false, create: false, update: false, delete: false },
  },
  patient: {
    dashboard: { view: true, create: false, update: false, delete: false },
    users: { view: false, create: false, update: false, delete: false },
    doctors: { view: true, create: false, update: false, delete: false },
    patients: { view: false, create: false, update: false, delete: false },
    appointments: { view: true, create: true, update: true, delete: false },
    emr: { view: true, create: false, update: false, delete: false },
    prescriptions: { view: true, create: false, update: false, delete: false },
    medicines: { view: false, create: false, update: false, delete: false },
    inventory: { view: false, create: false, update: false, delete: false },
    lab_tests: { view: true, create: false, update: false, delete: false },
    billing: { view: true, create: false, update: false, delete: false },
    payments: { view: true, create: true, update: false, delete: false },
    reports: { view: false, create: false, update: false, delete: false },
    settings: { view: true, create: false, update: true, delete: false },
  },
  pharmacist: {
    dashboard: { view: true, create: false, update: false, delete: false },
    users: { view: false, create: false, update: false, delete: false },
    doctors: { view: false, create: false, update: false, delete: false },
    patients: { view: true, create: false, update: false, delete: false },
    appointments: { view: false, create: false, update: false, delete: false },
    emr: { view: false, create: false, update: false, delete: false },
    prescriptions: { view: true, create: false, update: true, delete: false },
    medicines: { view: true, create: true, update: true, delete: true },
    inventory: { view: true, create: true, update: true, delete: true },
    lab_tests: { view: false, create: false, update: false, delete: false },
    billing: { view: true, create: true, update: false, delete: false },
    payments: { view: true, create: true, update: false, delete: false },
    reports: { view: true, create: false, update: false, delete: false },
    settings: { view: false, create: false, update: false, delete: false },
  },
  accountant: {
    dashboard: { view: true, create: false, update: false, delete: false },
    users: { view: false, create: false, update: false, delete: false },
    doctors: { view: false, create: false, update: false, delete: false },
    patients: { view: true, create: false, update: false, delete: false },
    appointments: { view: false, create: false, update: false, delete: false },
    emr: { view: false, create: false, update: false, delete: false },
    prescriptions: { view: false, create: false, update: false, delete: false },
    medicines: { view: false, create: false, update: false, delete: false },
    inventory: { view: true, create: false, update: false, delete: false },
    lab_tests: { view: false, create: false, update: false, delete: false },
    billing: { view: true, create: true, update: true, delete: true },
    payments: { view: true, create: true, update: true, delete: true },
    reports: { view: true, create: true, update: false, delete: false },
    settings: { view: false, create: false, update: false, delete: false },
  },
  lab_technician: {
    dashboard: { view: true, create: false, update: false, delete: false },
    users: { view: false, create: false, update: false, delete: false },
    doctors: { view: false, create: false, update: false, delete: false },
    patients: { view: true, create: false, update: false, delete: false },
    appointments: { view: false, create: false, update: false, delete: false },
    emr: { view: false, create: false, update: false, delete: false },
    prescriptions: { view: false, create: false, update: false, delete: false },
    medicines: { view: false, create: false, update: false, delete: false },
    inventory: { view: true, create: false, update: false, delete: false },
    lab_tests: { view: true, create: true, update: true, delete: true },
    billing: { view: false, create: false, update: false, delete: false },
    payments: { view: false, create: false, update: false, delete: false },
    reports: { view: true, create: true, update: false, delete: false },
    settings: { view: false, create: false, update: false, delete: false },
  },
};

// Check if a role has specific permission on a module
export function hasPermission(
  role: UserRole,
  module: Module,
  permission: Permission = 'view',
  customPermissions?: RolePermissions
): boolean {
  const activeMatrix = customPermissions || rolePermissions[role];
  if (!activeMatrix || !activeMatrix[module]) return false;
  return activeMatrix[module][permission] ?? false;
}

// Check if a role has AT LEAST ONE permission enabled for a module (used for menu visibility)
export function hasAnyPermission(
  role: UserRole,
  module: Module,
  customPermissions?: RolePermissions
): boolean {
  const activeMatrix = customPermissions || rolePermissions[role];
  if (!activeMatrix || !activeMatrix[module]) return false;
  const mod = activeMatrix[module];
  return !!(mod.view || mod.create || mod.update || mod.delete);
}

// Alias for checking if module menu item should be visible
export function canAccessModule(
  role: UserRole,
  module: Module,
  customPermissions?: RolePermissions
): boolean {
  return hasAnyPermission(role, module, customPermissions);
}

import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  clearStoredSession,
  getStoredSession,
  setStoredSession,
  updateStoredSession,
  StoredSession,
} from '../src/utils/authStorage';

describe('Auth Session Persistence', () => {
  beforeEach(async () => {
    jest.clearAllMocks();
    await AsyncStorage.clear();
  });

  const mockSession: StoredSession = {
    token: 'jwt-token-123',
    user: {
      id: 5,
      email: 'doctor@orbo.clinic',
      fullName: 'Dr. John Doe',
      role: 'doctor',
      roleId: 3,
    },
    userType: 'staff',
    activeClinicId: 10,
    assignedClinics: [
      { id: 10, name: 'Downtown Clinic', is_primary: 1 },
      { id: 12, name: 'Uptown Clinic', is_primary: 0 },
    ],
    plan: {
      plan_name: 'Pro Multi',
      plan_type: 'multi',
      billing_cycle: 'monthly',
    },
    permissionsKey: 'jwt-token-123:5:10:3',
    permissionsMap: {
      patients: { view: true, add: true, edit: true, delete: false, execute: false },
    },
  };

  test('returns null when no session is stored', async () => {
    const session = await getStoredSession();
    expect(session).toBeNull();
  });

  test('persists and retrieves full session correctly', async () => {
    await setStoredSession(mockSession);
    const restored = await getStoredSession();

    expect(restored).not.toBeNull();
    expect(restored?.token).toBe('jwt-token-123');
    expect(restored?.user.email).toBe('doctor@orbo.clinic');
    expect(restored?.activeClinicId).toBe(10);
    expect(restored?.assignedClinics).toHaveLength(2);
    expect(restored?.plan?.plan_name).toBe('Pro Multi');
  });

  test('updates partial session data (e.g. clinic switch)', async () => {
    await setStoredSession(mockSession);
    await updateStoredSession({
      activeClinicId: 12,
      user: { ...mockSession.user, fullName: 'Dr. Johnathan Doe' },
    });

    const updated = await getStoredSession();
    expect(updated?.activeClinicId).toBe(12);
    expect(updated?.user.fullName).toBe('Dr. Johnathan Doe');
    expect(updated?.token).toBe('jwt-token-123');
  });

  test('clears session on logout', async () => {
    await setStoredSession(mockSession);
    await clearStoredSession();

    const empty = await getStoredSession();
    expect(empty).toBeNull();
  });
});

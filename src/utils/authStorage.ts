// src/utils/authStorage.ts
import AsyncStorage from '@react-native-async-storage/async-storage';
import { AuthUser, UserClinic, UserRoleType } from '../types/auth';
import { PermissionMap } from './rolePermissions';

export interface StoredSession {
  token: string;
  user: AuthUser;
  userType: UserRoleType;
  activeClinicId: number | null;
  assignedClinics: UserClinic[];
  plan: any | null;
  permissionsKey?: string;
  permissionsMap?: PermissionMap;
}

const AUTH_STORAGE_KEY = '@orbo_auth_session';

/**
 * Loads the saved authentication session from device storage.
 */
export async function getStoredSession(): Promise<StoredSession | null> {
  try {
    const raw = await AsyncStorage.getItem(AUTH_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (parsed && typeof parsed.token === 'string' && parsed.token.trim() && parsed.user) {
      return parsed;
    }
    return null;
  } catch (error) {
    console.error('Error reading auth session from storage:', error);
    return null;
  }
}

/**
 * Persists full authentication session into device storage.
 */
export async function setStoredSession(session: StoredSession): Promise<void> {
  try {
    await AsyncStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(session));
  } catch (error) {
    console.error('Error saving auth session to storage:', error);
  }
}

/**
 * Merges partial updates (e.g. updated user profile or active clinic) into stored session.
 */
export async function updateStoredSession(partial: Partial<StoredSession>): Promise<void> {
  try {
    const current = await getStoredSession();
    if (!current) return;
    const updated: StoredSession = {
      ...current,
      ...partial,
      user: partial.user ? { ...current.user, ...partial.user } : current.user,
    };
    await AsyncStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(updated));
  } catch (error) {
    console.error('Error updating auth session in storage:', error);
  }
}

/**
 * Removes auth session from device storage on logout or token expiration.
 */
export async function clearStoredSession(): Promise<void> {
  try {
    await AsyncStorage.removeItem(AUTH_STORAGE_KEY);
  } catch (error) {
    console.error('Error clearing auth session from storage:', error);
  }
}

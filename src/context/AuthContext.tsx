import React, { createContext, useContext, useState } from 'react';
import { AuthResponseData, AuthUser, UserRoleType } from '../types/auth';

interface AuthContextType {
  user: AuthUser | null;
  token: string | null;
  userType: UserRoleType | null;
  isAuthenticated: boolean;
  saveAuthSession: (data: AuthResponseData, userType: UserRoleType) => void;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [userType, setUserType] = useState<UserRoleType | null>(null);

  const saveAuthSession = (authData: AuthResponseData, type: UserRoleType) => {
    const sessionToken = authData.accessToken || authData.token || null;
    setToken(sessionToken);
    setUser(authData.user);
    setUserType(type);
  };

  const logout = () => {
    setUser(null);
    setToken(null);
    setUserType(null);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        userType,
        isAuthenticated: !!token && !!user,
        saveAuthSession,
        logout,
      }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuthContext = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuthContext must be used within an AuthProvider');
  }
  return context;
};

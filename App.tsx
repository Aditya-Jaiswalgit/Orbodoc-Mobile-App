import React from 'react';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { AuthProvider, useAuthContext } from './src/context/AuthContext';
import { PatientMainContainer } from './src/navigation/PatientMainContainer';
import { StaffMainContainer } from './src/navigation/StaffMainContainer';
import { LoginScreen } from './src/screens/auth/LoginScreen';

function AppNavigator() {
  const { isAuthenticated, userType } = useAuthContext();

  if (isAuthenticated) {
    if (userType === 'patient') {
      return <PatientMainContainer />;
    }
    return <StaffMainContainer />;
  }

  return <LoginScreen />;
}

function App() {
  return (
    <SafeAreaProvider>
      <AuthProvider>
        <StatusBar style="auto" />
        <AppNavigator />
      </AuthProvider>
    </SafeAreaProvider>
  );
}

export default App;

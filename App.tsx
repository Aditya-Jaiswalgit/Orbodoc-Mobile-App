import React from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import Toast from 'react-native-toast-message';
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
        <AppNavigator />
        <Toast />
      </AuthProvider>
    </SafeAreaProvider>
  );
}

export default App;

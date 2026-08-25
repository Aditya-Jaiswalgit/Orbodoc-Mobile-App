import React from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { AuthProvider, useAuthContext } from './src/context/AuthContext';
import { PatientMainContainer } from './src/navigation/PatientMainContainer';
import { LoginScreen } from './src/screens/auth/LoginScreen';

function AppNavigator() {
  const { isAuthenticated, userType } = useAuthContext();

  if (isAuthenticated && userType === 'patient') {
    return <PatientMainContainer />;
  }

  return <LoginScreen />;
}

function App() {
  return (
    <SafeAreaProvider>
      <AuthProvider>
        <AppNavigator />
      </AuthProvider>
    </SafeAreaProvider>
  );
}

export default App;

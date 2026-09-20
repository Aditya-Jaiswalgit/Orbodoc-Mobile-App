import React from 'react';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import Toast from 'react-native-toast-message';
import { AuthProvider, useAuthContext } from './src/context/AuthContext';
import { PatientMainContainer } from './src/navigation/PatientMainContainer';
import { StaffMainContainer } from './src/navigation/StaffMainContainer';
import { LoginScreen } from './src/screens/auth/LoginScreen';

function AppNavigator() {
  const { isAuthenticated, userType, isLoading } = useAuthContext();

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#0d9488" />
      </View>
    );
  }

  if (isAuthenticated) {
    if (userType === 'patient') {
      return (
        <View style={styles.flexOne}>
          <PatientMainContainer />
        </View>
      );
    }
    return (
      <View style={styles.flexOne}>
        <StaffMainContainer />
      </View>
    );
  }

  return (
    <View style={styles.flexOne}>
      <LoginScreen />
    </View>
  );
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

const styles = StyleSheet.create({
  flexOne: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f8fafc',
  },
});

export default App;

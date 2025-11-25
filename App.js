import React, { useState, useEffect } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { Provider as PaperProvider } from 'react-native-paper';
import { onAuthStateChanged } from 'firebase/auth';
import { View, StyleSheet } from 'react-native';
import { auth } from './firebase/firebaseConfig';
import Auth from './screens/Auth';
import MainAppStack from './navigation/MainAppStack';
import { SettingsProvider, useSettings } from './contexts/SettingsContext';

const Stack = createStackNavigator();

function AppContent() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const { getThemeColors } = useSettings();
  const theme = getThemeColors();

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setUser(user);
      setLoading(false);
    });

    return unsubscribe;
  }, []);

  if (loading) {
    return <View style={[styles.loadingContainer, { backgroundColor: theme.backgroundColor }]} />;
  }

  return (
    <NavigationContainer>
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        {user ? (
          <Stack.Screen name="MainApp" component={MainAppStack} />
        ) : (
          <Stack.Screen name="Auth" component={Auth} />
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
}

export default function App() {
  return (
    <SettingsProvider>
      <PaperProvider>
        <AppContent />
      </PaperProvider>
    </SettingsProvider>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
  },
});

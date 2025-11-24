import React, { createContext, useContext, useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getUserSettings, updateUserSettings } from '../firebase/firestoreService';
import { auth } from '../firebase/firebaseConfig';

const SettingsContext = createContext();

export const useSettings = () => {
  const context = useContext(SettingsContext);
  if (!context) {
    throw new Error('useSettings must be used within a SettingsProvider');
  }
  return context;
};

export const SettingsProvider = ({ children }) => {
  const [settings, setSettings] = useState({
    currency: 'INR',
    theme: 'light',
    notifications: true,
  });
  const [authTheme, setAuthTheme] = useState('light'); // Separate theme for auth screens
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      // First, try to load from AsyncStorage for immediate availability
      const storedSettings = await AsyncStorage.getItem('userSettings');
      if (storedSettings) {
        setSettings(JSON.parse(storedSettings));
      }

      // Then fetch from Firebase if user is authenticated
      if (auth.currentUser) {
        const userSettings = await getUserSettings();
        if (userSettings) {
          setSettings(userSettings);
          // Save to AsyncStorage for offline access
          await AsyncStorage.setItem('userSettings', JSON.stringify(userSettings));
        }
      }
    } catch (error) {
      console.error('Error loading settings:', error);
    } finally {
      setLoading(false);
    }
  };

  const updateSettings = async (newSettings) => {
    try {
      await updateUserSettings(newSettings);
      const updatedSettings = { ...settings, ...newSettings };
      setSettings(updatedSettings);
      // Save to AsyncStorage for persistence
      await AsyncStorage.setItem('userSettings', JSON.stringify(updatedSettings));
    } catch (error) {
      console.error('Error updating settings:', error);
      throw error;
    }
  };

  const getCurrencySymbol = () => {
    switch (settings.currency) {
      case 'USD': return '$';
      case 'EUR': return '€';
      case 'INR': default: return '₹';
    }
  };

  const convertAmount = (amount, fromCurrency = 'INR') => {
    // Simple conversion rates (approximate)
    const rates = {
      INR: 1,
      USD: 0.012, // 1 INR = 0.012 USD
      EUR: 0.011, // 1 INR = 0.011 EUR
    };
    const baseAmount = amount / rates[fromCurrency];
    return baseAmount * rates[settings.currency];
  };

  const formatCurrency = (amount, currency = settings.currency) => {
    const num = Number(amount);
    if (isNaN(num) || !isFinite(num)) {
      return getCurrencySymbol(currency) + '0';
    }
    // Custom formatting to avoid toLocaleString issues and floating-point precision problems
    const absNum = Math.abs(num);
    const parts = absNum.toFixed(2).split('.');
    parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ',');
    return `${getCurrencySymbol(currency)}${parts.join('.')}`;
  };

  const getThemeColors = (forceLight = false) => {
    const themeToUse = forceLight ? 'light' : settings.theme;
    return themeToUse === 'dark' ? {
      backgroundColor: '#121212',
      cardBackgroundColor: '#1e1e1e',
      textColor: '#ffffff',
      secondaryTextColor: '#cccccc',
      accentColor: '#4CAF50',
      borderColor: '#333333',
    } : {
      backgroundColor: '#f5f5f5',
      cardBackgroundColor: '#ffffff',
      textColor: '#333333',
      secondaryTextColor: '#666666',
      accentColor: '#4CAF50',
      borderColor: '#e0e0e0',
    };
  };

  return (
    <SettingsContext.Provider value={{
      settings,
      loading,
      updateSettings,
      getCurrencySymbol,
      convertAmount,
      formatCurrency,
      getThemeColors,
    }}>
      {children}
    </SettingsContext.Provider>
  );
};

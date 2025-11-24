import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useSettings } from '../contexts/SettingsContext';

export default function Header({ title }) {
  const { getThemeColors } = useSettings();
  const theme = getThemeColors();

  return (
    <View style={[styles.header, { backgroundColor: theme.accentColor }]}>
      <Text style={[styles.headerText, { color: theme.textColor }]}>{title}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    padding: 20,
    alignItems: 'center',
  },
  headerText: {
    fontSize: 24,
    fontWeight: 'bold',
  },
});

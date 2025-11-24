import React from 'react';
import { TouchableOpacity, Text, StyleSheet } from 'react-native';
import { useSettings } from '../contexts/SettingsContext';

export default function CustomButton({ title, onPress, color }) {
  const { getThemeColors } = useSettings();
  const theme = getThemeColors();

  const buttonColor = color || theme.accentColor;

  return (
    <TouchableOpacity style={[styles.button, { backgroundColor: buttonColor }]} onPress={onPress}>
      <Text style={[styles.buttonText, { color: theme.textColor }]}>{title}</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  button: {
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 10,
  },
  buttonText: {
    fontSize: 16,
    fontWeight: 'bold',
  },
});

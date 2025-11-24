import React from 'react';
import { TextInput, StyleSheet, View, TouchableOpacity, Text } from 'react-native';
import { useSettings } from '../contexts/SettingsContext';

export default function InputField({ placeholder, value, onChangeText, keyboardType = 'default', editable = true, secureTextEntry = false, showPasswordToggle = false, onTogglePassword, forceLight = false }) {
  const { getThemeColors } = useSettings();
  const theme = getThemeColors(forceLight);

  return (
    <View style={styles.container}>
      <TextInput
        style={[
          styles.input,
          {
            borderColor: theme.borderColor,
            backgroundColor: theme.cardBackgroundColor,
            color: theme.textColor,
          },
          !editable && [styles.disabled, { backgroundColor: theme.backgroundColor, color: theme.secondaryTextColor }]
        ]}
        placeholder={placeholder}
        placeholderTextColor={theme.secondaryTextColor}
        value={value}
        onChangeText={onChangeText}
        keyboardType={keyboardType}
        editable={editable}
        secureTextEntry={secureTextEntry}
      />
      {showPasswordToggle && (
        <TouchableOpacity onPress={onTogglePassword} style={styles.eyeIcon}>
          <Text style={{ color: theme.accentColor, fontSize: 18 }}>
            {secureTextEntry ? '👁️' : '🙈'}
          </Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'relative',
  },
  input: {
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    marginBottom: 10,
    paddingRight: 50, // Space for the eye icon
  },
  disabled: {
    // Additional disabled styles if needed
  },
  eyeIcon: {
    position: 'absolute',
    right: 12,
    top: 12,
    padding: 4,
  },
});

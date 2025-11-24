import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Alert,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import { signInWithEmailAndPassword, createUserWithEmailAndPassword, sendPasswordResetEmail } from 'firebase/auth';
import { auth } from '../firebase/firebaseConfig';
import CustomButton from '../components/CustomButton';
import InputField from '../components/InputField';
import { useSettings } from '../contexts/SettingsContext';

export default function Auth({ navigation }) {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const { getThemeColors } = useSettings();
  const theme = getThemeColors(true); // Force light theme for auth screens

  const handleAuth = async () => {
    if (!email || !password) {
      Alert.alert('Error', 'Please fill in all fields');
      return;
    }

    if (!isLogin && password !== confirmPassword) {
      Alert.alert('Error', 'Passwords do not match');
      return;
    }

    setLoading(true);
    try {
      if (isLogin) {
        await signInWithEmailAndPassword(auth, email, password);
        // Navigation will happen automatically due to auth state change in App.js
      } else {
        await createUserWithEmailAndPassword(auth, email, password);
        Alert.alert('Success', 'Account created successfully!');
        // Navigation will happen automatically due to auth state change in App.js
      }
    } catch (error) {
      let errorMessage = 'An error occurred';
      switch (error.code) {
        case 'auth/invalid-email':
          errorMessage = 'Invalid email address';
          break;
        case 'auth/user-disabled':
          errorMessage = 'This account has been disabled';
          break;
        case 'auth/user-not-found':
          errorMessage = 'No account found with this email';
          break;
        case 'auth/wrong-password':
          errorMessage = 'Incorrect password';
          break;
        case 'auth/email-already-in-use':
          errorMessage = 'An account with this email already exists';
          break;
        case 'auth/weak-password':
          errorMessage = 'Password should be at least 6 characters';
          break;
        default:
          errorMessage = error.message;
      }
      Alert.alert('Error', errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPassword = async () => {
    if (!email) {
      Alert.alert('Error', 'Please enter your email address');
      return;
    }

    try {
      await sendPasswordResetEmail(auth, email);
      Alert.alert('Success', 'Password reset email sent! Check your inbox (and spam folder).');
    } catch (error) {
      console.error('Password reset error:', error);
      let errorMessage = 'Failed to send password reset email';
      switch (error.code) {
        case 'auth/invalid-email':
          errorMessage = 'Invalid email address';
          break;
        case 'auth/user-not-found':
          errorMessage = 'No account found with this email';
          break;
        case 'auth/too-many-requests':
          errorMessage = 'Too many requests. Try again later.';
          break;
        default:
          errorMessage = error.message;
      }
      Alert.alert('Error', errorMessage);
    }
  };

  return (
    <KeyboardAvoidingView
      style={[styles.container, { backgroundColor: theme.backgroundColor }]}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView contentContainerStyle={styles.scrollContainer}>
        <View style={styles.content}>
          <Text style={[styles.title, { color: theme.accentColor }]}>CashTrack - The Money Manager</Text>
          <Text style={[styles.subtitle, { color: theme.secondaryTextColor }]}>
            {isLogin ? 'Welcome back!' : 'Create your account'}
          </Text>

          <View style={styles.form}>
            <InputField
              placeholder="Email"
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
              forceLight
            />

            <InputField
              placeholder="Password"
              value={password}
              onChangeText={setPassword}
              secureTextEntry={!showPassword}
              showPasswordToggle
              onTogglePassword={() => setShowPassword(!showPassword)}
              forceLight
            />

            {!isLogin && (
              <InputField
                placeholder="Confirm Password"
                value={confirmPassword}
                onChangeText={setConfirmPassword}
                secureTextEntry={!showConfirmPassword}
                showPasswordToggle
                onTogglePassword={() => setShowConfirmPassword(!showConfirmPassword)}
                forceLight
              />
            )}

            <CustomButton
              title={loading ? 'Please wait...' : (isLogin ? 'Login' : 'Sign Up')}
              onPress={handleAuth}
            />

            {isLogin && (
              <TouchableOpacity onPress={handleForgotPassword} style={styles.forgotPassword}>
                <Text style={[styles.forgotPasswordText, { color: theme.accentColor }]}>Forgot Password?</Text>
              </TouchableOpacity>
            )}

            <TouchableOpacity
              onPress={() => setIsLogin(!isLogin)}
              style={styles.switchMode}
            >
              <Text style={[styles.switchModeText, { color: theme.secondaryTextColor }]}>
                {isLogin ? "Don't have an account? Sign Up" : 'Already have an account? Login'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContainer: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: 20,
  },
  content: {
    alignItems: 'center',
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    marginBottom: 8,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 18,
    marginBottom: 40,
    textAlign: 'center',
  },
  form: {
    width: '100%',
    maxWidth: 400,
  },
  forgotPassword: {
    alignSelf: 'center',
    marginTop: 15,
  },
  forgotPasswordText: {
    fontSize: 16,
    fontWeight: '500',
  },
  switchMode: {
    alignSelf: 'center',
    marginTop: 20,
  },
  switchModeText: {
    fontSize: 16,
  },
});

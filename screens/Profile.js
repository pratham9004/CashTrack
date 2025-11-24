import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert, ActivityIndicator, Switch, Share, Platform } from 'react-native';
import { Picker } from '@react-native-picker/picker';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import * as Print from 'expo-print';
import { useNavigation } from '@react-navigation/native';
import { CommonActions } from '@react-navigation/native';
import { signOut } from 'firebase/auth';
import CustomButton from '../components/CustomButton';
import InputField from '../components/InputField';
import { auth } from '../firebase/firebaseConfig';
import { getUserProfile, updateUserProfile, getIncome, getExpenses, getSavings, getSavingsGoals, getUserSettings, resetAppData } from '../firebase/firestoreService';
import { backupData, restoreData, backupDataToCloud, getCloudBackups, restoreFromCloud } from '../utils/backupRestore';
import { useSettings } from '../contexts/SettingsContext';

export default function Profile() {
  const { getThemeColors } = useSettings();
  const theme = getThemeColors();
  const styles = getStyles(theme);
  const navigation = useNavigation();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [isEditing, setIsEditing] = useState(false);
  const [loading, setLoading] = useState(true);
  const { settings, updateSettings } = useSettings();

  useEffect(() => {
    fetchProfile();
  }, []);

  const fetchProfile = async () => {
    try {
      setLoading(true);
      const profile = await getUserProfile();
      if (profile) {
        setName(profile.name || '');
        setPhone(profile.phone || '');
      }
      // Email from auth
      const user = auth.currentUser;
      if (user) {
        setEmail(user.email || '');
      }
    } catch (error) {
      console.error('Error fetching profile:', error);
      Alert.alert('Error', 'Failed to load profile data');
    } finally {
      setLoading(false);
    }
  };

  const saveProfile = async () => {
    try {
      const profileData = {
        name: name.trim(),
        phone: phone.trim(),
      };
      await updateUserProfile(profileData);
      setIsEditing(false);
      Alert.alert('Success', 'Profile updated successfully');
    } catch (error) {
      console.error('Error saving profile:', error);
      Alert.alert('Error', 'Failed to save profile');
    }
  };

  const handleResetData = async () => {
    Alert.alert(
      'Reset App Data',
      'Are you sure you want to reset all app data? This will delete all income, expenses, savings, and savings goals. Your profile and settings will be preserved.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Reset',
          style: 'destructive',
          onPress: async () => {
            try {
              Alert.alert('Resetting Data', 'Please wait while we reset your data...');
              await resetAppData();
              Alert.alert('Success', 'App data has been reset successfully!');
            } catch (error) {
              console.error('Error resetting data:', error);
              Alert.alert('Error', 'Failed to reset app data. Please try again.');
            }
          },
        },
      ]
    );
  };

  const handleBackupData = async () => {
    await backupDataToCloud();
  };

  const handleRestoreData = async () => {
    try {
      // Get available cloud backups
      const backups = await getCloudBackups();

      if (backups.length === 0) {
        Alert.alert('No Backups Found', 'You don\'t have any cloud backups. Please create a backup first.');
        return;
      }

      // Show backup selection
      const backupOptions = backups.map((backup, index) => ({
        text: new Date(backup.backupDate).toLocaleDateString() + ' ' + new Date(backup.backupDate).toLocaleTimeString(),
        onPress: () => confirmRestore(backup.id)
      }));

      Alert.alert(
        'Select Backup to Restore',
        'Choose a backup to restore from:',
        [
          { text: 'Cancel', style: 'cancel' },
          ...backupOptions
        ]
      );
    } catch (error) {
      console.error('Error getting backups:', error);
      Alert.alert('Error', 'Failed to load backup list. Please try again.');
    }
  };

  const confirmRestore = (backupId) => {
    Alert.alert(
      'Restore Data',
      'Are you sure you want to restore data? This will replace your current data with the selected backup.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Restore',
          style: 'destructive',
          onPress: async () => {
            try {
              await restoreFromCloud(backupId);
            } catch (error) {
              console.error('Error restoring from cloud:', error);
              Alert.alert('Error', 'Failed to restore data from cloud. Please try again.');
            }
          },
        },
      ]
    );
  };

  const handleLogout = async () => {
    Alert.alert(
      'Logout',
      'Are you sure you want to logout?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Logout',
          style: 'destructive',
          onPress: async () => {
            try {
              await signOut(auth);
              // Navigation will happen automatically due to auth state change in App.js
            } catch (error) {
              console.error('Error logging out:', error);
              Alert.alert('Error', 'Failed to logout. Please try again.');
            }
          },
        },
      ]
    );
  };

  const exportData = async () => {
    try {
      Alert.alert('Exporting Data', 'Please wait while we prepare your data...');

      // Fetch all user data
      const [income, expenses, savings, savingsGoals, profile, userSettings] = await Promise.all([
        getIncome(),
        getExpenses(),
        getSavings(),
        getSavingsGoals(),
        getUserProfile(),
        getUserSettings(),
      ]);

      // Prepare data for export
      const exportData = {
        profile: {
          name: profile?.name || '',
          email: auth.currentUser?.email || '',
          phone: profile?.phone || '',
          savingsGoal: profile?.savingsGoal || 0,
        },
        settings: userSettings,
        income: income.map(item => ({
          id: item.id,
          category: item.category,
          amount: item.amount,
          timestamp: item.timestamp ? (typeof item.timestamp === 'object' && item.timestamp.toDate ? item.timestamp.toDate().toISOString() : new Date(item.timestamp).toISOString()) : null,
        })),
        expenses: expenses.map(item => ({
          id: item.id,
          category: item.category,
          amount: item.amount,
          description: item.description || '',
          timestamp: item.timestamp ? (typeof item.timestamp === 'object' && item.timestamp.toDate ? item.timestamp.toDate().toISOString() : new Date(item.timestamp).toISOString()) : null,
        })),
        savings: savings.map(item => ({
          id: item.id,
          amount: item.amount,
          description: item.description || '',
          timestamp: item.timestamp ? (typeof item.timestamp === 'object' && item.timestamp.toDate ? item.timestamp.toDate().toISOString() : new Date(item.timestamp).toISOString()) : null,
        })),
        savingsGoals: savingsGoals.map(item => ({
          id: item.id,
          goalName: item.goalName,
          targetAmount: item.targetAmount,
          savedAmount: item.savedAmount || 0,
          durationType: item.durationType,
          goalDeadline: item.goalDeadline ? (typeof item.goalDeadline === 'object' && item.goalDeadline.toDate ? item.goalDeadline.toDate().toISOString() : new Date(item.goalDeadline).toISOString()) : null,
          status: item.status,
          timestamp: item.timestamp ? (typeof item.timestamp === 'object' && item.timestamp.toDate ? item.timestamp.toDate().toISOString() : new Date(item.timestamp).toISOString()) : null,
        })),
        exportDate: new Date().toISOString(),
        appVersion: '1.0.0',
      };

      // Generate HTML for PDF
      const htmlContent = `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <title>CashTrack Data Export</title>
          <style>
            body { font-family: Arial, sans-serif; margin: 20px; }
            h1 { color: #4CAF50; text-align: center; }
            h2 { color: #2196F3; border-bottom: 2px solid #2196F3; padding-bottom: 5px; }
            table { width: 100%; border-collapse: collapse; margin-bottom: 20px; }
            th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
            th { background-color: #f2f2f2; }
            .summary { background-color: #e8f5e8; padding: 10px; border-radius: 5px; }
          </style>
        </head>
        <body>
          <h1>CashTrack Data Export</h1>
          <p><strong>Export Date:</strong> ${new Date().toLocaleDateString()}</p>
          <p><strong>App Version:</strong> 1.0.0</p>

          <h2>Profile Information</h2>
          <p><strong>Name:</strong> ${exportData.profile.name}</p>
          <p><strong>Email:</strong> ${exportData.profile.email}</p>
          <p><strong>Phone:</strong> ${exportData.profile.phone}</p>
          <p><strong>Savings Goal:</strong> ${settings.currency} ${exportData.profile.savingsGoal}</p>

          <h2>Income Summary</h2>
          <div class="summary">
            <p><strong>Total Income:</strong> ${settings.currency} ${income.reduce((sum, item) => sum + item.amount, 0).toFixed(2)}</p>
            <p><strong>Number of Entries:</strong> ${income.length}</p>
          </div>
          <table>
            <tr><th>Category</th><th>Amount</th><th>Date</th></tr>
            ${income.map(item => {
              let date = 'N/A';
              if (item.timestamp) {
                try {
                  const timestamp = typeof item.timestamp === 'object' && item.timestamp.toDate ? item.timestamp.toDate() : new Date(item.timestamp);
                  date = timestamp.toLocaleDateString();
                } catch (e) {
                  date = 'Invalid Date';
                }
              }
              return `<tr><td>${item.category}</td><td>${settings.currency} ${item.amount}</td><td>${date}</td></tr>`;
            }).join('')}
          </table>

          <h2>Expenses Summary</h2>
          <div class="summary">
            <p><strong>Total Expenses:</strong> ${settings.currency} ${expenses.reduce((sum, item) => sum + item.amount, 0).toFixed(2)}</p>
            <p><strong>Number of Entries:</strong> ${expenses.length}</p>
          </div>
          <table>
            <tr><th>Category</th><th>Amount</th><th>Description</th><th>Date</th></tr>
            ${expenses.map(item => {
              let date = 'N/A';
              if (item.timestamp) {
                try {
                  const timestamp = typeof item.timestamp === 'object' && item.timestamp.toDate ? item.timestamp.toDate() : new Date(item.timestamp);
                  date = timestamp.toLocaleDateString();
                } catch (e) {
                  date = 'Invalid Date';
                }
              }
              return `<tr><td>${item.category}</td><td>${settings.currency} ${item.amount}</td><td>${item.description}</td><td>${date}</td></tr>`;
            }).join('')}
          </table>

          <h2>Savings Summary</h2>
          <div class="summary">
            <p><strong>Total Savings:</strong> ${settings.currency} ${savings.reduce((sum, item) => sum + item.amount, 0).toFixed(2)}</p>
            <p><strong>Number of Entries:</strong> ${savings.length}</p>
          </div>
          <table>
            <tr><th>Amount</th><th>Description</th><th>Date</th></tr>
            ${savings.map(item => {
              let date = 'N/A';
              if (item.timestamp) {
                try {
                  const timestamp = typeof item.timestamp === 'object' && item.timestamp.toDate ? item.timestamp.toDate() : new Date(item.timestamp);
                  date = timestamp.toLocaleDateString();
                } catch (e) {
                  date = 'Invalid Date';
                }
              }
              return `<tr><td>${settings.currency} ${item.amount}</td><td>${item.description}</td><td>${date}</td></tr>`;
            }).join('')}
          </table>

          <h2>Savings Goals</h2>
          <table>
            <tr><th>Goal Name</th><th>Target Amount</th><th>Saved Amount</th><th>Status</th><th>Deadline</th></tr>
            ${savingsGoals.map(item => {
              let deadline = 'N/A';
              if (item.goalDeadline) {
                try {
                  const deadlineDate = typeof item.goalDeadline === 'object' && item.goalDeadline.toDate ? item.goalDeadline.toDate() : new Date(item.goalDeadline);
                  deadline = deadlineDate.toLocaleDateString();
                } catch (e) {
                  deadline = 'Invalid Date';
                }
              }
              return `<tr><td>${item.goalName}</td><td>${settings.currency} ${item.targetAmount}</td><td>${settings.currency} ${item.savedAmount || 0}</td><td>${item.status}</td><td>${deadline}</td></tr>`;
            }).join('')}
          </table>
        </body>
        </html>
      `;

      // Generate PDF
      const { uri } = await Print.printToFileAsync({
        html: htmlContent,
        base64: false,
      });

      // Share the PDF
      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(uri, {
          mimeType: 'application/pdf',
          dialogTitle: 'Export CashTrack Data',
        });
      } else {
        Alert.alert('Error', 'Sharing is not available on this device');
      }

      Alert.alert('Success', 'Data exported successfully as PDF!');
    } catch (error) {
      console.error('Error exporting data:', error);
      Alert.alert('Error', 'Failed to export data. Please try again.');
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#4CAF50" />
        <Text style={styles.loadingText}>Loading profile...</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      <Text style={[styles.header, { color: theme.accentColor }]}>Profile</Text>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Personal Information</Text>

        <InputField
          placeholder="Name"
          value={name}
          onChangeText={setName}
          editable={isEditing}
        />

        <InputField
          placeholder="Email"
          value={email}
          onChangeText={setEmail}
          editable={false}
          keyboardType="email-address"
        />
        {isEditing && <Text style={styles.emailNote}>Email cannot be changed</Text>}

        <InputField
          placeholder="Phone"
          value={phone}
          onChangeText={setPhone}
          editable={isEditing}
          keyboardType="phone-pad"
        />

        {isEditing ? (
          <CustomButton title="Save Changes" onPress={saveProfile} />
        ) : (
          <CustomButton title="Edit Profile" onPress={() => setIsEditing(true)} />
        )}
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>App Settings</Text>

        <View style={styles.setting}>
          <Text style={styles.settingText}>Notifications</Text>
          <Switch
            value={settings.notifications}
            onValueChange={(value) => updateSettings({ notifications: value })}
            trackColor={{ false: '#767577', true: '#81b0ff' }}
            thumbColor={settings.notifications ? '#f5dd4b' : '#f4f3f4'}
          />
        </View>

        <View style={styles.setting}>
          <Text style={styles.settingText}>Currency</Text>
          <Picker
            selectedValue={settings.currency}
            style={styles.picker}
            onValueChange={(itemValue) => updateSettings({ currency: itemValue })}
          >
            <Picker.Item label="INR (₹)" value="INR" />
            <Picker.Item label="USD ($)" value="USD" />
            <Picker.Item label="EUR (€)" value="EUR" />
          </Picker>
        </View>

        <View style={styles.setting}>
          <Text style={styles.settingText}>Theme</Text>
          <Picker
            selectedValue={settings.theme}
            style={styles.picker}
            onValueChange={(itemValue) => updateSettings({ theme: itemValue })}
          >
            <Picker.Item label="Light" value="light" />
            <Picker.Item label="Dark" value="dark" />
          </Picker>
        </View>


      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Data Management</Text>

        <CustomButton title="Backup Data" onPress={handleBackupData} />
        <CustomButton title="Restore Data" onPress={handleRestoreData} />
        <CustomButton title="Export Data" onPress={exportData} />
        <CustomButton title="Reset App Data" onPress={handleResetData} color="#f44336" />
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Account</Text>

        <CustomButton title="Logout" onPress={handleLogout} color="#f44336" />
      </View>
    </ScrollView>
  );
}

const getStyles = (theme) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.backgroundColor,
    padding: 20,
  },
  header: {
    fontSize: 24,
    fontWeight: 'bold',
    color: theme.accentColor,
    textAlign: 'center',
    marginBottom: 20,
  },
  card: {
    backgroundColor: theme.cardBackgroundColor,
    borderRadius: 10,
    padding: 20,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: theme.textColor,
    marginBottom: 15,
  },
  setting: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderBottomColor: theme.borderColor,
  },
  settingText: {
    fontSize: 16,
    color: theme.textColor,
  },
  settingValue: {
    fontSize: 16,
    color: theme.secondaryTextColor,
  },
  picker: {
    width: 150,
    height: 50,
    color: theme.textColor,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: theme.backgroundColor,
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: theme.secondaryTextColor,
  },
  emailNote: {
    fontSize: 12,
    color: theme.secondaryTextColor,
    marginTop: 5,
    fontStyle: 'italic',
  },
});

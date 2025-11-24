import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import * as DocumentPicker from 'expo-document-picker';
import { Alert } from 'react-native';
import {
  getIncome,
  getExpenses,
  getSavings,
  getSavingsGoals,
  getUserProfile,
  getUserSettings,
  addIncome,
  addExpense,
  addSavings,
  addSavingsGoal,
  updateUserProfile,
  updateUserSettings,
  resetAppData,
  backupDataToFirestore,
  getBackupsFromFirestore,
  restoreDataFromFirestore,
  deleteBackupFromFirestore
} from '../firebase/firestoreService';

// Backup data to JSON file and share
export const backupData = async () => {
  try {
    Alert.alert('Backing up data...', 'Please wait while we prepare your backup...');

    // Fetch all user data
    const [income, expenses, savings, savingsGoals, profile, userSettings] = await Promise.all([
      getIncome(),
      getExpenses(),
      getSavings(),
      getSavingsGoals(),
      getUserProfile(),
      getUserSettings(),
    ]);

    // Prepare data for backup
    const backupData = {
      profile: {
        name: profile?.name || '',
        email: '', // Email not stored in profile, will be set during restore
        phone: profile?.phone || '',
        savingsGoal: profile?.savingsGoal || 0,
      },
      settings: userSettings,
      income: income.map(item => ({
        category: item.category,
        amount: item.amount,
        timestamp: item.timestamp ? (typeof item.timestamp === 'object' && item.timestamp.toDate ? item.timestamp.toDate().toISOString() : new Date(item.timestamp).toISOString()) : null,
      })),
      expenses: expenses.map(item => ({
        category: item.category,
        amount: item.amount,
        description: item.description || '',
        timestamp: item.timestamp ? (typeof item.timestamp === 'object' && item.timestamp.toDate ? item.timestamp.toDate().toISOString() : new Date(item.timestamp).toISOString()) : null,
      })),
      savings: savings.map(item => ({
        amount: item.amount,
        description: item.description || '',
        timestamp: item.timestamp ? (typeof item.timestamp === 'object' && item.timestamp.toDate ? item.timestamp.toDate().toISOString() : new Date(item.timestamp).toISOString()) : null,
      })),
      savingsGoals: savingsGoals.map(item => ({
        goalName: item.goalName,
        targetAmount: item.targetAmount,
        savedAmount: item.savedAmount || 0,
        durationType: item.durationType,
        goalDeadline: item.goalDeadline ? (typeof item.goalDeadline === 'object' && item.goalDeadline.toDate ? item.goalDeadline.toDate().toISOString() : new Date(item.goalDeadline).toISOString()) : null,
        status: item.status,
        timestamp: item.timestamp ? (typeof item.timestamp === 'object' && item.timestamp.toDate ? item.timestamp.toDate().toISOString() : new Date(item.timestamp).toISOString()) : null,
      })),
      backupDate: new Date().toISOString(),
      appVersion: '1.0.0',
    };

    // Convert to JSON string
    const jsonString = JSON.stringify(backupData, null, 2);

    // Create file name with timestamp
    const timestamp = new Date().toISOString().slice(0, 19).replace(/:/g, '-');
    const fileName = `CashTrack_Backup_${timestamp}.json`;
    const fileUri = FileSystem.documentDirectory + fileName;

    // Write to file
    await FileSystem.writeAsStringAsync(fileUri, jsonString);

    // Share the file
    if (await Sharing.isAvailableAsync()) {
      await Sharing.shareAsync(fileUri, {
        mimeType: 'application/json',
        dialogTitle: 'Share CashTrack Backup',
      });
    } else {
      Alert.alert('Error', 'Sharing is not available on this device');
    }

    Alert.alert('Success', 'Backup completed successfully!');
  } catch (error) {
    console.error('Backup error:', error);
    Alert.alert('Error', 'Failed to backup data. Please try again.');
  }
};

// Restore data from JSON file
export const restoreData = async () => {
  try {
    // Pick a file
    const result = await DocumentPicker.getDocumentAsync({
      type: 'application/json',
      copyToCacheDirectory: true,
    });

    if (result.type === 'cancel') {
      return; // User cancelled
    }

    Alert.alert('Restoring data...', 'Please wait while we restore your data...');

    // Read the file
    const fileContent = await FileSystem.readAsStringAsync(result.uri);
    const backupData = JSON.parse(fileContent);

    // Validate backup data structure
    if (!backupData.income || !backupData.expenses || !backupData.savings || !backupData.savingsGoals) {
      throw new Error('Invalid backup file format');
    }

    // Clear existing data
    await resetAppData();

    // Restore profile and settings
    if (backupData.profile) {
      await updateUserProfile({
        name: backupData.profile.name,
        phone: backupData.profile.phone,
        savingsGoal: backupData.profile.savingsGoal,
      });
    }

    if (backupData.settings) {
      await updateUserSettings(backupData.settings);
    }

    // Restore income
    for (const item of backupData.income) {
      await addIncome({
        category: item.category,
        amount: item.amount,
      });
    }

    // Restore expenses
    for (const item of backupData.expenses) {
      await addExpense({
        category: item.category,
        amount: item.amount,
        description: item.description,
      });
    }

    // Restore savings
    for (const item of backupData.savings) {
      await addSavings({
        amount: item.amount,
        description: item.description,
      });
    }

    // Restore savings goals
    for (const item of backupData.savingsGoals) {
      await addSavingsGoal({
        name: item.goalName,
        amount: item.targetAmount,
        savedAmount: item.savedAmount,
        durationType: item.durationType,
        goalDeadline: item.goalDeadline ? new Date(item.goalDeadline) : null,
      });
    }

    Alert.alert('Success', 'Data restored successfully!');
  } catch (error) {
    console.error('Restore error:', error);
    Alert.alert('Error', 'Failed to restore data. Please check the file and try again.');
  }
};

// Backup data to Firestore (cloud backup)
export const backupDataToCloud = async () => {
  try {
    Alert.alert('Backing up to cloud...', 'Please wait while we backup your data to the cloud...');

    // Fetch all user data
    const [income, expenses, savings, savingsGoals, profile, userSettings] = await Promise.all([
      getIncome(),
      getExpenses(),
      getSavings(),
      getSavingsGoals(),
      getUserProfile(),
      getUserSettings(),
    ]);

    // Prepare data for backup
    const backupData = {
      profile: {
        name: profile?.name || '',
        email: '', // Email not stored in profile, will be set during restore
        phone: profile?.phone || '',
        savingsGoal: profile?.savingsGoal || 0,
      },
      settings: userSettings,
      income: income.map(item => ({
        category: item.category,
        amount: item.amount,
        timestamp: item.timestamp ? (typeof item.timestamp === 'object' && item.timestamp.toDate ? item.timestamp.toDate().toISOString() : new Date(item.timestamp).toISOString()) : null,
      })),
      expenses: expenses.map(item => ({
        category: item.category,
        amount: item.amount,
        description: item.description || '',
        timestamp: item.timestamp ? (typeof item.timestamp === 'object' && item.timestamp.toDate ? item.timestamp.toDate().toISOString() : new Date(item.timestamp).toISOString()) : null,
      })),
      savings: savings.map(item => ({
        amount: item.amount,
        description: item.description || '',
        timestamp: item.timestamp ? (typeof item.timestamp === 'object' && item.timestamp.toDate ? item.timestamp.toDate().toISOString() : new Date(item.timestamp).toISOString()) : null,
      })),
      savingsGoals: savingsGoals.map(item => ({
        goalName: item.goalName,
        targetAmount: item.targetAmount,
        savedAmount: item.savedAmount || 0,
        durationType: item.durationType,
        goalDeadline: item.goalDeadline ? (typeof item.goalDeadline === 'object' && item.goalDeadline.toDate ? item.goalDeadline.toDate().toISOString() : new Date(item.goalDeadline).toISOString()) : null,
        status: item.status,
        timestamp: item.timestamp ? (typeof item.timestamp === 'object' && item.timestamp.toDate ? item.timestamp.toDate().toISOString() : new Date(item.timestamp).toISOString()) : null,
      })),
      backupDate: new Date().toISOString(),
      appVersion: '1.0.0',
    };

    // Save to Firestore
    await backupDataToFirestore(backupData);

    Alert.alert('Success', 'Cloud backup completed successfully!');
  } catch (error) {
    console.error('Cloud backup error:', error);
    Alert.alert('Error', 'Failed to backup data to cloud. Please try again.');
  }
};

// Get cloud backups
export const getCloudBackups = async () => {
  try {
    const backups = await getBackupsFromFirestore();
    return backups;
  } catch (error) {
    console.error('Error getting cloud backups:', error);
    throw error;
  }
};

// Restore from cloud backup
export const restoreFromCloud = async (backupId) => {
  try {
    Alert.alert('Restoring from cloud...', 'Please wait while we restore your data from the cloud...');

    await restoreDataFromFirestore(backupId);

    Alert.alert('Success', 'Data restored from cloud successfully!');
  } catch (error) {
    console.error('Cloud restore error:', error);
    Alert.alert('Error', 'Failed to restore data from cloud. Please try again.');
  }
};

// Delete cloud backup
export const deleteCloudBackup = async (backupId) => {
  try {
    await deleteBackupFromFirestore(backupId);
    Alert.alert('Success', 'Cloud backup deleted successfully!');
  } catch (error) {
    console.error('Error deleting cloud backup:', error);
    Alert.alert('Error', 'Failed to delete cloud backup. Please try again.');
  }
};

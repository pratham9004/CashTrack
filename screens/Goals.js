import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert, Modal, ActivityIndicator } from 'react-native';
import CustomButton from '../components/CustomButton';
import InputField from '../components/InputField';
import { getSavingsGoals, updateSavingsGoalDoc, deleteSavingsGoal, getSavings } from '../firebase/firestoreService';
import { formatCurrency } from '../utils/helpers';
import { useSettings } from '../contexts/SettingsContext';

export default function Goals() {
  const { getThemeColors } = useSettings();
  const theme = getThemeColors();
  const [goals, setGoals] = useState([]);
  const [currentSavings, setCurrentSavings] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [editingGoal, setEditingGoal] = useState(null);
  const [editName, setEditName] = useState('');
  const [editAmount, setEditAmount] = useState('');
  const [editPeriod, setEditPeriod] = useState('Monthly');
  const [modalVisible, setModalVisible] = useState(false);
  const { settings } = useSettings();

  // Fetch goals and total savings on component mount
  useEffect(() => {
    fetchGoals();
  }, []);

  const fetchGoals = async () => {
    try {
      setLoading(true);
      const [goalsData, savingsData] = await Promise.all([
        getSavingsGoals(),
        getSavings()
      ]);
      setGoals(goalsData);
      const total = savingsData.reduce((sum, entry) => sum + (Number(entry.amount) || 0), 0);
      setCurrentSavings(total);
      setError(null);
    } catch (err) {
      setError('Failed to load goals');
      console.error('Error fetching goals:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (goal) => {
    setEditingGoal(goal);
    setEditName(goal.name);
    setEditAmount(goal.amount.toString());
    setEditPeriod(goal.period);
    setModalVisible(true);
  };

  const handleUpdate = async () => {
    if (!editName.trim() || !editAmount.trim()) {
      Alert.alert('Error', 'Please enter goal name and amount');
      return;
    }

    try {
      const goalData = {
        name: editName.trim(),
        amount: parseFloat(editAmount),
        period: editPeriod,
      };
      await updateSavingsGoalDoc(editingGoal.id, goalData);
      setModalVisible(false);
      setEditingGoal(null);
      setEditName('');
      setEditAmount('');
      setEditPeriod('Monthly');
      fetchGoals(); // Refresh data
    } catch (err) {
      Alert.alert('Error', 'Failed to update goal');
      console.error('Error updating goal:', err);
    }
  };

  const handleDelete = (goal) => {
    Alert.alert(
      'Delete Goal',
      `Are you sure you want to delete "${goal.name}"?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteSavingsGoal(goal.id);
              fetchGoals(); // Refresh data
            } catch (err) {
              Alert.alert('Error', 'Failed to delete goal');
              console.error('Error deleting goal:', err);
            }
          },
        },
      ]
    );
  };

  return (
    <ScrollView style={[styles.container, { backgroundColor: theme.backgroundColor }]}>
      <Text style={[styles.header, { color: theme.accentColor }]}>Savings Goals</Text>

      {loading ? (
        <ActivityIndicator size="large" color={theme.accentColor} />
      ) : error ? (
        <Text style={styles.errorText}>{error}</Text>
      ) : goals.length === 0 ? (
        <Text style={[styles.noGoalsText, { color: theme.secondaryTextColor }]}>No savings goals yet. Add one from the Savings screen!</Text>
      ) : (
        goals.map((goal) => {
          const progress = currentSavings > 0 ? Math.min((currentSavings / goal.amount) * 100, 100) : 0;
          return (
            <View key={goal.id} style={[styles.goalCard, { backgroundColor: theme.cardBackgroundColor, shadowColor: theme.textColor }]}>
              <Text style={[styles.goalName, { color: theme.textColor }]}>{goal.name}</Text>
              <Text style={[styles.goalAmount, { color: theme.secondaryTextColor }]}>{formatCurrency(goal.amount, settings.currency)} / {goal.period}</Text>
              <Text style={[styles.progressText, { color: theme.accentColor }]}>{progress.toFixed(1)}% completed</Text>
              <View style={styles.progressBar}>
                <View style={[styles.progressFill, { backgroundColor: theme.accentColor }]} />
              </View>
              <View style={styles.goalButtons}>
                <TouchableOpacity onPress={() => handleEdit(goal)}>
                  <Text style={[styles.editText, { color: theme.accentColor }]}>Edit</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={() => handleDelete(goal)}>
                  <Text style={styles.deleteText}>Delete</Text>
                </TouchableOpacity>
              </View>
            </View>
          );
        })
      )}

      {/* Edit Modal */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={modalVisible}
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: theme.cardBackgroundColor }]}>
            <Text style={[styles.modalTitle, { color: theme.textColor }]}>Edit Goal</Text>
            <InputField
              placeholder="Goal Name"
              value={editName}
              onChangeText={setEditName}
            />
            <InputField
              placeholder="Target Amount"
              value={editAmount}
              onChangeText={setEditAmount}
              keyboardType="numeric"
            />
            <View style={styles.periodContainer}>
              <TouchableOpacity
                style={[styles.periodButton, editPeriod === 'Weekly' && styles.periodButtonActive]}
                onPress={() => setEditPeriod('Weekly')}
              >
                <Text style={[styles.periodText, editPeriod === 'Weekly' && styles.periodTextActive]}>Weekly</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.periodButton, editPeriod === 'Monthly' && styles.periodButtonActive]}
                onPress={() => setEditPeriod('Monthly')}
              >
                <Text style={[styles.periodText, editPeriod === 'Monthly' && styles.periodTextActive]}>Monthly</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.periodButton, editPeriod === 'Yearly' && styles.periodButtonActive]}
                onPress={() => setEditPeriod('Yearly')}
              >
                <Text style={[styles.periodText, editPeriod === 'Yearly' && styles.periodTextActive]}>Yearly</Text>
              </TouchableOpacity>
            </View>
            <View style={styles.modalButtons}>
              <CustomButton title="Cancel" onPress={() => setModalVisible(false)} />
              <CustomButton title="Update" onPress={handleUpdate} />
            </View>
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
    padding: 20,
  },
  header: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#4CAF50',
    textAlign: 'center',
    marginBottom: 20,
  },
  errorText: {
    color: 'red',
    textAlign: 'center',
    fontSize: 16,
  },
  noGoalsText: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginTop: 20,
  },
  goalCard: {
    backgroundColor: 'white',
    borderRadius: 10,
    padding: 20,
    marginBottom: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  goalName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 5,
  },
  goalAmount: {
    fontSize: 16,
    color: '#666',
    marginBottom: 10,
  },
  progressText: {
    fontSize: 14,
    color: '#4CAF50',
    fontWeight: 'bold',
    marginBottom: 5,
  },
  progressBar: {
    height: 10,
    backgroundColor: '#e0e0e0',
    borderRadius: 5,
    marginBottom: 10,
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#4CAF50',
    borderRadius: 5,
  },
  goalButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  editText: {
    color: '#4CAF50',
    fontSize: 16,
    fontWeight: 'bold',
  },
  deleteText: {
    color: '#FF5722',
    fontSize: 16,
    fontWeight: 'bold',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: 'white',
    borderRadius: 10,
    padding: 20,
    width: '80%',
    maxWidth: 400,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 20,
    textAlign: 'center',
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 20,
  },
  periodContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 15,
  },
  periodButton: {
    flex: 1,
    paddingVertical: 10,
    paddingHorizontal: 15,
    borderRadius: 5,
    borderWidth: 1,
    borderColor: '#4CAF50',
    marginHorizontal: 5,
    alignItems: 'center',
  },
  periodButtonActive: {
    backgroundColor: '#4CAF50',
  },
  periodText: {
    fontSize: 16,
    color: '#4CAF50',
  },
  periodTextActive: {
    color: 'white',
  },
});

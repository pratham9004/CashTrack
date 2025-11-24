import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert, Modal, ActivityIndicator, Platform } from 'react-native';
import { ProgressBar, Menu, IconButton } from 'react-native-paper';
import { PieChart } from 'react-native-chart-kit';
import DateTimePicker from '@react-native-community/datetimepicker';
import CustomButton from '../components/CustomButton';
import InputField from '../components/InputField';
import TransactionItem from '../components/TransactionItem';
import { getSavings, addSavings, updateSavings, deleteSavings, getSavingsGoals, addSavingsGoal, deleteSavingsGoal, archiveSavingsGoal, notAchievedSavingsGoal, getIncome, getExpenses, getSavingsGoalsRealtime, getSavingsRealtime, addSavingsToGoal, updateSavingsGoalDoc } from '../firebase/firestoreService';
import { formatCurrency } from '../utils/helpers';
import { useSettings } from '../contexts/SettingsContext';

export default function Savings() {
  const { getThemeColors } = useSettings();
  const theme = getThemeColors();
  const styles = getStyles(theme);
  const [savingsGoals, setSavingsGoals] = useState([]);
  const [currentSavings, setCurrentSavings] = useState(0);
  const [totalTarget, setTotalTarget] = useState(0);
  const [savingsEntries, setSavingsEntries] = useState([]);
  const [totalIncome, setTotalIncome] = useState(0);
  const [totalExpenses, setTotalExpenses] = useState(0);
  const { settings } = useSettings();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [newGoalName, setNewGoalName] = useState('');
  const [newGoalAmount, setNewGoalAmount] = useState('');
  const [newGoalSavedAmount, setNewGoalSavedAmount] = useState('');
  const [newGoalDurationType, setNewGoalDurationType] = useState('monthly');
  const [goalDeadline, setGoalDeadline] = useState(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [useDuration, setUseDuration] = useState(false);
  const [durationMonths, setDurationMonths] = useState('3');

  const [editingItem, setEditingItem] = useState(null);
  const [editAmount, setEditAmount] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [modalVisible, setModalVisible] = useState(false);
  const [showAddGoal, setShowAddGoal] = useState(false);
  const [menuVisible, setMenuVisible] = useState(false);
  const [selectedGoal, setSelectedGoal] = useState(null);
  const [showAddAmountModal, setShowAddAmountModal] = useState(false);
  const [addAmountValue, setAddAmountValue] = useState('');
  const [selectedGoalForAdd, setSelectedGoalForAdd] = useState(null);

  // Fetch savings data and goals on component mount
  useEffect(() => {
    fetchSavingsData();
    // Set up real-time listeners for savings goals and savings entries
    const unsubscribeGoals = getSavingsGoalsRealtime((goals) => {
      setSavingsGoals(goals);
    });
    const unsubscribeSavings = getSavingsRealtime((savings) => {
      setSavingsEntries(savings);
    });
    return () => {
      unsubscribeGoals();
      unsubscribeSavings();
    }; // Cleanup on unmount
  }, []);

  // Calculate total savings and total target whenever savingsGoals or savingsEntries change
  useEffect(() => {
    const allGoalsTotal = savingsGoals.reduce((sum, goal) => sum + (Number(goal.savedAmount) || 0), 0);
    const savingsTotal = savingsEntries.reduce((sum, entry) => sum + (Number(entry.amount) || 0), 0);
    setCurrentSavings(savingsTotal + allGoalsTotal);
    const totalTargetAmount = savingsGoals.reduce((sum, goal) => sum + (Number(goal.targetAmount) || 0), 0);
    setTotalTarget(totalTargetAmount);
  }, [savingsGoals, savingsEntries]);

  const fetchSavingsData = async () => {
    try {
      setLoading(true);
      const [savingsData, goalsData, incomeData, expensesData] = await Promise.all([
        getSavings(),
        getSavingsGoals(),
        getIncome(),
        getExpenses()
      ]);
      setSavingsEntries(savingsData);
      setSavingsGoals(goalsData);
      setTotalIncome(incomeData.reduce((sum, item) => sum + (item.amount || 0), 0));
      setTotalExpenses(expensesData.reduce((sum, item) => sum + (item.amount || 0), 0));
      // Calculate current savings from entries + active goals' savedAmount
      const savingsTotal = savingsData.reduce((sum, entry) => sum + (Number(entry.amount) || 0), 0);
      const activeGoalsTotal = goalsData.filter(goal => goal.status === 'ongoing').reduce((sum, goal) => sum + (Number(goal.savedAmount) || 0), 0);
      setCurrentSavings(savingsTotal + activeGoalsTotal);
      setError(null);
    } catch (err) {
      setError('Failed to load savings data');
      console.error('Error fetching savings data:', err);
    } finally {
      setLoading(false);
    }
  };



  const onDateChange = (event, selectedDate) => {
    const currentDate = selectedDate || goalDeadline;
    setShowDatePicker(Platform.OS === 'ios');
    setGoalDeadline(currentDate);
  };

  const calculateDeadline = () => {
    if (useDuration) {
      const months = parseInt(durationMonths) || 3;
      const deadline = new Date();
      deadline.setMonth(deadline.getMonth() + months);
      return deadline;
    }
    return goalDeadline;
  };

  const handleAddSavingsGoal = async () => {
    if (!newGoalName.trim() || !newGoalAmount.trim()) {
      Alert.alert('Error', 'Please enter goal name and amount');
      return;
    }

    const remainingIncome = totalIncome - totalExpenses;
    const goalAmount = parseFloat(newGoalAmount);
    const savedAmount = parseFloat(newGoalSavedAmount) || 0;
    const isAchievable = goalAmount <= remainingIncome;

    if (!isAchievable) {
      Alert.alert('Warning', `This goal may not be achievable with your current income. Remaining income: ${formatCurrency(remainingIncome)}`);
    }

    try {
      const deadline = calculateDeadline();
      const goalData = {
        name: newGoalName.trim(),
        amount: goalAmount,
        savedAmount: savedAmount,
        durationType: newGoalDurationType,
        goalDeadline: deadline,
        status: 'ongoing',
      };
      await addSavingsGoal(goalData);
      setNewGoalName('');
      setNewGoalAmount('');
      setNewGoalSavedAmount('');
      setNewGoalDurationType('monthly');
      setGoalDeadline(new Date());
      setUseDuration(false);
      setDurationMonths('3');
      fetchSavingsData(); // Refresh data
      Alert.alert('Success', 'Savings goal added successfully! 💰 Keep saving to achieve your dreams!');
    } catch (err) {
      Alert.alert('Error', 'Failed to add savings goal');
      console.error('Error adding savings goal:', err);
    }
  };

  const handleEditSavings = (item) => {
    setEditingItem(item);
    setEditAmount(item.amount.toString());
    setEditDescription(item.description);
    setModalVisible(true);
  };

  const handleUpdateSavings = async () => {
    if (!editAmount.trim()) {
      Alert.alert('Error', 'Please enter an amount');
      return;
    }

    try {
      const savingsData = {
        amount: parseFloat(editAmount),
        description: editDescription.trim() || 'Savings deposit',
      };
      await updateSavings(editingItem.id, savingsData);
      setModalVisible(false);
      setEditingItem(null);
      setEditAmount('');
      setEditDescription('');
      fetchSavingsData(); // Refresh data
    } catch (err) {
      Alert.alert('Error', 'Failed to update savings');
      console.error('Error updating savings:', err);
    }
  };

  const handleDeleteSavings = (item) => {
    Alert.alert(
      'Delete Savings',
      `Are you sure you want to delete "${item.description}"?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteSavings(item.id);
              fetchSavingsData(); // Refresh data
            } catch (err) {
              Alert.alert('Error', 'Failed to delete savings');
              console.error('Error deleting savings:', err);
            }
          },
        },
      ]
    );
  };

  const handleArchiveGoal = (goal) => {
    Alert.alert(
      'Achieve Goal',
      `Are you sure you want to mark "${goal.goalName}" as achieved? This will remove the goal and add the saved amount to your savings history.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Achieve',
          onPress: async () => {
            try {
              // Add the saved amount to savings history
              await addSavings({
                amount: goal.savedAmount || 0,
                description: `Goal achieved: ${goal.goalName}`,
              });
              // Delete the goal
              await deleteSavingsGoal(goal.id);
              fetchSavingsData(); // Refresh data
              Alert.alert('Success', 'Goal achieved! The saved amount has been added to your savings history.');
            } catch (err) {
              Alert.alert('Error', 'Failed to achieve goal');
              console.error('Error achieving goal:', err);
            }
          },
        },
      ]
    );
  };

  const handleNotAchievedGoal = (goal) => {
    Alert.alert(
      'Mark as Not Achieved',
      `Are you sure you want to mark "${goal.goalName}" as not achieved? This will remove the goal and add an entry to your savings history.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Mark as Not Achieved',
          style: 'destructive',
          onPress: async () => {
            try {
              // Add entry to savings history with amount 0
              await addSavings({
                amount: 0,
                description: `Goal not achieved: ${goal.goalName}`,
              });
              // Delete the goal
              await deleteSavingsGoal(goal.id);
              fetchSavingsData(); // Refresh data
              Alert.alert('Success', 'Goal marked as not achieved! An entry has been added to your savings history.');
            } catch (err) {
              Alert.alert('Error', 'Failed to mark goal as not achieved');
              console.error('Error marking goal as not achieved:', err);
            }
          },
        },
      ]
    );
  };

  const handleDeleteGoal = (goal) => {
    Alert.alert(
      'Delete Goal',
      `Are you sure you want to permanently delete "${goal.goalName}"? This action cannot be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteSavingsGoal(goal.id);
              Alert.alert('Success', 'Goal deleted successfully!');
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
    <View style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false} scrollEnabled={!showAddGoal && !modalVisible}>
        <View style={styles.headerContainer}>
          <Text style={styles.headerIcon}>🏦</Text>
          <Text style={styles.header}>My Savings Goals</Text>
        </View>
        <Text style={styles.subHeader}>Track your progress and reach your goals!</Text>
        {/* Current Savings Summary */}
        <View style={styles.summaryCard}>
          <View style={styles.summaryLeft}>
            <Text style={styles.summaryTitle}>Total Savings</Text>
            <Text style={styles.summaryAmount}>{formatCurrency(currentSavings, settings.currency)}</Text>
            <Text style={styles.summarySubtitle}>Total Target: {formatCurrency(totalTarget, settings.currency)}</Text>
          </View>
          <View style={styles.summaryRight}>
            <Text style={styles.summaryIcon}>🏦</Text>
          </View>
        </View>

        {/* Savings Goals with Progress Bars */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>🎯 Your Savings Goals</Text>
          {savingsGoals.length === 0 ? (
            <Text style={styles.noGoalsText}>No savings goals yet. Add one below!</Text>
          ) : (
            savingsGoals.map((goal) => {
              const progress = goal.savedAmount ? Math.min(goal.savedAmount / goal.targetAmount, 1) : 0;
              const remaining = goal.targetAmount - (goal.savedAmount || 0);
              return (
                <View key={goal.id} style={styles.goalItem}>
                  {(!goal.status || goal.status === 'ongoing') && (
                    <Menu
                      visible={menuVisible && selectedGoal?.id === goal.id}
                      onDismiss={() => setMenuVisible(false)}
                      anchor={
                        <IconButton
                          icon="dots-vertical"
                          onPress={() => {
                            setSelectedGoal(goal);
                            setMenuVisible(true);
                          }}
                        />
                      }
                    >
                      <Menu.Item
                        onPress={() => {
                          setMenuVisible(false);
                          setSelectedGoalForAdd(goal);
                          setShowAddAmountModal(true);
                        }}
                        title="Add Amount"
                      />
                      <Menu.Item
                        onPress={() => {
                          setMenuVisible(false);
                          handleArchiveGoal(goal);
                        }}
                        title="Goal Achieve"
                      />
                      <Menu.Item
                        onPress={() => {
                          setMenuVisible(false);
                          handleNotAchievedGoal(goal);
                        }}
                        title="Not Achieve"
                      />
                      <Menu.Item
                        onPress={() => {
                          setMenuVisible(false);
                          handleDeleteGoal(goal);
                        }}
                        title="Delete Goal"
                      />
                    </Menu>
                  )}
                  <View style={styles.goalInfo}>
                    <Text style={styles.goalName}>{goal.goalName}</Text>
                    <Text style={styles.goalStatus}>Status: {goal.status}</Text>
                    <Text style={styles.goalProgress}>
                      {formatCurrency(goal.savedAmount || 0, settings.currency)} / {formatCurrency(goal.targetAmount, settings.currency)}
                    </Text>
                    <ProgressBar
                      progress={progress}
                      color="#34A853"
                      style={styles.progressBar}
                    />
                    <Text style={styles.goalRemaining}>
                      {remaining > 0 ? `${formatCurrency(remaining, settings.currency)} remaining` : 'Goal achieved! 🎉'}
                    </Text>
                  </View>
                </View>
              );
            })
          )}
        </View>

        {/* Savings Breakdown Pie Chart */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Savings Breakdown</Text>
          {savingsGoals.length > 0 ? (
            <PieChart
              data={savingsGoals.map((goal, index) => ({
                name: goal.goalName,
                amount: goal.savedAmount || 0,
                color: ['#34A853', '#4ECDC4', '#45B7D1', '#96CEB4', '#FFEAA7'][index % 5],
                legendFontColor: theme.textColor,
                legendFontSize: 12,
              }))}
              width={300}
              height={200}
              chartConfig={{
                backgroundColor: theme.cardBackgroundColor,
                backgroundGradientFrom: theme.cardBackgroundColor,
                backgroundGradientTo: theme.cardBackgroundColor,
                color: (opacity = 1) => `rgba(${theme.textColor === '#000000' ? '0, 0, 0' : '255, 255, 255'}, ${opacity})`,
              }}
              accessor="amount"
              backgroundColor="transparent"
              paddingLeft="15"
              style={styles.chart}
            />
          ) : (
            <Text style={styles.noDataText}>Add savings goals to see breakdown</Text>
          )}
        </View>

        {/* Savings History */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>📜 Savings History</Text>
          {loading ? (
            <ActivityIndicator size="large" color="#34A853" />
          ) : error ? (
            <Text style={styles.errorText}>{error}</Text>
          ) : savingsEntries.length > 0 ? (
            savingsEntries.map((item) => (
              <View key={item.id} style={styles.savingsItem}>
                <View style={styles.savingsLeft}>
                  <Text style={styles.savingsIcon}>💵</Text>
                  <View>
                    <Text style={styles.savingsDescription}>
                      {item.description || 'Savings Deposit'}
                    </Text>
                    <Text style={styles.savingsDate}>
                      {item.timestamp ? new Date(item.timestamp.seconds * 1000).toLocaleDateString() : 'Today'}
                    </Text>
                  </View>
                </View>
                <View style={styles.savingsRight}>
                  <Text style={styles.savingsAmount}>{formatCurrency(item.amount, settings.currency)}</Text>
                  <View style={styles.savingsActions}>
                    {!item.description.startsWith('Goal achieved:') && !item.description.startsWith('Goal not achieved:') && (
                      <TouchableOpacity
                        style={styles.actionButton}
                        onPress={() => handleEditSavings(item)}
                      >
                        <Text style={styles.actionText}>✏️</Text>
                      </TouchableOpacity>
                    )}
                    <TouchableOpacity
                      style={styles.actionButton}
                      onPress={() => handleDeleteSavings(item)}
                    >
                      <Text style={styles.actionText}>🗑️</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              </View>
            ))
          ) : (
            <Text style={styles.noDataText}>No savings history yet</Text>
          )}
        </View>


      </ScrollView>

      {/* Floating Add Goal Button */}
      <TouchableOpacity
        style={styles.floatingButton}
        onPress={() => setShowAddGoal(true)}
      >
        <Text style={styles.floatingButtonText}>+</Text>
      </TouchableOpacity>

      {/* Add Goal Modal */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={showAddGoal}
        onRequestClose={() => setShowAddGoal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Add New Savings Goal</Text>
            <InputField
              placeholder="Goal Name (e.g., Vacation Fund)"
              value={newGoalName}
              onChangeText={setNewGoalName}
            />
            <InputField
              placeholder="Target Amount"
              value={newGoalAmount}
              onChangeText={setNewGoalAmount}
              keyboardType="numeric"
            />
            <InputField
              placeholder="Current Saved Amount (optional)"
              value={newGoalSavedAmount}
              onChangeText={setNewGoalSavedAmount}
              keyboardType="numeric"
            />

            <Text style={styles.sectionTitle}>Saving Duration</Text>
            <View style={styles.periodContainer}>
              <TouchableOpacity
                style={[styles.periodButton, newGoalDurationType === 'weekly' && styles.periodButtonActive]}
                onPress={() => setNewGoalDurationType('weekly')}
              >
                <Text style={[styles.periodText, newGoalDurationType === 'weekly' && styles.periodTextActive]}>Weekly</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.periodButton, newGoalDurationType === 'monthly' && styles.periodButtonActive]}
                onPress={() => setNewGoalDurationType('monthly')}
              >
                <Text style={[styles.periodText, newGoalDurationType === 'monthly' && styles.periodTextActive]}>Monthly</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.periodButton, newGoalDurationType === 'yearly' && styles.periodButtonActive]}
                onPress={() => setNewGoalDurationType('yearly')}
              >
                <Text style={[styles.periodText, newGoalDurationType === 'yearly' && styles.periodTextActive]}>Yearly</Text>
              </TouchableOpacity>
            </View>

            <Text style={styles.sectionTitle}>Set Goal Deadline</Text>
            <View style={styles.deadlineContainer}>
              <TouchableOpacity
                style={[styles.deadlineButton, !useDuration && styles.deadlineButtonActive]}
                onPress={() => setUseDuration(false)}
              >
                <Text style={[styles.deadlineText, !useDuration && styles.deadlineTextActive]}>Pick Date</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.deadlineButton, useDuration && styles.deadlineButtonActive]}
                onPress={() => setUseDuration(true)}
              >
                <Text style={[styles.deadlineText, useDuration && styles.deadlineTextActive]}>Duration</Text>
              </TouchableOpacity>
            </View>

            {useDuration ? (
              <InputField
                placeholder="Months (e.g., 3)"
                value={durationMonths}
                onChangeText={setDurationMonths}
                keyboardType="numeric"
              />
            ) : (
              <TouchableOpacity onPress={() => setShowDatePicker(true)} style={styles.datePickerButton}>
                <Text style={styles.datePickerText}>
                  {goalDeadline.toLocaleDateString()}
                </Text>
              </TouchableOpacity>
            )}

            {showDatePicker && (
              <DateTimePicker
                value={goalDeadline}
                mode="date"
                display="default"
                onChange={onDateChange}
                minimumDate={new Date()}
              />
            )}

            <View style={styles.modalButtons}>
              <CustomButton
                title="Cancel"
                onPress={() => {
                  setShowAddGoal(false);
                  setNewGoalName('');
                  setNewGoalAmount('');
                  setNewGoalSavedAmount('');
                  setNewGoalDurationType('monthly');
                  setGoalDeadline(new Date());
                  setUseDuration(false);
                  setDurationMonths('3');
                }}
                style={{ backgroundColor: '#666' }}
              />
              <CustomButton title="Save Goal" onPress={handleAddSavingsGoal} />
            </View>
          </View>
        </View>
      </Modal>

      {/* Edit Modal */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={modalVisible}
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Edit Savings</Text>
            <InputField
              placeholder="Amount"
              value={editAmount}
              onChangeText={setEditAmount}
              keyboardType="numeric"
            />
            <InputField
              placeholder="Description"
              value={editDescription}
              onChangeText={setEditDescription}
            />
            <View style={styles.modalButtons}>
              <CustomButton title="Cancel" onPress={() => setModalVisible(false)} />
              <CustomButton title="Update" onPress={handleUpdateSavings} />
            </View>
          </View>
        </View>
      </Modal>

      {/* Add Amount Modal */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={showAddAmountModal}
        onRequestClose={() => setShowAddAmountModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Add Amount to Goal</Text>
            <Text style={styles.goalNameText}>{selectedGoalForAdd?.goalName}</Text>
            <InputField
              placeholder="Amount to add"
              value={addAmountValue}
              onChangeText={setAddAmountValue}
              keyboardType="numeric"
            />
            <View style={styles.modalButtons}>
              <CustomButton
                title="Cancel"
                onPress={() => {
                  setShowAddAmountModal(false);
                  setAddAmountValue('');
                  setSelectedGoalForAdd(null);
                }}
                style={{ backgroundColor: '#666' }}
              />
              <CustomButton
                title="Add"
                onPress={async () => {
                  const numAmount = parseFloat(addAmountValue);
                  if (isNaN(numAmount) || numAmount <= 0) {
                    Alert.alert('Error', 'Please enter a valid amount');
                    return;
                  }
                  try {
                    await addSavingsToGoal(selectedGoalForAdd.id, numAmount);
                    const newSavedAmount = (selectedGoalForAdd.savedAmount || 0) + numAmount;
                    if (newSavedAmount >= selectedGoalForAdd.targetAmount) {
                      // Goal achieved: add to savings history and delete goal
                      await addSavings({
                        amount: newSavedAmount,
                        description: `Goal achieved: ${selectedGoalForAdd.goalName}`,
                      });
                      await deleteSavingsGoal(selectedGoalForAdd.id);
                      Alert.alert('Success', `Goal achieved! Added ${formatCurrency(newSavedAmount)} to savings history.`);
                    } else {
                      Alert.alert('Success', `Added ${formatCurrency(numAmount)} to ${selectedGoalForAdd.goalName}!`);
                    }
                    fetchSavingsData(); // Refresh data
                    setShowAddAmountModal(false);
                    setAddAmountValue('');
                    setSelectedGoalForAdd(null);
                  } catch (err) {
                    Alert.alert('Error', 'Failed to add savings to goal');
                    console.error('Error adding savings to goal:', err);
                  }
                }}
              />
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const getStyles = (theme) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.backgroundColor,
    padding: 20,
  },
  headerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  header: {
    fontSize: 24,
    fontWeight: 'bold',
    color: theme.accentColor,
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
  subHeader: {
    fontSize: 16,
    color: theme.secondaryTextColor,
    textAlign: 'center',
    marginBottom: 20,
  },
  summaryCard: {
    backgroundColor: theme.accentColor,
    borderRadius: 15,
    padding: 20,
    marginBottom: 20,
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
    elevation: 5,
  },
  summaryLeft: {
    flex: 1,
  },
  summaryTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: 'white',
    marginBottom: 5,
  },
  summaryAmount: {
    fontSize: 28,
    fontWeight: 'bold',
    color: 'white',
    marginBottom: 5,
  },
  summarySubtitle: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.8)',
  },
  summaryRight: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  summaryIcon: {
    fontSize: 40,
  },
  headerIcon: {
    fontSize: 24,
    marginRight: 10,
  },
  progressBar: {
    height: 8,
    borderRadius: 4,
    marginVertical: 5,
  },
  goalProgress: {
    fontSize: 14,
    color: theme.secondaryTextColor,
    marginBottom: 5,
  },
  goalRemaining: {
    fontSize: 12,
    color: theme.secondaryTextColor,
    fontStyle: 'italic',
  },
  menuButton: {
    position: 'absolute',
    top: 10,
    right: 10,
    padding: 5,
  },
  chart: {
    alignSelf: 'center',
    marginVertical: 10,
  },
  noDataText: {
    fontSize: 16,
    color: theme.secondaryTextColor,
    textAlign: 'center',
    marginTop: 10,
  },
  savingsItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderBottomColor: theme.borderColor,
  },
  savingsLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  savingsIcon: {
    fontSize: 24,
    marginRight: 15,
  },
  savingsDescription: {
    fontSize: 16,
    fontWeight: 'bold',
    color: theme.textColor,
  },
  savingsDate: {
    fontSize: 12,
    color: theme.secondaryTextColor,
  },
  savingsRight: {
    alignItems: 'flex-end',
  },
  savingsAmount: {
    fontSize: 16,
    fontWeight: 'bold',
    color: theme.accentColor,
    marginBottom: 5,
  },
  savingsActions: {
    flexDirection: 'row',
  },
  actionButton: {
    padding: 5,
    marginHorizontal: 5,
  },
  actionText: {
    fontSize: 16,
  },
  achievementText: {
    fontSize: 16,
    color: theme.secondaryTextColor,
    textAlign: 'center',
  },
  floatingButton: {
    position: 'absolute',
    bottom: 30,
    right: 30,
    backgroundColor: theme.accentColor,
    width: 60,
    height: 60,
    borderRadius: 30,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 8,
  },
  floatingButtonText: {
    fontSize: 30,
    color: 'white',
    fontWeight: 'bold',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: theme.cardBackgroundColor,
    borderRadius: 10,
    padding: 20,
    width: '90%',
    maxHeight: '80%',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: theme.textColor,
    marginBottom: 20,
    textAlign: 'center',
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: theme.textColor,
    marginTop: 15,
    marginBottom: 10,
  },
  periodContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 10,
  },
  periodButton: {
    padding: 10,
    borderRadius: 5,
    borderWidth: 1,
    borderColor: theme.borderColor,
    backgroundColor: theme.cardBackgroundColor,
  },
  periodButtonActive: {
    backgroundColor: theme.accentColor,
    borderColor: theme.accentColor,
  },
  periodText: {
    fontSize: 14,
    color: theme.textColor,
  },
  periodTextActive: {
    color: 'white',
  },
  deadlineContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 10,
  },
  deadlineButton: {
    padding: 10,
    borderRadius: 5,
    borderWidth: 1,
    borderColor: theme.borderColor,
    backgroundColor: theme.cardBackgroundColor,
  },
  deadlineButtonActive: {
    backgroundColor: theme.accentColor,
    borderColor: theme.accentColor,
  },
  deadlineText: {
    fontSize: 14,
    color: theme.textColor,
  },
  deadlineTextActive: {
    color: 'white',
  },
  datePickerButton: {
    padding: 10,
    borderRadius: 5,
    borderWidth: 1,
    borderColor: theme.borderColor,
    backgroundColor: theme.cardBackgroundColor,
    alignItems: 'center',
  },
  datePickerText: {
    fontSize: 16,
    color: theme.textColor,
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginTop: 20,
  },
  errorText: {
    fontSize: 16,
    color: 'red',
    textAlign: 'center',
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: theme.textColor,
    marginBottom: 15,
  },
  noGoalsText: {
    fontSize: 16,
    color: theme.secondaryTextColor,
    textAlign: 'center',
    marginTop: 10,
  },
  goalItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: theme.borderColor,
    position: 'relative',
  },
  goalInfo: {
    flex: 1,
    marginLeft: 10,
  },
  goalName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: theme.textColor,
    marginBottom: 5,
  },
  goalStatus: {
    fontSize: 14,
    color: theme.secondaryTextColor,
    marginBottom: 5,
  },
  goalNameText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: theme.textColor,
    marginBottom: 10,
    textAlign: 'center',
  },
});

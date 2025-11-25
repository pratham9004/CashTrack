
import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert, Modal, ActivityIndicator, TextInput } from 'react-native';
import PieChartComponent from '../components/PieChartComponent';
import { useNavigation } from '@react-navigation/native';
import { Picker } from '@react-native-picker/picker';
import CustomButton from '../components/CustomButton';
import InputField from '../components/InputField';
import TransactionItem from '../components/TransactionItem';
import { getExpenses, addExpense, updateExpense, deleteExpense, getExpensesRealtime, addCategory, getCategories, updateCategory, deleteCategory, getCategoriesRealtime } from '../firebase/firestoreService';
import { formatCurrency } from '../utils/helpers';
import { useSettings } from '../contexts/SettingsContext';

export default function Expenses() {
  const navigation = useNavigation();
  const { getThemeColors } = useSettings();
  const theme = getThemeColors();
  const [expenseEntries, setExpenseEntries] = useState([]);
  const [expenseCategories, setExpenseCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [newCategory, setNewCategory] = useState('');
  const [newAmount, setNewAmount] = useState('');
  const [editingItem, setEditingItem] = useState(null);
  const [editCategory, setEditCategory] = useState('');
  const [editAmount, setEditAmount] = useState('');
  const [modalVisible, setModalVisible] = useState(false);
  const [showAddForm, setShowAddForm] = useState(false);
  const [showAddCategoryModal, setShowAddCategoryModal] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [showManageCategoriesModal, setShowManageCategoriesModal] = useState(false);
  const [editingCategory, setEditingCategory] = useState(null);
  const [editCategoryName, setEditCategoryName] = useState('');
  const { settings } = useSettings();

  // Fetch expense data on component mount and set up real-time listener
  useEffect(() => {
    fetchExpenses();
    fetchExpenseCategories();

    // Set up real-time listener for expenses
    const unsubscribeExpenses = getExpensesRealtime((expenses) => {
      setExpenseEntries(expenses);
      setLoading(false);
    });

    // Set up real-time listener for categories
    const unsubscribeCategories = getCategoriesRealtime('expense', (categories) => {
      setExpenseCategories(categories);
    });

    return () => {
      unsubscribeExpenses();
      unsubscribeCategories();
    }; // Cleanup listeners on unmount
  }, []);

  const fetchExpenses = async () => {
    try {
      setLoading(true);
      const data = await getExpenses();
      setExpenseEntries(data);
      setError(null);
    } catch (err) {
      setError('Failed to load expense data');
      console.error('Error fetching expenses:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchExpenseCategories = async () => {
    try {
      const data = await getCategories('expense');
      setExpenseCategories(data);
    } catch (err) {
      console.error('Error fetching expense categories:', err);
    }
  };

  const handleAddCategory = async () => {
    if (!newCategoryName.trim()) {
      Alert.alert('Error', 'Please enter a category name');
      return;
    }

    try {
      await addCategory('expense', newCategoryName.trim());
      setNewCategoryName('');
      setShowAddCategoryModal(false);
    } catch (err) {
      Alert.alert('Error', 'Failed to add category');
      console.error('Error adding category:', err);
    }
  };

  const handleEditCategory = (category) => {
    setEditingCategory(category);
    setEditCategoryName(category.name);
  };

  const handleUpdateCategory = async () => {
    if (!editCategoryName.trim()) {
      Alert.alert('Error', 'Please enter a category name');
      return;
    }

    try {
      await updateCategory('expense', editingCategory.id, editCategoryName.trim());
      setEditingCategory(null);
      setEditCategoryName('');
    } catch (err) {
      Alert.alert('Error', 'Failed to update category');
      console.error('Error updating category:', err);
    }
  };

  const handleDeleteCategory = (category) => {
    Alert.alert(
      'Delete Category',
      `Are you sure you want to delete "${category.name}"? This will not affect existing expenses.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteCategory('expense', category.id);
            } catch (err) {
              Alert.alert('Error', 'Failed to delete category');
              console.error('Error deleting category:', err);
            }
          },
        },
      ]
    );
  };

  const handleAddExpense = async () => {
    if (!newCategory.trim() || !newAmount.trim()) {
      Alert.alert('Error', 'Please fill in all fields');
      return;
    }

    try {
      const expenseData = {
        category: newCategory.trim(),
        amount: parseFloat(newAmount),
      };
      await addExpense(expenseData);
      setNewCategory('');
      setNewAmount('');
      // No need to fetchExpenses() as real-time listener will update the state
    } catch (err) {
      Alert.alert('Error', 'Failed to add expense');
      console.error('Error adding expense:', err);
    }
  };

  const handleEditExpense = (item) => {
    setEditingItem(item);
    setEditCategory(item.category);
    setEditAmount(item.amount.toString());
    setModalVisible(true);
  };

  const handleUpdateExpense = async () => {
    if (!editCategory.trim() || !editAmount.trim()) {
      Alert.alert('Error', 'Please fill in all fields');
      return;
    }

    try {
      const expenseData = {
        category: editCategory.trim(),
        amount: parseFloat(editAmount),
      };
      await updateExpense(editingItem.id, expenseData);
      setModalVisible(false);
      setEditingItem(null);
      setEditCategory('');
      setEditAmount('');
      // No need to fetchExpenses() as real-time listener will update the state
    } catch (err) {
      Alert.alert('Error', 'Failed to update expense');
      console.error('Error updating expense:', err);
    }
  };

  const handleDeleteExpense = (item) => {
    Alert.alert(
      'Delete Expense',
      `Are you sure you want to delete "${item.category}"?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteExpense(item.id);
              // No need to fetchExpenses() as real-time listener will update the state
            } catch (err) {
              Alert.alert('Error', 'Failed to delete expense');
              console.error('Error deleting expense:', err);
            }
          },
        },
      ]
    );
  };

  const totalExpenses = expenseEntries.reduce((sum, entry) => sum + entry.amount, 0);

  // Group expenses by category for pie chart
  const categoryTotals = expenseEntries.reduce((acc, entry) => {
    acc[entry.category] = (acc[entry.category] || 0) + entry.amount;
    return acc;
  }, {});

  const pieData = Object.entries(categoryTotals).map(([category, amount], index) => ({
    name: category,
    amount,
    color: ['#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FFEAA7', '#DDA0DD'][index % 6],
    legendFontColor: theme.textColor,
    legendFontSize: 12,
  }));

  return (
    <View style={[styles.container, { backgroundColor: theme.backgroundColor }]}>
      <ScrollView showsVerticalScrollIndicator={false}>
        <Text style={[styles.header, { color: theme.accentColor }]}>💸 Expense Manager</Text>
        <Text style={[styles.subHeader, { color: theme.secondaryTextColor }]}>Track and categorize your spending</Text>
        {/* Monthly Summary */}
        <View style={[styles.summaryCard, { backgroundColor: theme.cardBackgroundColor }]}>
          <View style={styles.summaryLeft}>
            <Text style={[styles.summaryTitle, { color: theme.secondaryTextColor }]}>This Month</Text>
            <Text style={[styles.summaryAmount, { color: theme.accentColor }]}>{formatCurrency(totalExpenses, settings.currency)}</Text>
            <Text style={[styles.summarySubtitle, { color: theme.secondaryTextColor }]}>Total Expenses</Text>
          </View>
          <View style={styles.summaryRight}>
            <Text style={styles.summaryIcon}>📉</Text>
          </View>
        </View>

        {/* Expense Breakdown Pie Chart */}
        <View style={[styles.card, { backgroundColor: theme.cardBackgroundColor, shadowColor: theme.textColor }]}>
          <Text style={[styles.cardTitle, { color: theme.textColor }]}>Expense Breakdown</Text>
          {pieData.length > 0 ? (
            <PieChartComponent
              data={(() => {
                const grouped = expenseEntries.reduce((acc, item) => {
                  if (item.category) {
                    acc[item.category] = (acc[item.category] || 0) + item.amount;
                  }
                  return acc;
                }, {});
                const colors = ['#FF6B6B', '#FFE66D', '#4472CA', '#E94560', '#6BCB77', '#4D96FF'];
                return Object.entries(grouped).map(([name, amount], index) => ({
                  name,
                  amount,
                  color: colors[index % colors.length],
                }));
              })()}
              onCategoryPress={(category) => navigation.navigate('CategoryTransactions', { category, type: 'expense' })}
            />
          ) : (
            <Text style={[styles.noDataText, { color: theme.secondaryTextColor }]}>No expense data to display</Text>
          )}
        </View>

        {/* Expense Categories List */}
        <View style={[styles.card, { backgroundColor: theme.cardBackgroundColor, shadowColor: theme.textColor }]}>
          <View style={styles.cardHeader}>
            <Text style={[styles.cardTitle, { color: theme.textColor }]}>Expense Categories</Text>
            <TouchableOpacity
              style={styles.manageButton}
              onPress={() => setShowManageCategoriesModal(true)}
            >
              <Text style={styles.manageButtonText}>Manage Categories</Text>
            </TouchableOpacity>
          </View>
          {loading ? (
            <ActivityIndicator size="large" color={theme.accentColor} />
          ) : error ? (
            <Text style={styles.errorText}>{error}</Text>
          ) : expenseEntries.length > 0 ? (
            expenseEntries.map((item) => (
              <View key={item.id} style={[styles.expenseItem, { borderBottomColor: theme.borderColor }]}>
                <View style={styles.expenseLeft}>
                  <Text style={styles.expenseIcon}>
                    {item.category.toLowerCase().includes('food') ? '🍽️' :
                     item.category.toLowerCase().includes('transport') ? '🚗' :
                     item.category.toLowerCase().includes('shopping') ? '🛍️' :
                     item.category.toLowerCase().includes('entertainment') ? '🎬' :
                     item.category.toLowerCase().includes('bills') ? '💡' :
                     item.category.toLowerCase().includes('health') ? '🏥' : '💰'}
                  </Text>
                  <View>
                    <Text style={[styles.expenseTitle, { color: theme.textColor }]}>{item.category}</Text>
                    <Text style={[styles.expenseDate, { color: theme.secondaryTextColor }]}>
                      {item.timestamp ? new Date(item.timestamp.seconds * 1000).toLocaleDateString() : 'Today'}
                    </Text>
                  </View>
                </View>
                <View style={styles.expenseRight}>
                  <Text style={[styles.expenseAmount, { color: '#FF6B6B' }]}>-{formatCurrency(item.amount, settings.currency)}</Text>
                  <View style={styles.expenseActions}>
                    <TouchableOpacity
                      style={styles.actionButton}
                      onPress={() => handleEditExpense(item)}
                    >
                      <Text style={styles.actionText}>✏️</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={styles.actionButton}
                      onPress={() => handleDeleteExpense(item)}
                    >
                      <Text style={styles.actionText}>🗑️</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              </View>
            ))
          ) : (
            <Text style={[styles.noDataText, { color: theme.secondaryTextColor }]}>No expenses yet</Text>
          )}
        </View>

        {/* Insights Card */}
        <View style={[styles.card, { backgroundColor: theme.cardBackgroundColor, shadowColor: theme.textColor }]}>
          <Text style={[styles.cardTitle, { color: theme.textColor }]}>💡 Insights</Text>
          <Text style={[styles.insightText, { color: theme.secondaryTextColor }]}>
            {totalExpenses > 0 ? `Your largest expense category is ${Object.keys(categoryTotals).reduce((a, b) => categoryTotals[a] > categoryTotals[b] ? a : b, '')} with ${formatCurrency(Math.max(...Object.values(categoryTotals)), settings.currency)}.` : 'Add some expenses to see insights!'}
          </Text>
        </View>
      </ScrollView>

      {/* Floating Add Button */}
      <TouchableOpacity
        style={[styles.floatingButton, { backgroundColor: theme.accentColor }]}
        onPress={() => setShowAddForm(true)}
      >
        <Text style={styles.floatingButtonText}>+</Text>
      </TouchableOpacity>

      {/* Add Expense Modal */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={showAddForm}
        onRequestClose={() => setShowAddForm(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: theme.cardBackgroundColor }]}>
            <Text style={[styles.modalTitle, { color: theme.textColor }]}>Add New Expense</Text>
            <Picker
              selectedValue={newCategory}
              onValueChange={(itemValue) => setNewCategory(itemValue)}
              style={[styles.picker, { color: theme.textColor, borderColor: theme.borderColor }]}
            >
              <Picker.Item label="Select Category" value="" />
              {expenseCategories.map((category) => (
                <Picker.Item key={category.id} label={category.name} value={category.name} />
              ))}
            </Picker>
            <TouchableOpacity
              style={styles.addCategoryButton}
              onPress={() => setShowAddCategoryModal(true)}
            >
              <Text style={styles.addCategoryText}>+ Add New Category</Text>
            </TouchableOpacity>
            <InputField
              placeholder="Amount"
              value={newAmount}
              onChangeText={setNewAmount}
              keyboardType="numeric"
            />
            <View style={styles.modalButtons}>
              <CustomButton
                title="Cancel"
                onPress={() => {
                  setShowAddForm(false);
                  setNewCategory('');
                  setNewAmount('');
                }}
                style={{ backgroundColor: '#666' }}
              />
              <CustomButton title="Add Expense" onPress={handleAddExpense} />
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
          <View style={[styles.modalContent, { backgroundColor: theme.cardBackgroundColor }]}>
            <Text style={[styles.modalTitle, { color: theme.textColor }]}>Edit Expense</Text>
            <Picker
              selectedValue={editCategory}
              onValueChange={(itemValue) => setEditCategory(itemValue)}
              style={[styles.picker, { color: theme.textColor, borderColor: theme.borderColor }]}
            >
              <Picker.Item label="Select Category" value="" />
              {expenseCategories.map((category) => (
                <Picker.Item key={category.id} label={category.name} value={category.name} />
              ))}
            </Picker>
            <TouchableOpacity
              style={styles.addCategoryButton}
              onPress={() => setShowAddCategoryModal(true)}
            >
              <Text style={styles.addCategoryText}>+ Add New Category</Text>
            </TouchableOpacity>
            <InputField
              placeholder="Amount"
              value={editAmount}
              onChangeText={setEditAmount}
              keyboardType="numeric"
            />
            <View style={styles.modalButtons}>
              <CustomButton title="Cancel" onPress={() => setModalVisible(false)} />
              <CustomButton title="Update" onPress={handleUpdateExpense} />
            </View>
          </View>
        </View>
      </Modal>

      {/* Add Category Modal */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={showAddCategoryModal}
        onRequestClose={() => setShowAddCategoryModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: theme.cardBackgroundColor }]}>
            <Text style={[styles.modalTitle, { color: theme.textColor }]}>Add New Category</Text>
            <TextInput
              style={[styles.input, { color: theme.textColor, borderColor: theme.borderColor }]}
              placeholder="Category Name"
              placeholderTextColor={theme.secondaryTextColor}
              value={newCategoryName}
              onChangeText={setNewCategoryName}
            />
            <View style={styles.modalButtons}>
              <CustomButton
                title="Cancel"
                onPress={() => {
                  setShowAddCategoryModal(false);
                  setNewCategoryName('');
                }}
                style={{ backgroundColor: '#666' }}
              />
              <CustomButton title="Add Category" onPress={handleAddCategory} />
            </View>
          </View>
        </View>
      </Modal>

      {/* Manage Categories Modal */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={showManageCategoriesModal}
        onRequestClose={() => setShowManageCategoriesModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: theme.cardBackgroundColor }]}>
            <Text style={[styles.modalTitle, { color: theme.textColor }]}>Manage Categories</Text>
            <ScrollView style={styles.categoriesList}>
              {expenseCategories.map((category) => (
                <View key={category.id} style={[styles.categoryItem, { borderBottomColor: theme.borderColor }]}>
                  {editingCategory && editingCategory.id === category.id ? (
                    <View style={styles.editCategoryContainer}>
                      <TextInput
                        style={[styles.input, { color: theme.textColor, borderColor: theme.borderColor }]}
                        value={editCategoryName}
                        onChangeText={setEditCategoryName}
                        placeholder="Category Name"
                        placeholderTextColor={theme.secondaryTextColor}
                      />
                      <View style={styles.editButtons}>
                        <TouchableOpacity
                          style={styles.saveButton}
                          onPress={handleUpdateCategory}
                        >
                          <Text style={styles.saveText}>Save</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                          style={styles.cancelButton}
                          onPress={() => {
                            setEditingCategory(null);
                            setEditCategoryName('');
                          }}
                        >
                          <Text style={styles.cancelText}>Cancel</Text>
                        </TouchableOpacity>
                      </View>
                    </View>
                  ) : (
                    <View style={styles.categoryRow}>
                      <Text style={[styles.categoryName, { color: theme.textColor }]}>{category.name}</Text>
                      <View style={styles.categoryActions}>
                        <TouchableOpacity
                          style={styles.actionButton}
                          onPress={() => handleEditCategory(category)}
                        >
                          <Text style={styles.actionText}>✏️</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                          style={styles.actionButton}
                          onPress={() => handleDeleteCategory(category)}
                        >
                          <Text style={styles.actionText}>🗑️</Text>
                        </TouchableOpacity>
                      </View>
                    </View>
                  )}
                </View>
              ))}
            </ScrollView>
            <View style={styles.modalButtons}>
              <CustomButton
                title="Close"
                onPress={() => setShowManageCategoriesModal(false)}
                style={{ backgroundColor: '#666' }}
              />
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
    padding: 20,
  },
  header: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#FF6B6B',
    textAlign: 'center',
    marginBottom: 5,
  },
  subHeader: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginBottom: 25,
  },
  summaryCard: {
    backgroundColor: '#FFE8E8',
    borderRadius: 15,
    padding: 20,
    marginBottom: 20,
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  summaryLeft: {
    flex: 1,
  },
  summaryTitle: {
    fontSize: 14,
    color: '#666',
    marginBottom: 5,
  },
  summaryAmount: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#FF6B6B',
    marginBottom: 5,
  },
  summarySubtitle: {
    fontSize: 12,
    color: '#666',
  },
  summaryRight: {
    marginLeft: 10,
  },
  summaryIcon: {
    fontSize: 40,
  },
  card: {
    backgroundColor: 'white',
    borderRadius: 15,
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
    color: '#333',
    marginBottom: 15,
  },
  chart: {
    marginVertical: 8,
    borderRadius: 16,
  },
  expenseItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  expenseLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  expenseIcon: {
    fontSize: 24,
    marginRight: 12,
  },
  expenseTitle: {
    fontSize: 16,
    fontWeight: '500',
    color: '#333',
  },
  expenseDate: {
    fontSize: 12,
    color: '#666',
    marginTop: 2,
  },
  expenseRight: {
    alignItems: 'flex-end',
  },
  expenseAmount: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#FF6B6B',
    marginBottom: 5,
  },
  expenseActions: {
    flexDirection: 'row',
  },
  actionButton: {
    padding: 5,
    marginLeft: 5,
  },
  actionText: {
    fontSize: 16,
  },
  noDataText: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginTop: 20,
  },
  insightText: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
  },
  errorText: {
    color: 'red',
    textAlign: 'center',
    fontSize: 16,
  },
  floatingButton: {
    position: 'absolute',
    bottom: 30,
    right: 30,
    backgroundColor: '#FF6B6B',
    width: 60,
    height: 60,
    borderRadius: 30,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 5,
  },
  floatingButtonText: {
    color: 'white',
    fontSize: 24,
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
    borderRadius: 15,
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
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 15,
  },
  manageButton: {
    paddingHorizontal: 4,
    paddingVertical: 4,
    backgroundColor: '#FF6B6B',
    borderRadius: 5,
    marginLeft: 10,
  },
  manageButtonText: {
    color: 'white',
    fontSize: 14,
    fontWeight: 'bold',
  },
  input: {
    borderWidth: 1,
    borderRadius: 5,
    padding: 10,
    marginBottom: 10,
    fontSize: 16,
  },
  categoriesList: {
    maxHeight: 300,
  },
  categoryItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
  },
  editCategoryContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  editButtons: {
    flexDirection: 'row',
    marginLeft: 10,
  },
  saveButton: {
    backgroundColor: '#4CAF50',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 5,
    marginRight: 5,
  },
  saveText: {
    color: 'white',
    fontSize: 14,
    fontWeight: 'bold',
  },
  cancelButton: {
    backgroundColor: '#f44336',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 5,
  },
  cancelText: {
    color: 'white',
    fontSize: 14,
    fontWeight: 'bold',
  },
  categoryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    flex: 1,
  },
  categoryName: {
    fontSize: 16,
    fontWeight: '500',
  },
  categoryActions: {
    flexDirection: 'row',
  },
  addCategoryButton: {
    backgroundColor: '#FF6B6B',
    paddingHorizontal: 15,
    paddingVertical: 10,
    borderRadius: 5,
    marginBottom: 15,
    alignItems: 'center',
  },
  addCategoryButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
  picker: {
    height: 50,
    width: '100%',
    marginBottom: 20,
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 10,
  },
  addCategoryText: {
    color: '#333',
    fontSize: 16,
  },
});

import React, { useState, useEffect, useMemo } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, Modal, TextInput } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { LineChart } from 'react-native-chart-kit';
import { Picker } from '@react-native-picker/picker';
import CustomButton from '../components/CustomButton';
import InputField from '../components/InputField';
import PieChartComponent from '../components/PieChartComponent';
import { getIncome, addIncome, updateIncome, deleteIncome, getIncomeRealtime, getCategories, addCategory, updateCategory, deleteCategory, getCategoriesRealtime } from '../firebase/firestoreService';
import { formatCurrency } from '../utils/helpers';
import { useSettings } from '../contexts/SettingsContext';


export default function Income() {
  const navigation = useNavigation();
  const { getThemeColors } = useSettings();
  const theme = getThemeColors();
  const [incomeEntries, setIncomeEntries] = useState([]);
  const [incomeCategories, setIncomeCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [newCategory, setNewCategory] = useState('');
  const [newAmount, setNewAmount] = useState('');
  const [editingItem, setEditingItem] = useState(null);
  const [editSource, setEditSource] = useState('');
  const [editAmount, setEditAmount] = useState('');
  const [modalVisible, setModalVisible] = useState(false);
  const [showAddForm, setShowAddForm] = useState(false);
  const [showAddCategoryModal, setShowAddCategoryModal] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [showManageCategoriesModal, setShowManageCategoriesModal] = useState(false);
  const [editingCategory, setEditingCategory] = useState(null);
  const [editCategoryName, setEditCategoryName] = useState('');
  const { settings } = useSettings();

  // Fetch income data on component mount and set up real-time listener
  useEffect(() => {
    fetchIncome();
    fetchIncomeCategories();

    // Set up real-time listener for income
    const unsubscribeIncome = getIncomeRealtime((income) => {
      setIncomeEntries(income);
      setLoading(false);
    });

    // Set up real-time listener for categories
    const unsubscribeCategories = getCategoriesRealtime('income', (categories) => {
      setIncomeCategories(categories);
    });

    return () => {
      unsubscribeIncome();
      unsubscribeCategories();
    }; // Cleanup listeners on unmount
  }, []);

  const fetchIncome = async () => {
    try {
      setLoading(true);
      const data = await getIncome();
      setIncomeEntries(data);
      setError(null);
    } catch (err) {
      setError('Failed to load income data');
      console.error('Error fetching income:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchIncomeCategories = async () => {
    try {
      const categories = await getCategories('income');
      setIncomeCategories(categories);
    } catch (err) {
      console.error('Error fetching income categories:', err);
    }
  };

  const handleAddIncome = async () => {
    if (!newCategory.trim() || !newAmount.trim()) {
      Alert.alert('Error', 'Please fill in all fields');
      return;
    }

    try {
      const incomeData = {
        category: newCategory.trim(),
        amount: parseFloat(newAmount),
      };
      await addIncome(incomeData);
      setNewCategory('');
      setNewAmount('');
      // No need to fetchIncome() as real-time listener will update the state
    } catch (err) {
      Alert.alert('Error', 'Failed to add income');
      console.error('Error adding income:', err);
    }
  };

  const handleEditIncome = (item) => {
    setEditingItem(item);
    setEditSource(item.category);
    setEditAmount(item.amount.toString());
    setModalVisible(true);
  };

  const handleUpdateIncome = async () => {
    if (!editSource.trim() || !editAmount.trim()) {
      Alert.alert('Error', 'Please fill in all fields');
      return;
    }

    try {
      const incomeData = {
        category: editSource.trim(),
        amount: parseFloat(editAmount),
      };
      await updateIncome(editingItem.id, incomeData);
      setModalVisible(false);
      setEditingItem(null);
      setEditSource('');
      setEditAmount('');
      // No need to fetchIncome() as real-time listener will update the state
    } catch (err) {
      Alert.alert('Error', 'Failed to update income');
      console.error('Error updating income:', err);
    }
  };

  const handleDeleteIncome = (item) => {
    Alert.alert(
      'Delete Income',
      `Are you sure you want to delete "${item.category}"?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteIncome(item.id);
              // No need to fetchIncome() as real-time listener will update the state
            } catch (err) {
              Alert.alert('Error', 'Failed to delete income');
              console.error('Error deleting income:', err);
            }
          },
        },
      ]
    );
  };

  const handleAddCategory = async () => {
    if (!newCategoryName.trim()) {
      Alert.alert('Error', 'Please enter a category name');
      return;
    }

    try {
      await addCategory('income', newCategoryName.trim());
      setNewCategoryName('');
      setShowAddCategoryModal(false);
      // Real-time listener will update the categories
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
      await updateCategory('income', editingCategory.id, editCategoryName.trim());
      setEditingCategory(null);
      setEditCategoryName('');
      // Real-time listener will update the categories
    } catch (err) {
      Alert.alert('Error', 'Failed to update category');
      console.error('Error updating category:', err);
    }
  };

  const handleDeleteCategory = (category) => {
    Alert.alert(
      'Delete Category',
      `Are you sure you want to delete "${category.name}"? This will not affect existing income entries.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteCategory('income', category.id);
              // Real-time listener will update the categories
            } catch (err) {
              Alert.alert('Error', 'Failed to delete category');
              console.error('Error deleting category:', err);
            }
          },
        },
      ]
    );
  };

  const totalIncome = incomeEntries.reduce((sum, entry) => sum + entry.amount, 0);

  const chartData = useMemo(() => {
    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();

    // Initialize weekly totals
    const weeklyTotals = [0, 0, 0, 0];

    incomeEntries.forEach(entry => {
      const entryDate = entry.timestamp ? new Date(entry.timestamp.seconds * 1000) : new Date();
      if (entryDate.getMonth() === currentMonth && entryDate.getFullYear() === currentYear) {
        const day = entryDate.getDate();
        let weekIndex;
        if (day <= 7) weekIndex = 0;
        else if (day <= 14) weekIndex = 1;
        else if (day <= 21) weekIndex = 2;
        else weekIndex = 3;
        weeklyTotals[weekIndex] += entry.amount;
      }
    });

    return {
      labels: ['Week 1', 'Week 2', 'Week 3', 'Week 4'],
      datasets: [{
        data: weeklyTotals,
      }],
    };
  }, [incomeEntries]);

  return (
    <View style={[styles.container, { backgroundColor: theme.backgroundColor }]}>
      <ScrollView showsVerticalScrollIndicator={false}>
        <Text style={[styles.header, { color: theme.accentColor }]}>💰 Income Tracker</Text>
        <Text style={[styles.subHeader, { color: theme.secondaryTextColor }]}>Track your earnings and income sources</Text>
        {/* Monthly Summary */}
        <View style={[styles.summaryCard, { backgroundColor: theme.cardBackgroundColor }]}>
          <View style={styles.summaryLeft}>
            <Text style={[styles.summaryTitle, { color: theme.secondaryTextColor }]}>This Month</Text>
            <Text style={[styles.summaryAmount, { color: theme.accentColor }]}>{formatCurrency(totalIncome, settings.currency)}</Text>
            <Text style={[styles.summarySubtitle, { color: theme.secondaryTextColor }]}>Total Income</Text>
          </View>
          <View style={styles.summaryRight}>
            <Text style={styles.summaryIcon}>📈</Text>
          </View>
        </View>

        {/* Income Pie Chart */}
        <PieChartComponent
          data={(() => {
            const grouped = incomeEntries.reduce((acc, item) => {
              if (item.category) {
                acc[item.category] = (acc[item.category] || 0) + item.amount;
              }
              return acc;
            }, {});
            const colors = ['#228B22', '#4ECDC4', '#45B7D1', '#96CEB4', '#A4DE02', '#FF9F1C'];
            return Object.entries(grouped).map(([name, amount], index) => ({
              name,
              amount,
              color: colors[index % colors.length],
            }));
          })()}
          onCategoryPress={(category) => {
            const normalizedCategory = category.trim();
            console.log('Navigating to CategoryTransactions with category:', normalizedCategory);
            navigation.navigate('CategoryTransactions', { category: normalizedCategory, type: 'income' });
          }}
        />

        {/* Income Trend Chart */}
        <View style={[styles.card, { backgroundColor: theme.cardBackgroundColor, shadowColor: theme.textColor }]}>
          <Text style={[styles.cardTitle, { color: theme.textColor }]}>Income Trend</Text>
          <LineChart
            key={JSON.stringify(chartData)}
            data={chartData}
            width={300}
            height={200}
            chartConfig={{
              backgroundColor: theme.cardBackgroundColor,
              backgroundGradientFrom: theme.cardBackgroundColor,
              backgroundGradientTo: theme.cardBackgroundColor,
              decimalPlaces: 0,
              color: (opacity = 1) => `rgba(52, 168, 83, ${opacity})`,
              labelColor: (opacity = 1) => theme.textColor,
              style: { borderRadius: 16 },
            }}
            bezier
            style={styles.chart}
          />
        </View>

        {/* Income Sources List */}
        <View style={[styles.card, { backgroundColor: theme.cardBackgroundColor, shadowColor: theme.textColor }]}>
          <View style={styles.cardHeader}>
            <Text style={[styles.cardTitle, { color: theme.textColor }]}>Income Sources</Text>
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
          ) : incomeEntries.length > 0 ? (
            incomeEntries.map((item) => (
              <View key={item.id} style={[styles.incomeItem, { borderBottomColor: theme.borderColor }]}>
                <View style={styles.incomeLeft}>
                  <Text style={styles.incomeIcon}>
                    {item.category && item.category.toLowerCase().includes('salary') ? '💼' :
                     item.category && item.category.toLowerCase().includes('freelance') ? '💻' :
                     item.category && item.category.toLowerCase().includes('business') ? '🏢' : '💰'}
                  </Text>
                  <View>
                    <Text style={[styles.incomeTitle, { color: theme.textColor }]}>{item.category}</Text>
                    <Text style={[styles.incomeDate, { color: theme.secondaryTextColor }]}>
                      {item.timestamp ? new Date(item.timestamp.seconds * 1000).toLocaleDateString() : 'Today'}
                    </Text>
                  </View>
                </View>
                <View style={styles.incomeRight}>
                  <Text style={[styles.incomeAmount, { color: theme.accentColor }]}>{formatCurrency(item.amount, settings.currency)}</Text>
                  <View style={styles.incomeActions}>
                    <TouchableOpacity
                      style={styles.actionButton}
                      onPress={() => handleEditIncome(item)}
                    >
                      <Text style={styles.actionText}>✏️</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={styles.actionButton}
                      onPress={() => handleDeleteIncome(item)}
                    >
                      <Text style={styles.actionText}>🗑️</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              </View>
            ))
          ) : (
            <Text style={[styles.noDataText, { color: theme.secondaryTextColor }]}>No income entries yet</Text>
          )}
        </View>
      </ScrollView>

      {/* Floating Add Button */}
      <TouchableOpacity
        style={[styles.floatingButton, { backgroundColor: theme.accentColor }]}
        onPress={() => setShowAddForm(true)}
      >
        <Text style={styles.floatingButtonText}>+</Text>
      </TouchableOpacity>

      {/* Add Income Modal */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={showAddForm}
        onRequestClose={() => setShowAddForm(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: theme.cardBackgroundColor }]}>
            <Text style={[styles.modalTitle, { color: theme.textColor }]}>Add New Income</Text>
            <Picker
              selectedValue={newCategory}
              onValueChange={(itemValue) => setNewCategory(itemValue)}
              style={[styles.picker, { color: theme.textColor, borderColor: theme.borderColor }]}
            >
              <Picker.Item label="Select Category" value="" />
              {incomeCategories.map((category) => (
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
              <CustomButton title="Add Income" onPress={handleAddIncome} />
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
            <Text style={[styles.modalTitle, { color: theme.textColor }]}>Edit Income</Text>
            <Picker
              selectedValue={editSource}
              onValueChange={(itemValue) => setEditSource(itemValue)}
              style={[styles.picker, { color: theme.textColor, borderColor: theme.borderColor }]}
            >
              <Picker.Item label="Select Category" value="" />
              {incomeCategories.map((category) => (
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
              <CustomButton title="Update" onPress={handleUpdateIncome} />
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
              {incomeCategories.map((category) => (
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
    color: '#34A853',
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
    backgroundColor: '#E8F5E8',
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
    color: '#34A853',
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
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 15,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  manageButton: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    backgroundColor: '#34A853',
    borderRadius: 5,
  },
  manageButtonText: {
    color: 'white',
    fontSize: 14,
    fontWeight: 'bold',
  },
  chart: {
    marginVertical: 8,
    borderRadius: 16,
  },
  incomeItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  incomeLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  incomeIcon: {
    fontSize: 24,
    marginRight: 12,
  },
  incomeTitle: {
    fontSize: 16,
    fontWeight: '500',
    color: '#333',
  },
  incomeDate: {
    fontSize: 12,
    color: '#666',
    marginTop: 2,
  },
  incomeRight: {
    alignItems: 'flex-end',
  },
  incomeAmount: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#34A853',
    marginBottom: 5,
  },
  incomeActions: {
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
  errorText: {
    color: 'red',
    textAlign: 'center',
    fontSize: 16,
  },
  floatingButton: {
    position: 'absolute',
    bottom: 30,
    right: 30,
    backgroundColor: '#34A853',
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
  picker: {
    height: 50,
    width: '100%',
    marginBottom: 20,
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 10,
  },
  addCategoryButton: {
    marginBottom: 20,
    padding: 10,
    backgroundColor: '#34A853',
    borderRadius: 5,
    alignItems: 'center',
  },
  addCategoryText: {
    color: 'white',
    fontSize: 16,
  },
  categoriesList: {
    maxHeight: 300,
    marginBottom: 20,
  },
  categoryItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
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
    backgroundColor: '#34A853',
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
    backgroundColor: '#666',
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
    color: '#333',
  },
  categoryActions: {
    flexDirection: 'row',
  },
});

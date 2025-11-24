import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert, Modal, ActivityIndicator, FlatList } from 'react-native';
import { createMaterialTopTabNavigator } from '@react-navigation/material-top-tabs';
import CustomButton from '../components/CustomButton';
import InputField from '../components/InputField';
import { addCategory, getCategories, updateCategory, deleteCategory, getCategoriesRealtime } from '../firebase/firestoreService';
import { useSettings } from '../contexts/SettingsContext';

const Tab = createMaterialTopTabNavigator();

const CategoryTab = ({ type, theme }) => {
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [editingItem, setEditingItem] = useState(null);
  const [editName, setEditName] = useState('');
  const [modalVisible, setModalVisible] = useState(false);
  const [showAddForm, setShowAddForm] = useState(false);

  useEffect(() => {
    fetchCategories();

    // Set up real-time listener
    const unsubscribe = getCategoriesRealtime(type, (cats) => {
      setCategories(cats);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [type]);

  const fetchCategories = async () => {
    try {
      setLoading(true);
      const data = await getCategories(type);
      setCategories(data);
      setError(null);
    } catch (err) {
      setError('Failed to load categories');
      console.error('Error fetching categories:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleAddCategory = async () => {
    if (!newCategoryName.trim()) {
      Alert.alert('Error', 'Please enter a category name');
      return;
    }

    try {
      await addCategory(type, newCategoryName.trim());
      setNewCategoryName('');
      setShowAddForm(false);
    } catch (err) {
      Alert.alert('Error', 'Failed to add category');
      console.error('Error adding category:', err);
    }
  };

  const handleEditCategory = (item) => {
    setEditingItem(item);
    setEditName(item.name);
    setModalVisible(true);
  };

  const handleUpdateCategory = async () => {
    if (!editName.trim()) {
      Alert.alert('Error', 'Please enter a category name');
      return;
    }

    try {
      await updateCategory(type, editingItem.id, editName.trim());
      setModalVisible(false);
      setEditingItem(null);
      setEditName('');
    } catch (err) {
      Alert.alert('Error', 'Failed to update category');
      console.error('Error updating category:', err);
    }
  };

  const handleDeleteCategory = (item) => {
    Alert.alert(
      'Delete Category',
      `Are you sure you want to delete "${item.name}"? This will not affect existing transactions.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteCategory(type, item.id);
            } catch (err) {
              Alert.alert('Error', 'Failed to delete category');
              console.error('Error deleting category:', err);
            }
          },
        },
      ]
    );
  };

  const renderCategoryItem = ({ item }) => (
    <View style={[styles.categoryItem, { borderBottomColor: theme.borderColor }]}>
      <View style={styles.categoryLeft}>
        <Text style={[styles.categoryName, { color: theme.textColor }]}>{item.name}</Text>
      </View>
      <View style={styles.categoryActions}>
        <TouchableOpacity
          style={styles.actionButton}
          onPress={() => handleEditCategory(item)}
        >
          <Text style={styles.actionText}>✏️</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.actionButton}
          onPress={() => handleDeleteCategory(item)}
        >
          <Text style={styles.actionText}>🗑️</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  return (
    <View style={[styles.container, { backgroundColor: theme.backgroundColor }]}>
      <ScrollView showsVerticalScrollIndicator={false}>
        <Text style={[styles.header, { color: theme.accentColor }]}>
          {type === 'income' ? '💰 Income Categories' : '💸 Expense Categories'}
        </Text>
        <Text style={[styles.subHeader, { color: theme.secondaryTextColor }]}>
          Manage your {type} categories
        </Text>

        {/* Categories List */}
        <View style={[styles.card, { backgroundColor: theme.cardBackgroundColor, shadowColor: theme.textColor }]}>
          <Text style={[styles.cardTitle, { color: theme.textColor }]}>Categories</Text>
          {loading ? (
            <ActivityIndicator size="large" color={theme.accentColor} />
          ) : error ? (
            <Text style={styles.errorText}>{error}</Text>
          ) : categories.length > 0 ? (
            <FlatList
              data={categories}
              renderItem={renderCategoryItem}
              keyExtractor={(item) => item.id}
              scrollEnabled={false}
            />
          ) : (
            <Text style={[styles.noDataText, { color: theme.secondaryTextColor }]}>
              No categories yet. Add your first category below.
            </Text>
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

      {/* Add Category Modal */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={showAddForm}
        onRequestClose={() => setShowAddForm(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: theme.cardBackgroundColor }]}>
            <Text style={[styles.modalTitle, { color: theme.textColor }]}>
              Add New {type === 'income' ? 'Income' : 'Expense'} Category
            </Text>
            <InputField
              placeholder="Category Name (e.g., Salary, Food)"
              value={newCategoryName}
              onChangeText={setNewCategoryName}
            />
            <View style={styles.modalButtons}>
              <CustomButton
                title="Cancel"
                onPress={() => {
                  setShowAddForm(false);
                  setNewCategoryName('');
                }}
                style={{ backgroundColor: '#666' }}
              />
              <CustomButton title="Add Category" onPress={handleAddCategory} />
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
            <Text style={[styles.modalTitle, { color: theme.textColor }]}>
              Edit {type === 'income' ? 'Income' : 'Expense'} Category
            </Text>
            <InputField
              placeholder="Category Name"
              value={editName}
              onChangeText={setEditName}
            />
            <View style={styles.modalButtons}>
              <CustomButton title="Cancel" onPress={() => setModalVisible(false)} />
              <CustomButton title="Update" onPress={handleUpdateCategory} />
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
};

export default function ManageCategories() {
  const { getThemeColors } = useSettings();
  const theme = getThemeColors();

  return (
    <Tab.Navigator
      screenOptions={{
        tabBarActiveTintColor: theme.accentColor,
        tabBarInactiveTintColor: theme.secondaryTextColor,
        tabBarStyle: { backgroundColor: theme.cardBackgroundColor },
        tabBarIndicatorStyle: { backgroundColor: theme.accentColor },
      }}
    >
      <Tab.Screen name="Income" children={() => <CategoryTab type="income" theme={theme} />} />
      <Tab.Screen name="Expenses" children={() => <CategoryTab type="expense" theme={theme} />} />
    </Tab.Navigator>
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
  categoryItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  categoryLeft: {
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
});

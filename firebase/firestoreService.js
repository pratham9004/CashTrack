import { getFirestore, collection, addDoc, getDocs, doc, getDoc, updateDoc, deleteDoc, query, orderBy, serverTimestamp, setDoc, onSnapshot, limit, where } from 'firebase/firestore';
import { auth } from './firebaseConfig';

// Initialize Firestore
const db = getFirestore();

// Get current user ID
const getCurrentUserId = () => {
  const user = auth.currentUser;
  if (!user) throw new Error('User not authenticated');
  return user.uid;
};

// Income functions
export const addIncome = async (incomeData) => {
  const userId = getCurrentUserId();

  try {
    const docRef = await addDoc(collection(db, 'users', userId, 'income'), {
      category: incomeData.category,
      amount: incomeData.amount,
      timestamp: serverTimestamp(),
    });
    return docRef.id;
  } catch (error) {
    console.error('Error adding income:', error);
    throw error;
  }
};

export const getIncome = async () => {
  const userId = getCurrentUserId();

  try {
    const q = query(collection(db, 'users', userId, 'income'), orderBy('timestamp', 'desc'));
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  } catch (error) {
    console.error('Error getting income:', error);
    throw error;
  }
};

export const updateIncome = async (incomeId, incomeData) => {
  const userId = getCurrentUserId();
  if (!userId) throw new Error('User not authenticated');

  try {
    const docRef = doc(db, 'users', userId, 'income', incomeId);
    await updateDoc(docRef, {
      category: incomeData.category,
      amount: incomeData.amount,
    });
  } catch (error) {
    console.error('Error updating income:', error);
    throw error;
  }
};

export const deleteIncome = async (incomeId) => {
  const userId = getCurrentUserId();
  if (!userId) throw new Error('User not authenticated');

  try {
    const docRef = doc(db, 'users', userId, 'income', incomeId);
    await deleteDoc(docRef);
  } catch (error) {
    console.error('Error deleting income:', error);
    throw error;
  }
};

// Expense functions
export const addExpense = async (expenseData) => {
  const userId = getCurrentUserId();

  try {
    const docRef = await addDoc(collection(db, 'users', userId, 'expenses'), {
      ...expenseData,
      timestamp: serverTimestamp(),
    });
    return docRef.id;
  } catch (error) {
    console.error('Error adding expense:', error);
    throw error;
  }
};

export const getExpenses = async () => {
  const userId = getCurrentUserId();

  try {
    const q = query(collection(db, 'users', userId, 'expenses'), orderBy('timestamp', 'desc'));
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  } catch (error) {
    console.error('Error getting expenses:', error);
    throw error;
  }
};

export const updateExpense = async (expenseId, expenseData) => {
  const userId = getCurrentUserId();
  if (!userId) throw new Error('User not authenticated');

  try {
    const docRef = doc(db, 'users', userId, 'expenses', expenseId);
    await updateDoc(docRef, expenseData);
  } catch (error) {
    console.error('Error updating expense:', error);
    throw error;
  }
};

export const deleteExpense = async (expenseId) => {
  const userId = getCurrentUserId();
  if (!userId) throw new Error('User not authenticated');

  try {
    const docRef = doc(db, 'users', userId, 'expenses', expenseId);
    await deleteDoc(docRef);
  } catch (error) {
    console.error('Error deleting expense:', error);
    throw error;
  }
};

// Savings functions
export const addSavings = async (savingsData) => {
  const userId = getCurrentUserId();

  try {
    const docRef = await addDoc(collection(db, 'users', userId, 'savings'), {
      ...savingsData,
      timestamp: serverTimestamp(),
    });
    return docRef.id;
  } catch (error) {
    console.error('Error adding savings:', error);
    throw error;
  }
};

export const getSavings = async () => {
  const userId = getCurrentUserId();

  try {
    const q = query(collection(db, 'users', userId, 'savings'), orderBy('timestamp', 'desc'));
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  } catch (error) {
    console.error('Error getting savings:', error);
    throw error;
  }
};

export const updateSavings = async (savingsId, savingsData) => {
  const userId = getCurrentUserId();
  if (!userId) throw new Error('User not authenticated');

  try {
    const docRef = doc(db, 'users', userId, 'savings', savingsId);
    await updateDoc(docRef, savingsData);
  } catch (error) {
    console.error('Error updating savings:', error);
    throw error;
  }
};

export const deleteSavings = async (savingsId) => {
  const userId = getCurrentUserId();
  if (!userId) throw new Error('User not authenticated');

  try {
    const docRef = doc(db, 'users', userId, 'savings', savingsId);
    await deleteDoc(docRef);
  } catch (error) {
    console.error('Error deleting savings:', error);
    throw error;
  }
};

// Get user profile
export const getUserProfile = async () => {
  const userId = getCurrentUserId();
  if (!userId) throw new Error('User not authenticated');

  try {
    const docRef = doc(db, 'users', userId);
    const docSnap = await getDoc(docRef);
    return docSnap.exists() ? docSnap.data() : null;
  } catch (error) {
    console.error('Error getting user profile:', error);
    throw error;
  }
};

// Update user profile (for savings goal)
export const updateUserProfile = async (profileData) => {
  const userId = getCurrentUserId();
  if (!userId) throw new Error('User not authenticated');

  try {
    const docRef = doc(db, 'users', userId);
    const docSnap = await getDoc(docRef);
    if (docSnap.exists()) {
      await updateDoc(docRef, profileData);
    } else {
      // Create the document if it doesn't exist
      await setDoc(docRef, profileData);
    }
  } catch (error) {
    console.error('Error updating user profile:', error);
    throw error;
  }
};

// Get savings goal
export const getSavingsGoal = async () => {
  const profile = await getUserProfile();
  return profile?.savingsGoal || 0;
};

// Update savings goal
export const updateSavingsGoal = async (goal) => {
  await updateUserProfile({ savingsGoal: goal });
};

// Get user settings
export const getUserSettings = async () => {
  const userId = getCurrentUserId();
  if (!userId) throw new Error('User not authenticated');

  try {
    const docRef = doc(db, 'users', userId);
    const docSnap = await getDoc(docRef);
    const data = docSnap.exists() ? docSnap.data() : {};
    return {
      currency: data.currency || 'INR',
      theme: data.theme || 'light',
      notifications: data.notifications !== undefined ? data.notifications : true,
    };
  } catch (error) {
    console.error('Error getting user settings:', error);
    throw error;
  }
};

// Update user settings
export const updateUserSettings = async (settings) => {
  const userId = getCurrentUserId();
  if (!userId) throw new Error('User not authenticated');

  try {
    const docRef = doc(db, 'users', userId);
    const docSnap = await getDoc(docRef);
    if (docSnap.exists()) {
      await updateDoc(docRef, settings);
    } else {
      await setDoc(docRef, settings);
    }
  } catch (error) {
    console.error('Error updating user settings:', error);
    throw error;
  }
};

// Savings goals functions
export const addSavingsGoal = async (goalData) => {
  const userId = getCurrentUserId();

  try {
    const docRef = await addDoc(collection(db, 'users', userId, 'savingsGoals'), {
      goalName: goalData.name,
      targetAmount: goalData.amount,
      savedAmount: goalData.savedAmount || 0,
      durationType: goalData.durationType,
      goalDeadline: goalData.goalDeadline,
      status: 'ongoing',
      userId: userId,
      timestamp: serverTimestamp(),
    });
    return docRef.id;
  } catch (error) {
    console.error('Error adding savings goal:', error);
    throw error;
  }
};

export const getSavingsGoals = async () => {
  const userId = getCurrentUserId();

  try {
    const q = query(collection(db, 'users', userId, 'savingsGoals'), orderBy('timestamp', 'desc'));
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  } catch (error) {
    console.error('Error getting savings goals:', error);
    throw error;
  }
};

export const updateSavingsGoalDoc = async (goalId, goalData) => {
  const userId = getCurrentUserId();
  if (!userId) throw new Error('User not authenticated');

  try {
    const docRef = doc(db, 'users', userId, 'savingsGoals', goalId);
    await updateDoc(docRef, goalData);
  } catch (error) {
    console.error('Error updating savings goal:', error);
    throw error;
  }
};

export const deleteSavingsGoal = async (goalId) => {
  const userId = getCurrentUserId();
  if (!userId) throw new Error('User not authenticated');

  try {
    const docRef = doc(db, 'users', userId, 'savingsGoals', goalId);
    await deleteDoc(docRef);
  } catch (error) {
    console.error('Error deleting savings goal:', error);
    throw error;
  }
};

export const archiveSavingsGoal = async (goalId) => {
  const userId = getCurrentUserId();
  if (!userId) throw new Error('User not authenticated');

  try {
    const docRef = doc(db, 'users', userId, 'savingsGoals', goalId);
    await updateDoc(docRef, { status: 'archived' });
  } catch (error) {
    console.error('Error archiving savings goal:', error);
    throw error;
  }
};

export const notAchievedSavingsGoal = async (goalId) => {
  const userId = getCurrentUserId();
  if (!userId) throw new Error('User not authenticated');

  try {
    const docRef = doc(db, 'users', userId, 'savingsGoals', goalId);
    await updateDoc(docRef, { status: 'not achieved' });
  } catch (error) {
    console.error('Error marking savings goal as not achieved:', error);
    throw error;
  }
};

// Real-time income listener
export const getIncomeRealtime = (callback) => {
  const userId = getCurrentUserId();
  if (!userId) throw new Error('User not authenticated');

  const q = query(collection(db, 'users', userId, 'income'), orderBy('timestamp', 'desc'));

  return onSnapshot(q, (snapshot) => {
    const income = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    callback(income);
  }, (error) => {
    console.error('Error listening to income:', error);
  });
};

// Real-time savings goals listener
export const getSavingsGoalsRealtime = (callback) => {
  const userId = getCurrentUserId();
  if (!userId) throw new Error('User not authenticated');

  const q = query(collection(db, 'users', userId, 'savingsGoals'), orderBy('timestamp', 'desc'));

  return onSnapshot(q, (snapshot) => {
    const goals = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    callback(goals);
  }, (error) => {
    console.error('Error listening to savings goals:', error);
  });
};

// Real-time savings listener
export const getSavingsRealtime = (callback) => {
  const userId = getCurrentUserId();
  if (!userId) throw new Error('User not authenticated');

  const q = query(collection(db, 'users', userId, 'savings'), orderBy('timestamp', 'desc'));

  return onSnapshot(q, (snapshot) => {
    const savings = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    callback(savings);
  }, (error) => {
    console.error('Error listening to savings:', error);
  });
};

// Real-time expenses listener
export const getExpensesRealtime = (callback) => {
  const userId = getCurrentUserId();
  if (!userId) throw new Error('User not authenticated');

  const q = query(collection(db, 'users', userId, 'expenses'), orderBy('timestamp', 'desc'));

  return onSnapshot(q, (snapshot) => {
    const expenses = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    callback(expenses);
  }, (error) => {
    console.error('Error listening to expenses:', error);
  });
};

// Update goal status based on deadline
export const updateGoalStatus = async (goalId) => {
  const userId = getCurrentUserId();
  if (!userId) throw new Error('User not authenticated');

  try {
    const docRef = doc(db, 'users', userId, 'savingsGoals', goalId);
    const docSnap = await getDoc(docRef);

    if (docSnap.exists()) {
      const goal = docSnap.data();
      const now = new Date();
      const deadline = goal.goalDeadline?.toDate ? goal.goalDeadline.toDate() : new Date(goal.goalDeadline);

      if (now >= deadline && goal.status !== 'completed') {
        await updateDoc(docRef, { status: 'completed' });
      }
    }
  } catch (error) {
    console.error('Error updating goal status:', error);
    throw error;
  }
};

// Add savings to goal (only update goal savedAmount, no savings entry)
export const addSavingsToGoal = async (goalId, additionalAmount) => {
  const userId = getCurrentUserId();
  if (!userId) throw new Error('User not authenticated');

  try {
    const goalDocRef = doc(db, 'users', userId, 'savingsGoals', goalId);
    const goalSnap = await getDoc(goalDocRef);

    if (!goalSnap.exists()) throw new Error('Goal not found');

    const goal = goalSnap.data();
    const newSavedAmount = (goal.savedAmount || 0) + additionalAmount;

    // Update goal savedAmount
    await updateDoc(goalDocRef, { savedAmount: newSavedAmount });

    return newSavedAmount;
  } catch (error) {
    console.error('Error adding savings to goal:', error);
    throw error;
  }
};

// Reset app data (delete all income, expenses, savings, and savings goals, but keep profile and settings)
export const resetAppData = async () => {
  const userId = getCurrentUserId();

  try {
    // Delete all income
    const incomeSnapshot = await getDocs(collection(db, 'users', userId, 'income'));
    const incomeDeletes = incomeSnapshot.docs.map(doc => deleteDoc(doc.ref));
    await Promise.all(incomeDeletes);

    // Delete all expenses
    const expenseSnapshot = await getDocs(collection(db, 'users', userId, 'expenses'));
    const expenseDeletes = expenseSnapshot.docs.map(doc => deleteDoc(doc.ref));
    await Promise.all(expenseDeletes);

    // Delete all savings
    const savingsSnapshot = await getDocs(collection(db, 'users', userId, 'savings'));
    const savingsDeletes = savingsSnapshot.docs.map(doc => deleteDoc(doc.ref));
    await Promise.all(savingsDeletes);

    // Delete all savings goals
    const goalsSnapshot = await getDocs(collection(db, 'users', userId, 'savingsGoals'));
    const goalsDeletes = goalsSnapshot.docs.map(doc => deleteDoc(doc.ref));
    await Promise.all(goalsDeletes);

  } catch (error) {
    console.error('Error resetting app data:', error);
    throw error;
  }
};

// Backup data to Firestore
export const backupDataToFirestore = async (backupData) => {
  const userId = getCurrentUserId();

  try {
    const backupDoc = {
      ...backupData,
      createdAt: serverTimestamp(),
      userId: userId,
    };

    const docRef = await addDoc(collection(db, 'backups', userId, 'userBackups'), backupDoc);
    return docRef.id;
  } catch (error) {
    console.error('Error backing up data to Firestore:', error);
    throw error;
  }
};

// Get all backups from Firestore
export const getBackupsFromFirestore = async () => {
  const userId = getCurrentUserId();

  try {
    const q = query(collection(db, 'backups', userId, 'userBackups'), orderBy('createdAt', 'desc'));
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  } catch (error) {
    console.error('Error getting backups from Firestore:', error);
    throw error;
  }
};

// Restore data from Firestore backup
export const restoreDataFromFirestore = async (backupId) => {
  const userId = getCurrentUserId();

  try {
    const backupDoc = await getDoc(doc(db, 'backups', userId, 'userBackups', backupId));
    if (!backupDoc.exists()) {
      throw new Error('Backup not found');
    }

    const backupData = backupDoc.data();

    // Clear existing data first
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
    if (backupData.income && Array.isArray(backupData.income)) {
      for (const item of backupData.income) {
        await addIncome({
          category: item.category,
          amount: item.amount,
        });
      }
    }

    // Restore expenses
    if (backupData.expenses && Array.isArray(backupData.expenses)) {
      for (const item of backupData.expenses) {
        await addExpense({
          category: item.category,
          amount: item.amount,
          description: item.description,
        });
      }
    }

    // Restore savings
    if (backupData.savings && Array.isArray(backupData.savings)) {
      for (const item of backupData.savings) {
        await addSavings({
          amount: item.amount,
          description: item.description,
        });
      }
    }

    // Restore savings goals
    if (backupData.savingsGoals && Array.isArray(backupData.savingsGoals)) {
      for (const item of backupData.savingsGoals) {
        await addSavingsGoal({
          name: item.goalName,
          amount: item.targetAmount,
          savedAmount: item.savedAmount,
          durationType: item.durationType,
          goalDeadline: item.goalDeadline ? new Date(item.goalDeadline) : null,
        });
      }
    }

    return true;
  } catch (error) {
    console.error('Error restoring data from Firestore:', error);
    throw error;
  }
};

// Delete a backup from Firestore
export const deleteBackupFromFirestore = async (backupId) => {
  const userId = getCurrentUserId();

  try {
    await deleteDoc(doc(db, 'backups', userId, 'userBackups', backupId));
  } catch (error) {
    console.error('Error deleting backup from Firestore:', error);
    throw error;
  }
};

// Get dashboard data (aggregated)
export const getDashboardData = async () => {
  const userId = getCurrentUserId();

  try {
    const [incomeSnapshot, expenseSnapshot, savingsSnapshot] = await Promise.all([
      getDocs(query(collection(db, 'users', userId, 'income'), orderBy('timestamp', 'desc'))),
      getDocs(query(collection(db, 'users', userId, 'expenses'), orderBy('timestamp', 'desc'))),
      getDocs(query(collection(db, 'users', userId, 'savings'), orderBy('timestamp', 'desc'))),
    ]);

    const income = incomeSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    const expenses = expenseSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    const savings = savingsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

    const totalIncome = income.reduce((sum, item) => sum + (item.amount || 0), 0);
    const totalExpenses = expenses.reduce((sum, item) => sum + (item.amount || 0), 0);
    const totalSavings = savings.reduce((sum, item) => sum + (item.amount || 0), 0);

    // Group expenses by category
    const expenseCategories = {};
    expenses.forEach(expense => {
      const category = expense.category || 'Other';
      expenseCategories[category] = (expenseCategories[category] || 0) + expense.amount;
    });

    // Monthly trends (last 6 months)
    const monthlyData = {};
    [...income, ...expenses].forEach(item => {
      if (item.timestamp) {
        const date = item.timestamp.toDate();
        const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
        if (!monthlyData[monthKey]) {
          monthlyData[monthKey] = { income: 0, expenses: 0 };
        }
        if (income.some(i => i.id === item.id)) {
          monthlyData[monthKey].income += item.amount;
        } else {
          monthlyData[monthKey].expenses += item.amount;
        }
      }
    });

    return {
      totalIncome,
      totalExpenses,
      totalSavings,
      expenseCategories,
      monthlyData,
      recentTransactions: [
        ...income.slice(0, 5),
        ...expenses.slice(0, 5).map(exp => ({ ...exp, amount: -exp.amount })) // Make expense amounts negative
      ].sort((a, b) => b.timestamp - a.timestamp),
    };
  } catch (error) {
    console.error('Error getting dashboard data:', error);
    throw error;
  }
};

// Category functions
export const addCategory = async (type, name) => {
  const userId = getCurrentUserId();

  try {
    const docRef = await addDoc(collection(db, 'users', userId, 'categories'), {
      type: type,
      name: name,
      timestamp: serverTimestamp(),
    });
    return docRef.id;
  } catch (error) {
    console.error('Error adding category:', error);
    throw error;
  }
};

export const getCategories = async (type) => {
  const userId = getCurrentUserId();

  try {
    const q = query(collection(db, 'users', userId, 'categories'), orderBy('timestamp', 'desc'));
    const snapshot = await getDocs(q);
    const categories = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })).filter(cat => cat.type === type);
    return categories;
  } catch (error) {
    console.error('Error getting categories:', error);
    throw error;
  }
};

export const updateCategory = async (type, categoryId, name) => {
  const userId = getCurrentUserId();
  if (!userId) throw new Error('User not authenticated');

  try {
    const docRef = doc(db, 'users', userId, 'categories', categoryId);
    await updateDoc(docRef, {
      name: name,
    });
  } catch (error) {
    console.error('Error updating category:', error);
    throw error;
  }
};

export const deleteCategory = async (type, categoryId) => {
  const userId = getCurrentUserId();
  if (!userId) throw new Error('User not authenticated');

  try {
    const docRef = doc(db, 'users', userId, 'categories', categoryId);
    await deleteDoc(docRef);
  } catch (error) {
    console.error('Error deleting category:', error);
    throw error;
  }
};

// Real-time categories listener
export const getCategoriesRealtime = (type, callback) => {
  const userId = getCurrentUserId();
  if (!userId) throw new Error('User not authenticated');

  const q = query(collection(db, 'users', userId, 'categories'), orderBy('timestamp', 'desc'));

  return onSnapshot(q, (snapshot) => {
    const categories = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })).filter(cat => cat.type === type);
    callback(categories);
  }, (error) => {
    console.error('Error listening to categories:', error);
  });
};

// Get transactions by category and type
export const getTransactionsByCategory = async (type, category) => {
  const userId = getCurrentUserId();
  if (!userId) throw new Error('User not authenticated');

  let collectionName;
  switch (type) {
    case 'income':
      collectionName = 'income';
      break;
    case 'expense':
      collectionName = 'expenses';
      break;
    case 'saving':
      collectionName = 'savings';
      break;
    default:
      throw new Error('Invalid transaction type');
  }

  // Normalize category for querying
  const normalizedCategory = category.trim().toLowerCase();

  try {
    // Adjust query to check normalized category field (stored normalized category)
    const q = query(
      collection(db, 'users', userId, collectionName),
      orderBy('timestamp', 'desc')
    );
    const snapshot = await getDocs(q);
    // Filter client-side by normalized category match to overcome Firestore where case sensitivity
    const filtered = snapshot.docs.map(doc => {
      const data = doc.data();
      const docCategory = data.category ? data.category.trim().toLowerCase() : '';
      return { id: doc.id, ...data, _categoryNormalized: docCategory };
    }).filter(doc => doc._categoryNormalized === normalizedCategory);
    return filtered;
  } catch (error) {
    console.error('Error getting transactions by category:', error);
    throw error;
  }
};

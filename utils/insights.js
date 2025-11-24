import { getIncome, getExpenses, getSavings, getSavingsGoals } from '../firebase/firestoreService';

/**
 * Get financial data for the last 30 days
 * @returns {Object} Object containing income, expenses, and savings arrays
 */
export const getLast30DaysData = async () => {
  try {
    const [income, expenses, savings] = await Promise.all([
      getIncome(),
      getExpenses(),
      getSavings(),
    ]);

    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    // Filter data for last 30 days
    const filterByDate = (data) => {
      return data.filter(item => {
        const timestamp = item.timestamp?.toDate ? item.timestamp.toDate() : new Date(item.timestamp);
        return timestamp >= thirtyDaysAgo;
      });
    };

    return {
      income: filterByDate(income),
      expenses: filterByDate(expenses),
      savings: filterByDate(savings),
    };
  } catch (error) {
    console.error('Error fetching last 30 days data:', error);
    throw error;
  }
};

/**
 * Group expenses by category and week
 * @param {Array} expenses - Array of expense objects
 * @returns {Object} Object with categories as keys and weekly data as values
 */
export const groupExpensesByCategoryAndWeek = (expenses) => {
  const grouped = {};

  expenses.forEach(expense => {
    const category = expense.category || 'Other';
    const timestamp = expense.timestamp?.toDate ? expense.timestamp.toDate() : new Date(expense.timestamp);
    const weekStart = new Date(timestamp);
    weekStart.setDate(timestamp.getDate() - timestamp.getDay()); // Start of week (Sunday)
    const weekKey = weekStart.toISOString().split('T')[0];

    if (!grouped[category]) {
      grouped[category] = {};
    }
    if (!grouped[category][weekKey]) {
      grouped[category][weekKey] = 0;
    }
    grouped[category][weekKey] += expense.amount || 0;
  });

  return grouped;
};

/**
 * Calculate percentage change between two values
 * @param {number} current - Current value
 * @param {number} previous - Previous value
 * @returns {number} Percentage change (positive for increase, negative for decrease)
 */
export const calculatePercentageChange = (current, previous) => {
  if (previous === 0) return current > 0 ? 100 : 0;
  return ((current - previous) / Math.abs(previous)) * 100;
};

/**
 * Generate smart insights based on financial data
 * @returns {Array} Array of insight strings
 */
export const generateInsights = async () => {
  try {
    const { income, expenses, savings } = await getLast30DaysData();
    const goals = await getSavingsGoals();

    const insights = [];

    // Calculate totals
    const totalIncome = income.reduce((sum, item) => sum + (item.amount || 0), 0);
    const totalExpenses = expenses.reduce((sum, item) => sum + (item.amount || 0), 0);
    const totalSavings = savings.reduce((sum, item) => sum + (item.amount || 0), 0);

    // Insight 1: Savings trend
    if (totalSavings > 0) {
      insights.push(`You've saved ${totalSavings.toFixed(0)} in the last 30 days. Great job! 💰`);
    } else if (totalSavings < 0) {
      insights.push(`Your savings decreased by ${Math.abs(totalSavings).toFixed(0)} in the last 30 days. Consider reviewing your expenses. 📉`);
    }

    // Insight 2: Expense categories analysis
    const expenseCategories = {};
    expenses.forEach(expense => {
      const category = expense.category || 'Other';
      expenseCategories[category] = (expenseCategories[category] || 0) + (expense.amount || 0);
    });

    const topCategory = Object.entries(expenseCategories).sort(([,a], [,b]) => b - a)[0];
    if (topCategory) {
      const [category, amount] = topCategory;
      const percentage = totalExpenses > 0 ? ((amount / totalExpenses) * 100).toFixed(1) : 0;
      insights.push(`${category} is your biggest expense category at ${percentage}% of total spending. 🎯`);
    }

    // Insight 3: Weekly expense trends
    const weeklyExpenses = groupExpensesByCategoryAndWeek(expenses);
    const categories = Object.keys(weeklyExpenses);

    if (categories.length > 0) {
      const category = categories[0]; // Take first category for analysis
      const weeks = Object.keys(weeklyExpenses[category]).sort();
      if (weeks.length >= 2) {
        const currentWeek = weeks[weeks.length - 1];
        const previousWeek = weeks[weeks.length - 2];
        const currentAmount = weeklyExpenses[category][currentWeek] || 0;
        const previousAmount = weeklyExpenses[category][previousWeek] || 0;
        const change = calculatePercentageChange(currentAmount, previousAmount);

        if (Math.abs(change) > 5) { // Only show if change is significant (>5%)
          const direction = change > 0 ? 'increased' : 'decreased';
          insights.push(`Your ${category} expenses ${direction} by ${Math.abs(change).toFixed(1)}% compared to last week. ${change > 0 ? '📈' : '📉'}`);
        }
      }
    }

    // Insight 4: Income vs Expenses comparison
    if (totalIncome > 0 && totalExpenses > 0) {
      const netIncome = totalIncome - totalExpenses;
      if (netIncome > 0) {
        const savingsRate = ((netIncome / totalIncome) * 100).toFixed(1);
        insights.push(`You're saving ${savingsRate}% of your income this month. Keep it up! 🎉`);
      } else {
        const deficitRate = ((Math.abs(netIncome) / totalIncome) * 100).toFixed(1);
        insights.push(`Your expenses exceed income by ${deficitRate}%. Consider budgeting to improve this. ⚠️`);
      }
    }

    // Insight 5: Transaction frequency
    const totalTransactions = income.length + expenses.length + savings.length;
    const avgTransactionsPerDay = totalTransactions / 30;
    if (avgTransactionsPerDay < 1) {
      insights.push(`You have about ${avgTransactionsPerDay.toFixed(1)} transactions per day. Consider tracking more regularly for better insights. 📊`);
    } else if (avgTransactionsPerDay > 3) {
      insights.push(`You're actively tracking with ${avgTransactionsPerDay.toFixed(1)} transactions per day. Great financial awareness! 👏`);
    }

    // Insight 6: Savings goals analysis
    if (goals && goals.length > 0) {
      const activeGoals = goals.filter(goal => goal.status === 'ongoing' || !goal.status);
      const completedGoals = goals.filter(goal => goal.status === 'completed' || goal.status === 'achieved');

      if (activeGoals.length > 0) {
        const totalGoalAmount = activeGoals.reduce((sum, goal) => sum + (goal.amount || goal.targetAmount || 0), 0);
        const totalSaved = activeGoals.reduce((sum, goal) => sum + (goal.savedAmount || 0), 0);
        const progressPercentage = totalGoalAmount > 0 ? ((totalSaved / totalGoalAmount) * 100).toFixed(1) : 0;
        insights.push(`You're ${progressPercentage}% towards your savings goals. Keep saving! 🎯`);
      }

      if (completedGoals.length > 0) {
        insights.push(`You've achieved ${completedGoals.length} savings goal${completedGoals.length > 1 ? 's' : ''}! Amazing progress! 🏆`);
      }

      if (activeGoals.length === 0 && completedGoals.length === 0) {
        insights.push(`Set some savings goals to track your progress and stay motivated! 💪`);
      }
    } else {
      insights.push(`Consider setting savings goals to stay motivated and track your progress! 🎯`);
    }

    // Ensure we have at least 3 insights, add generic ones if needed
    while (insights.length < 3) {
      if (totalIncome > totalExpenses) {
        insights.push("Your income exceeds expenses - you're on the right track! 🌟");
      } else if (totalExpenses > totalIncome) {
        insights.push("Consider reviewing your budget to reduce expenses. 💡");
      } else {
        insights.push("Keep tracking your finances regularly for better insights. 📈");
      }
    }

    // Limit to 5 insights maximum
    return insights.slice(0, 5);
  } catch (error) {
    console.error('Error generating insights:', error);
    return [
      "Unable to generate insights at this time. Please check your data and try again. 🤔",
      "Make sure you're logged in and have some financial data to analyze. 📱",
      "Regular tracking helps generate better financial insights! 💪"
    ];
  }
};

/**
 * Cache insights in Firestore (optional feature)
 * @param {Array} insights - Array of insight strings
 */
export const cacheInsights = async (insights) => {
  try {
    const userId = auth.currentUser?.uid;
    if (!userId) return;

    const insightsRef = collection(db, 'users', userId, 'insights');
    await addDoc(insightsRef, {
      insights,
      timestamp: serverTimestamp(),
    });
  } catch (error) {
    console.error('Error caching insights:', error);
  }
};

/**
 * Get cached insights from Firestore (optional feature)
 * @returns {Array} Array of cached insight strings
 */
export const getCachedInsights = async () => {
  try {
    const userId = auth.currentUser?.uid;
    if (!userId) return [];

    const insightsRef = collection(db, 'users', userId, 'insights');
    const q = query(insightsRef, orderBy('timestamp', 'desc'), limit(1));
    const snapshot = await getDocs(q);

    if (!snapshot.empty) {
      const latestInsights = snapshot.docs[0].data();
      return latestInsights.insights || [];
    }
    return [];
  } catch (error) {
    console.error('Error getting cached insights:', error);
    return [];
  }
};

import React, { useState, useEffect, useMemo } from 'react';
import { View, Text, StyleSheet, ScrollView, ActivityIndicator, Alert, TouchableOpacity, RefreshControl, Dimensions } from 'react-native';
import { PieChart } from 'react-native-chart-kit';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { getDashboardData, getUserProfile } from '../firebase/firestoreService';
import { auth } from '../firebase/firebaseConfig';
import ErrorBoundary from '../components/ErrorBoundary';
import { useSettings } from '../contexts/SettingsContext';
import CustomButton from '../components/CustomButton';
import { generateInsights } from '../utils/insights';

export default function Dashboard() {
  const { getThemeColors } = useSettings();
  const theme = getThemeColors();
  const [dashboardData, setDashboardData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [userName, setUserName] = useState('User');
  const [insights, setInsights] = useState([]);
  const [refreshing, setRefreshing] = useState(false);
  const navigation = useNavigation();
  const { settings, formatCurrency } = useSettings();

  const fetchUserName = async () => {
    try {
      const user = auth.currentUser;
      if (user) {
        // First try to get profile name from Firestore
        const profile = await getUserProfile();
        if (profile && profile.name && profile.name.trim()) {
          setUserName(profile.name.trim());
        } else {
          // Fallback to email name or display name
          setUserName(user.displayName || user.email?.split('@')[0] || 'User');
        }
      }
    } catch (error) {
      console.error('Error fetching user name:', error);
      // Fallback to email name
      const user = auth.currentUser;
      if (user) {
        setUserName(user.displayName || user.email?.split('@')[0] || 'User');
      }
    }
  };

  const fetchInsights = async () => {
    try {
      const insightsData = await generateInsights(dashboardData);
      setInsights(insightsData);
    } catch (error) {
      console.error('Error fetching insights:', error);
    }
  };

  useFocusEffect(
    React.useCallback(() => {
      fetchDashboardData();
      fetchUserName(); // Fetch user name every time the screen is focused
      fetchInsights(); // Fetch insights when screen is focused
    }, [])
  );

  // Data validation and sanitization functions
  const validateNumber = (value, defaultValue = 0) => {
    const num = Number(value);
    if (isNaN(num) || !isFinite(num)) return defaultValue;
    // Clamp to prevent chart rendering issues with extremely large numbers
    return Math.max(-1000000000, Math.min(1000000000, num));
  };

  const validateArray = (arr, defaultValue = []) => {
    return Array.isArray(arr) ? arr : defaultValue;
  };

  const validateObject = (obj, defaultValue = {}) => {
    return obj && typeof obj === 'object' && !Array.isArray(obj) ? obj : defaultValue;
  };

  // Memoized computations to prevent unnecessary re-renders - moved to top level
  const processedData = useMemo(() => {
    if (!dashboardData) {
      return {
        safeTotalIncome: 0,
        safeTotalExpenses: 0,
        safeTotalSavings: 0,
        pieChartData: [],
        barChartData: { labels: [], datasets: [{ data: [] }] },
        savingsProgress: 0,
        savingsGoal: 50000,
        sortedMonths: [],
        limitedRecentTransactions: [],
      };
    }

    try {
      const { totalIncome = 0, totalExpenses = 0, totalSavings = 0, expenseCategories = {}, monthlyData = {}, recentTransactions = [] } = dashboardData;

      const safeTotalIncome = validateNumber(totalIncome);
      const safeTotalExpenses = validateNumber(totalExpenses);
      const safeTotalSavings = validateNumber(totalSavings);
      const safeExpenseCategories = validateObject(expenseCategories);
      const safeMonthlyData = validateObject(monthlyData);
      const safeRecentTransactions = validateArray(recentTransactions);

      // Limit data points for performance
      const limitedExpenseCategories = Object.fromEntries(
        Object.entries(safeExpenseCategories)
          .sort(([,a], [,b]) => b - a)
          .slice(0, 5) // Top 5 categories
      );

      // Prepare pie chart data for expense categories (limited)
      const pieChartData = Object.entries(limitedExpenseCategories).map(([category, amount], index) => ({
        name: category || 'Unknown',
        amount: validateNumber(amount),
        color: ['#FF6384', '#36A2EB', '#FFCE56', '#4BC0C0', '#9966FF', '#FF9F40'][index % 6],
        legendFontColor: '#7F7F7F',
        legendFontSize: 15,
      })).filter(item => {
        const amount = validateNumber(item.amount);
        return amount > 0 && isFinite(amount) && !isNaN(amount);
      });

      // Prepare bar chart data for monthly trends (last 6 months)
      const sortedMonths = Object.keys(safeMonthlyData)
        .sort()
        .slice(-6); // Last 6 months only

      const barChartData = {
        labels: sortedMonths.map(month => {
          const [year, monthNum] = month.split('-');
          return `${monthNum}/${year?.slice(-2) || '24'}`;
        }),
        datasets: [{
          data: sortedMonths.map(month => {
            const income = validateNumber(safeMonthlyData[month]?.income);
            const expenses = validateNumber(safeMonthlyData[month]?.expenses);
            const net = income - expenses;
            // Ensure net is finite and not NaN
            return isFinite(net) && !isNaN(net) ? net : 0;
          }),
        }],
      };

      // Calculate savings goal progress
      const savingsGoal = 50000;
      const savingsProgress = Math.min(safeTotalSavings / savingsGoal, 1);

      // Limit recent transactions
      const limitedRecentTransactions = safeRecentTransactions.filter(t => t && typeof t === 'object' && 'amount' in t).slice(0, 5);

      return {
        safeTotalIncome,
        safeTotalExpenses,
        safeTotalSavings,
        safeMonthlyData,
        pieChartData,
        barChartData,
        savingsProgress,
        savingsGoal,
        sortedMonths,
        limitedRecentTransactions,
      };
    } catch (error) {
      console.error('Error processing dashboard data:', error);
      return {
        safeTotalIncome: 0,
        safeTotalExpenses: 0,
        safeTotalSavings: 0,
        pieChartData: [],
        barChartData: { labels: [], datasets: [{ data: [] }] },
        savingsProgress: 0,
        savingsGoal: 50000,
        sortedMonths: [],
        limitedRecentTransactions: [],
      };
    }
  }, [dashboardData]);

  const {
    safeTotalIncome,
    safeTotalExpenses,
    safeTotalSavings,
    safeMonthlyData,
    pieChartData,
    barChartData,
    savingsProgress,
    savingsGoal,
    sortedMonths,
    limitedRecentTransactions,
  } = processedData;

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      const data = await getDashboardData();
      setDashboardData(data);
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
      // For development, provide mock data if Firebase fails
      setDashboardData({
        totalIncome: 157000,
        totalExpenses: 109000,
        totalSavings: 35000,
        expenseCategories: {
          'Food': 25000,
          'Transport': 15000,
          'Entertainment': 10000,
          'Utilities': 20000,
          'Other': 34000,
        },
        monthlyData: {
          '2024-01': { income: 20000, expenses: 15000 },
          '2024-02': { income: 25000, expenses: 18000 },
          '2024-03': { income: 22000, expenses: 16000 },
          '2024-04': { income: 28000, expenses: 20000 },
          '2024-05': { income: 30000, expenses: 19000 },
          '2024-06': { income: 32000, expenses: 21000 },
        },
        recentTransactions: [
          { source: 'Salary', amount: 30000, timestamp: new Date() },
          { category: 'Food', amount: -5000, timestamp: new Date() },
          { category: 'Transport', amount: -2000, timestamp: new Date() },
        ],
      });
      Alert.alert('Demo Mode', 'Using mock data for demonstration. Firebase authentication required for full functionality.');
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchDashboardData();
    await fetchInsights();
    setRefreshing(false);
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#4CAF50" />
        <Text style={styles.loadingText}>Loading dashboard...</Text>
      </View>
    );
  }

  if (!dashboardData) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorText}>Unable to load dashboard data.</Text>
        <Text style={styles.errorSubtext}>Please ensure you're logged in and try again.</Text>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: theme.backgroundColor }]}>
      <ScrollView showsVerticalScrollIndicator={false}>
        <Text style={[styles.welcomeHeader, { color: theme.accentColor }]}>Welcome back, {userName}! 👋</Text>
        <Text style={[styles.subHeader, { color: theme.secondaryTextColor }]}>Here's your financial overview</Text>

        {/* Summary Cards */}
        <View style={{ width: '100%', marginTop: 16 }}>
          <View style={[styles.card, { backgroundColor: theme.cardBackgroundColor, shadowColor: theme.textColor, alignItems: 'center', justifyContent: 'center', paddingVertical: 12, marginHorizontal: 16, marginVertical: 8 }]}>
            <Text style={[styles.cardTitle, { color: theme.textColor, textAlign: 'center', marginBottom: 6 }]}>Total Income</Text>
            <Text style={[styles.summaryAmount, { color: '#34A853', textAlign: 'center' }]}>{formatCurrency(safeTotalIncome)}</Text>
          </View>

          <View style={[styles.card, { backgroundColor: theme.cardBackgroundColor, shadowColor: theme.textColor, alignItems: 'center', justifyContent: 'center', paddingVertical: 12, marginHorizontal: 16, marginVertical: 8 }]}>
            <Text style={[styles.cardTitle, { color: theme.textColor, textAlign: 'center', marginBottom: 6 }]}>Total Expenses</Text>
            <Text style={[styles.summaryAmount, { color: '#EA4335', textAlign: 'center' }]}>{formatCurrency(safeTotalExpenses)}</Text>
          </View>

          <View style={[styles.card, { backgroundColor: theme.cardBackgroundColor, shadowColor: theme.textColor, alignItems: 'center', justifyContent: 'center', paddingVertical: 12, marginHorizontal: 16, marginVertical: 8 }]}>
            <Text style={[styles.cardTitle, { color: theme.textColor, textAlign: 'center', marginBottom: 6 }]}>Balance</Text>
            <Text style={[styles.summaryAmount, { color: safeTotalIncome - safeTotalExpenses >= 0 ? '#34A853' : '#EA4335', textAlign: 'center' }]}>
              {formatCurrency(safeTotalIncome - safeTotalExpenses)}
            </Text>
          </View>
        </View>

        {/* Financial Overview Pie Chart */}
        <View style={[styles.card, { backgroundColor: theme.cardBackgroundColor, shadowColor: theme.textColor }]}>
          <Text style={[styles.cardTitle, { color: theme.textColor }]}>Financial Overview</Text>
          <ErrorBoundary>
            <View style={{ alignItems: 'center', justifyContent: 'center', paddingVertical: 10 }}>
              <PieChart
                data={[
                  {
                    name: 'Income',
                    amount: safeTotalIncome,
                    color: '#34A853',
                    legendFontColor: theme.textColor,
                    legendFontSize: 13,
                  },
                  {
                    name: 'Expenses',
                    amount: safeTotalExpenses,
                    color: '#EA4335',
                    legendFontColor: theme.textColor,
                    legendFontSize: 13,
                  },
                  {
                    name: 'Savings',
                    amount: safeTotalSavings,
                    color: '#4285F4',
                    legendFontColor: theme.textColor,
                    legendFontSize: 13,
                  },
                ].filter(item => item.amount > 0)}
                width={Dimensions.get('window').width - 80}
                height={170}
                chartConfig={{
                  backgroundColor: theme.cardBackgroundColor,
                  backgroundGradientFrom: theme.cardBackgroundColor,
                  backgroundGradientTo: theme.cardBackgroundColor,
                  color: (opacity = 1) => `rgba(0, 0, 0, ${opacity})`,
                  style: { borderRadius: 16 },
                }}
                accessor="amount"
                backgroundColor="transparent"
                paddingLeft="0"
                absolute
              />
            </View>
          </ErrorBoundary>
        </View>

        {/* Recent Activities */}
        <View style={[styles.card, { backgroundColor: theme.cardBackgroundColor, shadowColor: theme.textColor }]}>
          <Text style={[styles.cardTitle, { color: theme.textColor }]}>Recent Activities</Text>
          {limitedRecentTransactions.length > 0 ? (
            limitedRecentTransactions.map((transaction, index) => (
              <View key={index} style={styles.activityItem}>
                <View style={styles.activityLeft}>
                  <Text style={styles.activityIcon}>
                    {transaction?.source ? '💼' : transaction?.category === 'Food' ? '🍽️' : transaction?.category === 'Transport' ? '🚗' : '💳'}
                  </Text>
                  <View>
                    <Text style={[styles.activityTitle, { color: theme.textColor }]}>
                      {transaction?.source || transaction?.category || 'Transaction'}
                    </Text>
                    <Text style={[styles.activityDate, { color: theme.secondaryTextColor }]}>
                      {transaction?.timestamp ? new Date(transaction.timestamp).toLocaleDateString() : 'Today'}
                    </Text>
                  </View>
                </View>
                <Text style={[styles.activityAmount, { color: validateNumber(transaction?.amount) > 0 ? '#34A853' : '#EA4335' }]}>
                  {validateNumber(transaction?.amount) > 0 ? '+' : '-'}{formatCurrency(Math.abs(validateNumber(transaction?.amount)))}
                </Text>
              </View>
            ))
          ) : (
            <Text style={[styles.noDataText, { color: theme.secondaryTextColor }]}>No recent activities</Text>
          )}
        </View>

        {/* AI Insights */}
        <View style={[styles.card, { backgroundColor: theme.cardBackgroundColor, shadowColor: theme.textColor }]}>
          <Text style={[styles.cardTitle, { color: theme.textColor }]}>AI Insights</Text>
          {insights.length > 0 ? (
            insights.map((insight, index) => (
              <View key={index} style={styles.insightItem}>
                <Text style={[styles.insightIcon, { color: theme.accentColor }]}>💡</Text>
                <Text style={[styles.insightText, { color: theme.secondaryTextColor }]}>
                  {insight}
                </Text>
              </View>
            ))
          ) : (
            <Text style={[styles.noDataText, { color: theme.secondaryTextColor }]}>Generating insights...</Text>
          )}
        </View>

        {/* Quick Actions */}
        <View style={[styles.card, { backgroundColor: theme.cardBackgroundColor, shadowColor: theme.textColor }]}>
          <Text style={[styles.cardTitle, { color: theme.textColor }]}>Quick Actions</Text>
          <View style={styles.quickActions}>
            <TouchableOpacity
              style={[styles.quickActionButton, { backgroundColor: theme.backgroundColor }]}
              onPress={() => navigation.navigate('Income')}
            >
              <Text style={styles.quickActionIcon}>💰</Text>
              <Text style={[styles.quickActionText, { color: theme.textColor }]}>Add Income</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.quickActionButton, { backgroundColor: theme.backgroundColor }]}
              onPress={() => navigation.navigate('Expenses')}
            >
              <Text style={styles.quickActionIcon}>💸</Text>
              <Text style={[styles.quickActionText, { color: theme.textColor }]}>Add Expense</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.quickActionButton, { backgroundColor: theme.backgroundColor }]}
              onPress={() => navigation.navigate('Savings')}
            >
              <Text style={styles.quickActionIcon}>🎯</Text>
              <Text style={[styles.quickActionText, { color: theme.textColor }]}>Set Goal</Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
  },
  welcomeHeader: {
    fontSize: 28,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 5,
  },
  subHeader: {
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 25,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  errorText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#f44336',
    textAlign: 'center',
    marginBottom: 10,
  },
  errorSubtext: {
    fontSize: 14,
    textAlign: 'center',
  },
  summaryContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  summaryCard: {
    flex: 1,
    borderRadius: 15,
    padding: 20,
    marginHorizontal: 5,
    alignItems: 'center',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  summaryIcon: {
    fontSize: 24,
    marginBottom: 8,
  },
  summaryTitle: {
    fontSize: 12,
    marginBottom: 5,
  },
  summaryAmount: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  card: {
    borderRadius: 15,
    padding: 20,
    marginBottom: 20,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 15,
  },
  activityItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  activityLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  activityIcon: {
    fontSize: 20,
    marginRight: 12,
  },
  activityTitle: {
    fontSize: 16,
    fontWeight: '500',
  },
  activityDate: {
    fontSize: 12,
    marginTop: 2,
  },
  activityAmount: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  noDataText: {
    fontSize: 16,
    textAlign: 'center',
    marginTop: 20,
  },
  quickActions: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  quickActionButton: {
    alignItems: 'center',
    padding: 15,
    borderRadius: 12,
    flex: 1,
    marginHorizontal: 5,
  },
  quickActionIcon: {
    fontSize: 24,
    marginBottom: 8,
  },
  quickActionText: {
    fontSize: 12,
    fontWeight: '500',
  },
  insightItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  insightIcon: {
    fontSize: 18,
    marginRight: 12,
    marginTop: 2,
  },
  insightText: {
    flex: 1,
    fontSize: 14,
    lineHeight: 20,
  },
});

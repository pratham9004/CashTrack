import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, Dimensions } from 'react-native';
import PieChartComponent from './PieChartComponent';
import { useNavigation } from '@react-navigation/native';
import { getIncome } from '../firebase/firestoreService';
import { useSettings } from '../contexts/SettingsContext';

const screenWidth = Dimensions.get('window').width;

const COLOR_PALETTE = ['#34A853', '#4ECDC4', '#45B7D1', '#96CEB4', '#A4DE02', '#FF9F1C'];

export default function IncomePieChart() {
  const navigation = useNavigation();
  const { getThemeColors } = useSettings();
  const theme = getThemeColors();

  const [incomeData, setIncomeData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchIncomeData = async () => {
      try {
        setLoading(true);
        const data = await getIncome();
        setIncomeData(data);
        setError(null);
      } catch (err) {
        setError('Failed to load income data');
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    fetchIncomeData();
  }, []);

  // Group income by category and sum amounts
  const categoryTotals = incomeData.reduce((acc, item) => {
    if (item.category) {
      acc[item.category] = (acc[item.category] || 0) + item.amount;
    }
    return acc;
  }, {});

  const totalIncome = Object.values(categoryTotals).reduce((acc, val) => acc + val, 0);

  // Prepare pie chart data
  const pieData = Object.entries(categoryTotals).map(([category, amount], index) => ({
    name: category,
    amount,
    color: COLOR_PALETTE[index % COLOR_PALETTE.length],
    legendFontColor: theme.textColor,
    legendFontSize: 12,
  }));

  if (loading) {
    return (
      <View style={[styles.container, { backgroundColor: theme.cardBackgroundColor }]}>
        <Text style={[styles.loadingText, { color: theme.secondaryTextColor }]}>Loading income data...</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={[styles.container, { backgroundColor: theme.cardBackgroundColor }]}>
        <Text style={[styles.errorText, { color: theme.accentColor }]}>{error}</Text>
      </View>
    );
  }

  if (pieData.length === 0) {
    return (
      <View style={[styles.container, { backgroundColor: theme.cardBackgroundColor }]}>
        <Text style={[styles.noDataText, { color: theme.secondaryTextColor }]}>No income data to display.</Text>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: theme.cardBackgroundColor }]}>
      <Text style={[styles.title, { color: theme.textColor }]}>Income Breakdown</Text>
      <PieChartComponent
        data={pieData}
        width={screenWidth - 40}
        height={220}
        chartConfig={{
          backgroundColor: theme.cardBackgroundColor,
          backgroundGradientFrom: theme.cardBackgroundColor,
          backgroundGradientTo: theme.cardBackgroundColor,
          color: (opacity = 1) => `rgba(0, 0, 0, ${opacity})`,
        }}
        onCategoryPress={(category) => {
          navigation.navigate('CategoryTransactions', { category, type: 'income' });
        }}
      />
      <Text style={[styles.totalText, { color: theme.accentColor }]}>Total Income: {totalIncome.toFixed(2)}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderRadius: 15,
    padding: 20,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    alignItems: 'center',
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 12,
  },
  totalText: {
    marginTop: 12,
    fontWeight: 'bold',
    fontSize: 16,
  },
  loadingText: {
    fontSize: 16,
  },
  errorText: {
    fontSize: 16,
  },
  noDataText: {
    fontSize: 16,
  },
});

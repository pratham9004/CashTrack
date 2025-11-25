
import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, FlatList, ActivityIndicator } from 'react-native';
import { useRoute } from '@react-navigation/native';
import { useSettings } from '../contexts/SettingsContext';
import { formatCurrency } from '../utils/helpers';
import { getIncome, getExpenses, getSavings } from '../firebase/firestoreService';

// Reusable filter function for exact case-insensitive category match
const filterTransactionsByCategory = (transactions, selectedCategory) => {
  if (!selectedCategory) return [];
  const lowerSelectedCategory = selectedCategory.trim().toLowerCase();
  return transactions.filter(t => (t.category || '').trim().toLowerCase() === lowerSelectedCategory);
};

export default function CategoryTransactionsScreen() {
  const route = useRoute();
  const { category, type } = route.params || {};
  const { getThemeColors } = useSettings();
  const theme = getThemeColors();

  const [allTransactions, setAllTransactions] = useState([]);
  const [filteredTransactions, setFilteredTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Fetch all transactions of the selected type from Firestore
  const fetchTransactionsByType = async (transactionType) => {
    try {
      switch (transactionType) {
        case 'income':
          return await getIncome();
        case 'expense':
          return await getExpenses();
        case 'saving':
          return await getSavings();
        default:
          throw new Error(`Invalid transaction type: ${transactionType}`);
      }
    } catch (err) {
      throw err;
    }
  };

  useEffect(() => {
    if (!category) {
      setError('No category selected');
      setLoading(false);
      return;
    }
    if (!type) {
      setError('No transaction type specified');
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    fetchTransactionsByType(type)
      .then((transactions) => {
        setAllTransactions(transactions);
        const filtered = filterTransactionsByCategory(transactions, category);
        setFilteredTransactions(filtered);
      })
      .catch((err) => {
        console.error('Error fetching transactions:', err);
        setError('Failed to load transactions');
      })
      .finally(() => setLoading(false));
  }, [category, type]);

  const renderItem = ({ item }) => {
    const dateStr = item.timestamp ? new Date(item.timestamp.seconds * 1000).toLocaleDateString() : 'N/A';
    return (
      <View style={[styles.itemContainer, { borderBottomColor: theme.borderColor }]}>
        <View style={styles.itemLeft}>
          <Text style={[styles.itemCategory, { color: theme.textColor }]}>{item.category}</Text>
          <Text style={[styles.itemDate, { color: theme.secondaryTextColor }]}>{dateStr}</Text>
        </View>
        <View style={styles.itemRight}>
          <Text style={[styles.itemAmount, { color: theme.accentColor }]}>
            {item.amount > 0 ? '+' : '-'}{formatCurrency(item.amount, '')}
          </Text>
          {item.note ? <Text style={[styles.itemNote, { color: theme.secondaryTextColor }]}>{item.note}</Text> : null}
          <Text style={[styles.itemType, { color: theme.secondaryTextColor }]}>{item.type}</Text>
        </View>
      </View>
    );
  };

  if (loading) {
    return (
      <View style={[styles.container, { backgroundColor: theme.backgroundColor }]}>
        <ActivityIndicator size="large" color={theme.accentColor} />
      </View>
    );
  }

  if (error) {
    return (
      <View style={[styles.container, { backgroundColor: theme.backgroundColor }]}>
        <Text style={[styles.errorText, { color: theme.accentColor }]}>{error}</Text>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: theme.backgroundColor }]}>
      <Text style={[styles.header, { color: theme.accentColor }]}>
        Transactions for category: {category}
      </Text>
      {filteredTransactions.length === 0 ? (
        <Text style={[styles.noDataText, { color: theme.secondaryTextColor }]}>No transactions found.</Text>
      ) : (
        <FlatList
          data={filteredTransactions}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          contentContainerStyle={styles.listContent}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
  },
  header: {
    fontSize: 22,
    fontWeight: 'bold',
    marginBottom: 12,
    textAlign: 'center',
  },
  listContent: {
    paddingBottom: 20,
  },
  itemContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  itemLeft: {
    flex: 1,
  },
  itemRight: {
    flex: 1,
    alignItems: 'flex-end',
  },
  itemCategory: {
    fontSize: 16,
    fontWeight: '600',
  },
  itemDate: {
    fontSize: 12,
  },
  itemAmount: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  itemNote: {
    fontSize: 12,
    fontStyle: 'italic',
  },
  itemType: {
    fontSize: 12,
  },
  noDataText: {
    textAlign: 'center',
    marginTop: 30,
    fontSize: 16,
  },
  errorText: {
    textAlign: 'center',
    marginTop: 30,
    fontSize: 16,
    fontWeight: 'bold',
  },
});

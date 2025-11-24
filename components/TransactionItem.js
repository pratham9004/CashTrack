import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { formatCurrency } from '../utils/helpers';
import { useSettings } from '../contexts/SettingsContext';

export default function TransactionItem({ transaction, type, onEdit, onDelete }) {
  const { getThemeColors } = useSettings();
  const theme = getThemeColors();

  if (!transaction || typeof transaction !== 'object' || !('amount' in transaction)) {
    return null; // Prevent rendering if transaction is invalid
  }

  const amount = Number(transaction.amount);
  const isIncome = type === 'income';
  const sign = isIncome ? '+' : '-';
  const formattedAmount = formatCurrency(Math.abs(amount));

  return (
    <View style={[styles.container, { backgroundColor: theme.cardBackgroundColor, shadowColor: theme.textColor }]}>
      <View style={styles.leftSection}>
        <Text style={[styles.title, { color: theme.textColor }]}>{transaction.source || transaction.category || 'Transaction'}</Text>
        <Text style={[styles.date, { color: theme.secondaryTextColor }]}>{transaction.timestamp ? (() => {
          const date = new Date(transaction.timestamp);
          return `${date.getDate()}/${date.getMonth() + 1}/${date.getFullYear()}`;
        })() : ''}</Text>
      </View>
      <View style={styles.rightSection}>
        <Text style={[styles.amount, { color: isIncome ? '#4CAF50' : '#f44336' }]}>
          {sign}{formattedAmount}
        </Text>
      </View>
      <View style={styles.actions}>
        <TouchableOpacity onPress={onEdit} style={styles.actionButton}>
          <Text style={[styles.actionText, { color: theme.accentColor }]}>Edit</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={onDelete} style={styles.actionButton}>
          <Text style={[styles.actionText, { color: '#f44336' }]}>Delete</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 15,
    borderRadius: 8,
    marginBottom: 10,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  leftSection: {
    flex: 1,
  },
  rightSection: {
    alignItems: 'flex-end',
  },
  title: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  date: {
    fontSize: 12,
    marginTop: 2,
  },
  amount: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  actions: {
    flexDirection: 'row',
    marginLeft: 10,
  },
  actionButton: {
    marginLeft: 10,
  },
  actionText: {
    fontSize: 14,
    fontWeight: 'bold',
  },
});

import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { PieChart } from 'react-native-chart-kit';

/**
 * Reusable Pie Chart component with side clickable legend on the right.
 * Shows only pie chart on left, and legend on right with colored dot, category name, and amount.
 * No extra labels, percentages, or text below the chart.
 * 
 * Props:
 * - data: [{ name: string, amount: number, color: string }]
 * - onCategoryPress: function(name: string) => void
 */
export default function PieChartComponent({ data, onCategoryPress }) {
  const totalAmount = data.reduce((sum, item) => sum + item.amount, 0);

  return (
    <View style={styles.container}>
      <PieChart
        data={data.map(item => ({
          name: item.name,
          population: item.amount,
          color: item.color,
          legendFontColor: '#000',
          legendFontSize: 14,
        }))}
        width={200}
        height={200}
        accessor="population"
        backgroundColor="transparent"
        paddingLeft="0"
        center={[0, 0]}
        chartConfig={{
          backgroundGradientFrom: '#f8f9fa',
          backgroundGradientTo: '#f8f9fa',
          color: (opacity = 1) => `rgba(34, 139, 34, ${opacity})`,
          strokeWidth: 2,
          useShadowColorFromDataset: false,
        }}
        hasLegend={false}
      />

      <View style={styles.legendContainer}>
        {data.map((item, index) => (
          <TouchableOpacity
            key={item.name + index}
            style={styles.legendItem}
            onPress={() => onCategoryPress && onCategoryPress(item.name)}
          >
            <View style={[styles.colorDot, { backgroundColor: item.color }]} />
            <Text style={styles.legendText}>
              {item.amount.toLocaleString()} {item.name}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  legendContainer: {
    flex: 1,
    marginLeft: 16,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  colorDot: {
    width: 16,
    height: 16,
    borderRadius: 8,
    marginRight: 10,
  },
  legendText: {
    color: '#228B22',
    fontSize: 16,
    fontWeight: '600',
  },
});

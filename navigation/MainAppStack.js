import React from 'react';
import { createStackNavigator } from '@react-navigation/stack';
import BottomTabNavigator from './BottomTabNavigator';
import CategoryTransactionsScreen from '../screens/CategoryTransactionsScreen';

const Stack = createStackNavigator();

export default function MainAppStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="BottomTabs" component={BottomTabNavigator} />
      <Stack.Screen
        name="CategoryTransactions"
        component={CategoryTransactionsScreen}
        options={{ headerShown: true, title: 'Transactions' }}
      />
    </Stack.Navigator>
  );
}

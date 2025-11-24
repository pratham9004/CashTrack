import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { View, Text } from 'react-native';
import { useSettings } from '../contexts/SettingsContext';
import Dashboard from '../screens/Dashboard';
import Income from '../screens/Income';
import Expenses from '../screens/Expenses';
import Savings from '../screens/Savings';
import Profile from '../screens/Profile';
import ChatBotScreen from '../screens/ChatBotScreen';
import ManageCategories from '../screens/ManageCategories';

const Tab = createBottomTabNavigator();

// Custom icon components
const DashboardIcon = ({ color, size }) => (
  <Text style={{ fontSize: size, color }}>📊</Text>
);

const IncomeIcon = ({ color, size }) => (
  <Text style={{ fontSize: size, color }}>💰</Text>
);

const ExpensesIcon = ({ color, size }) => (
  <Text style={{ fontSize: size, color }}>💸</Text>
);

const SavingsIcon = ({ color, size }) => (
  <Text style={{ fontSize: size, color }}>🏦</Text>
);

const ProfileIcon = ({ color, size }) => (
  <Text style={{ fontSize: size, color }}>👤</Text>
);

const ChatBotIcon = ({ color, size }) => (
  <Text style={{ fontSize: size, color }}>🤖</Text>
);

const ManageCategoriesIcon = ({ color, size }) => (
  <Text style={{ fontSize: size, color }}>📂</Text>
);



export default function BottomTabNavigator() {
  const { getThemeColors } = useSettings();
  const theme = getThemeColors();

  return (
    <Tab.Navigator
      screenOptions={{
        tabBarActiveTintColor: theme.accentColor,
        tabBarInactiveTintColor: theme.secondaryTextColor,
        tabBarStyle: {
          backgroundColor: theme.cardBackgroundColor,
          borderTopWidth: 1,
          borderTopColor: theme.borderColor,
        },
        headerStyle: {
          backgroundColor: theme.accentColor,
        },
        headerTintColor: theme.textColor,
      }}
    >
      <Tab.Screen
        name="Dashboard"
        component={Dashboard}
        options={{
          tabBarIcon: DashboardIcon,
        }}
      />
      <Tab.Screen
        name="Income"
        component={Income}
        options={{
          tabBarIcon: IncomeIcon,
        }}
      />
      <Tab.Screen
        name="Expenses"
        component={Expenses}
        options={{
          tabBarIcon: ExpensesIcon,
        }}
      />
      <Tab.Screen
        name="Categories"
        component={ManageCategories}
        options={{
          tabBarIcon: ManageCategoriesIcon,
        }}
      />
      <Tab.Screen
        name="Savings"
        component={Savings}
        options={{
          tabBarIcon: SavingsIcon,
        }}
      />
      <Tab.Screen
        name="Assistant"
        component={ChatBotScreen}
        options={{
          tabBarIcon: ChatBotIcon,
        }}
      />
      <Tab.Screen
        name="Profile"
        component={Profile}
        options={{
          tabBarIcon: ProfileIcon,
        }}
      />

    </Tab.Navigator>
  );
}

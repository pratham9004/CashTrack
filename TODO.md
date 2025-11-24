# CashTrack Category Management Upgrade

## Overview
Upgrade Income and Expense screens to use predefined categories instead of manual text input. Add category management functionality.

## Tasks
- [ ] Add category management functions to firestoreService.js (add, get, update, delete for income and expense categories)
- [ ] Create ManageCategories.js screen with add, edit, delete functionality for categories
- [ ] Update BottomTabNavigator.js to include ManageCategories tab
- [ ] Update Income.js to use Picker for category selection, fetch categories, handle no categories case
- [ ] Update Expenses.js similarly to Income.js
- [ ] Test category creation, selection, and transaction addition
- [ ] Ensure Firestore security rules allow category operations

## Files to Modify
- firebase/firestoreService.js
- screens/ManageCategories.js (new)
- navigation/BottomTabNavigator.js
- screens/Income.js
- screens/Expenses.js

## Notes
- Use @react-native-picker/picker for dropdown
- Store categories in users/{uid}/categories/income and users/{uid}/categories/expense
- If no categories, show message and disable add transaction
- Update addIncome/addExpense to use selected category

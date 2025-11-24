// Utility functions for the app

export const formatCurrency = (amount, currency = 'INR') => {
  const num = Number(amount);
  if (isNaN(num) || !isFinite(num)) {
    return getCurrencySymbol(currency) + '0';
  }
  // Custom formatting to avoid toLocaleString issues and floating-point precision problems
  const absNum = Math.abs(num);
  const parts = absNum.toFixed(2).split('.');
  parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  return `${getCurrencySymbol(currency)}${parts.join('.')}`;
};

export const getCurrencySymbol = (currency) => {
  switch (currency) {
    case 'USD': return '$';
    case 'EUR': return '€';
    case 'INR': default: return '₹';
  }
};

export const calculateTotal = (items) => {
  return items.reduce((total, item) => total + item.amount, 0);
};

export const getCurrentDate = () => {
  return new Date().toISOString().split('T')[0];
};

export const validateEmail = (email) => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

export const validatePhone = (phone) => {
  const phoneRegex = /^\+?[\d\s\-\(\)]+$/;
  return phoneRegex.test(phone);
};

export const generateId = () => {
  return Date.now().toString() + Math.random().toString(36).substr(2, 9);
};

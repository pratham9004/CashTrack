import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useSettings } from '../contexts/SettingsContext';

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('ErrorBoundary caught an error:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      // Since this is a class component, we can't use hooks directly
      // We'll use a wrapper functional component
      return <ErrorBoundaryContent />;
    }

    return this.props.children;
  }
}

// Functional component to use hooks
function ErrorBoundaryContent() {
  const { getThemeColors } = useSettings();
  const theme = getThemeColors();

  return (
    <View style={[styles.errorContainer, { backgroundColor: theme.backgroundColor }]}>
      <Text style={[styles.errorText, { color: '#f44336' }]}>Something went wrong.</Text>
      <Text style={[styles.errorSubtext, { color: theme.secondaryTextColor }]}>Unable to display this component.</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  errorText: {
    fontSize: 18,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 10,
  },
  errorSubtext: {
    fontSize: 14,
    textAlign: 'center',
  },
});

export default ErrorBoundary;

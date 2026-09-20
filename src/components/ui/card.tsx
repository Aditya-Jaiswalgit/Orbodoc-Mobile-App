import React from 'react';
import { View, TouchableOpacity, StyleSheet, ViewStyle, StyleProp } from 'react-native';

export interface CardProps {
  children?: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  className?: string;
  onClick?: () => void;
  onPress?: () => void;
}

export const Card: React.FC<CardProps> = ({ children, style, onClick, onPress }) => {
  const handlePress = onPress || onClick;
  if (handlePress) {
    return (
      <TouchableOpacity
        style={[styles.card, style]}
        onPress={handlePress}
        activeOpacity={0.7}>
        {children}
      </TouchableOpacity>
    );
  }
  return <View style={[styles.card, style]}>{children}</View>;
};

export interface CardContentProps {
  children?: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  className?: string;
}

export const CardContent: React.FC<CardContentProps> = ({ children, style }) => {
  return <View style={[styles.content, style]}>{children}</View>;
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 2,
  },
  content: {
    padding: 12,
  },
});

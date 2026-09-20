import React from 'react';
import { View, Text, StyleSheet, ViewStyle, TextStyle, StyleProp } from 'react-native';

export interface BadgeProps {
  children?: React.ReactNode;
  variant?: 'outline' | 'default' | 'secondary' | 'destructive';
  style?: StyleProp<ViewStyle>;
  textStyle?: StyleProp<TextStyle>;
  className?: string;
}

export const Badge: React.FC<BadgeProps> = ({ children, style, textStyle }) => {
  return (
    <View style={[styles.badge, style]}>
      {typeof children === 'string' ? (
        <Text style={[styles.badgeText, textStyle]}>{children}</Text>
      ) : (
        children
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    backgroundColor: '#F8FAFC',
    alignSelf: 'flex-start',
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#475569',
  },
});

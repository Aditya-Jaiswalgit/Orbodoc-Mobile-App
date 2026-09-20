import React from 'react';
import { TouchableOpacity, Text, StyleSheet, ViewStyle, TextStyle, StyleProp } from 'react-native';

export interface ButtonProps {
  children?: React.ReactNode;
  variant?: 'default' | 'ghost' | 'outline' | 'destructive';
  size?: 'default' | 'sm' | 'lg' | 'icon';
  style?: StyleProp<ViewStyle>;
  textStyle?: StyleProp<TextStyle>;
  onClick?: () => void;
  onPress?: () => void;
  className?: string;
  disabled?: boolean;
}

export const Button: React.FC<ButtonProps> = ({
  children,
  style,
  textStyle,
  onClick,
  onPress,
  disabled,
}) => {
  return (
    <TouchableOpacity
      style={[styles.button, style]}
      onPress={onPress || onClick}
      disabled={disabled}
      activeOpacity={0.7}>
      {typeof children === 'string' ? (
        <Text style={[styles.buttonText, textStyle]}>{children}</Text>
      ) : (
        children
      )}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  button: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#0F172A',
  },
});

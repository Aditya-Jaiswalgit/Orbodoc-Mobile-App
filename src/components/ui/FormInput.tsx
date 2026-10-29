import { StyleProp, StyleSheet, TextInput, TextInputProps, TextStyle } from 'react-native';
import { colors, radii, spacing, typography } from '../../theme/tokens';

export interface FormInputProps extends TextInputProps {
  error?: boolean;
}

/** Shared text field styling; callers retain control of value and event props. */
export function FormInput({
  error = false,
  style,
  placeholderTextColor = colors.subtle,
  selectionColor = colors.primary,
  ...props
}: FormInputProps) {
  return (
    <TextInput
      {...props}
      placeholderTextColor={placeholderTextColor}
      selectionColor={selectionColor}
      style={[styles.input, error && styles.error, style as StyleProp<TextStyle>]}
    />
  );
}

const styles = StyleSheet.create({
  input: {
    minHeight: 44,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderWidth: 1,
    borderColor: colors.input,
    borderRadius: radii.md,
    backgroundColor: colors.surface,
    color: colors.text,
    fontFamily: typography.family,
    fontSize: typography.size.body,
    lineHeight: typography.lineHeight.body,
  },
  error: { borderColor: colors.destructive },
});

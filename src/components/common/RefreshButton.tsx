import { colors, radii, spacing, typography } from '../../theme/tokens';
import React, { useState } from 'react';
import {
  Animated,
  Easing,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  ViewStyle,
  TextStyle,
} from 'react-native';
import { RefreshCw } from 'lucide-react-native';

interface RefreshButtonProps {
  onRefresh: () => void | Promise<unknown>;
  loading?: boolean;
  disabled?: boolean;
  label?: string;
  refreshingLabel?: string;
  style?: ViewStyle;
  buttonStyle?: ViewStyle;
  textStyle?: TextStyle;
  size?: 'sm' | 'default';
  timestampOnSecondLine?: boolean;
}

const formatRefreshTime = (date: Date, compact = false) => {
  const day = date.getDate();
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const month = months[date.getMonth()];
  const year = date.getFullYear();
  let hours = date.getHours();
  const minutes = date.getMinutes().toString().padStart(2, '0');
  const ampm = hours >= 12 ? 'pm' : 'am';
  hours = hours % 12;
  hours = hours ? hours : 12;
  const time = compact
    ? `${hours}:${minutes} ${ampm}`
    : `${hours}:${minutes}:${date.getSeconds().toString().padStart(2, '0')} ${ampm}`;
  return `${day} ${month} ${year}, ${time}`;
};

export const RefreshButton: React.FC<RefreshButtonProps> = ({
  onRefresh,
  loading = false,
  disabled = false,
  label = 'Refresh',
  refreshingLabel = 'Refreshing...',
  style,
  buttonStyle,
  textStyle,
  size = 'default',
  timestampOnSecondLine = false,
}) => {
  const [internalLoading, setInternalLoading] = useState(false);
  const [lastRefreshedAt, setLastRefreshedAt] = useState(() => new Date());
  const isLoading = loading || internalLoading;

  const spinValue = React.useRef(new Animated.Value(0)).current;
  const spinAnimation = React.useRef<Animated.CompositeAnimation | null>(null);

  React.useEffect(() => {
    if (!isLoading) {
      spinAnimation.current?.stop();
      spinAnimation.current = null;
      spinValue.setValue(0);
      return;
    }

    const animation = Animated.loop(
      Animated.timing(spinValue, {
        toValue: 1,
        duration: 1000,
        easing: Easing.linear,
        useNativeDriver: true,
      }),
    );
    spinAnimation.current = animation;
    animation.start();

    return () => {
      animation.stop();
      if (spinAnimation.current === animation) spinAnimation.current = null;
    };
  }, [isLoading, spinValue]);

  const spin = spinValue.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  const handleRefresh = async () => {
    if (isLoading || disabled) return;
    setInternalLoading(true);
    try {
      await onRefresh();
      setLastRefreshedAt(new Date());
    } finally {
      setInternalLoading(false);
    }
  };

  const iconSize = size === 'sm' ? 14 : 15;

  return (
    <View style={[styles.container, style]}>
      <TouchableOpacity
        style={[
          styles.button,
          size === 'sm' && styles.buttonSm,
          buttonStyle,
          (disabled || isLoading) && styles.buttonDisabled,
        ]}
        disabled={disabled || isLoading}
        activeOpacity={0.8}
        onPress={handleRefresh}>
        {isLoading ? (
          <Animated.View style={{ transform: [{ rotate: spin }] }}>
            <RefreshCw size={iconSize} color={colors.text} />
          </Animated.View>
        ) : (
          <RefreshCw size={iconSize} color={colors.text} />
        )}
        <Text style={[styles.buttonText, size === 'sm' && styles.buttonTextSm, textStyle]}>
          {isLoading ? refreshingLabel : label}
        </Text>
      </TouchableOpacity>
      <Text style={[styles.lastUpdatedText, timestampOnSecondLine && styles.lastUpdatedTextTwoLine]}>
        {timestampOnSecondLine
          ? `Last refreshed:\n${formatRefreshTime(lastRefreshedAt, true)}`
          : `Last refreshed: ${formatRefreshTime(lastRefreshedAt)}`}
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    width: '100%',
    alignItems: 'flex-start',
    gap: spacing.xs,
  },
  button: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    height: 44,
    paddingHorizontal: spacing.lg,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  buttonSm: {
    height: 40,
    paddingHorizontal: spacing.sm,
    gap: spacing.tiny,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonText: {
    fontFamily: typography.family, fontSize: typography.size.body,
    fontWeight: typography.weight.semibold,
    color: colors.text,
  },
  buttonTextSm: {
    fontFamily: typography.family, fontSize: typography.size.caption,
    fontWeight: typography.weight.semibold,
  },
  lastUpdatedText: {
    fontFamily: typography.family, fontSize: typography.size.xs,
    color: colors.muted,
    marginTop: 2,
    paddingLeft: 2,
  },
  lastUpdatedTextTwoLine: {
    fontFamily: typography.family, width: 190,
    fontSize: typography.size.micro,
    lineHeight: 14,
  },
});

export default RefreshButton;

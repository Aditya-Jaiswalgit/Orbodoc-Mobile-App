import React, { useState } from 'react';
import {
  ActivityIndicator,
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
}

const formatRefreshTime = (date: Date) => {
  const day = date.getDate();
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const month = months[date.getMonth()];
  const year = date.getFullYear();
  let hours = date.getHours();
  const minutes = date.getMinutes().toString().padStart(2, '0');
  const seconds = date.getSeconds().toString().padStart(2, '0');
  const ampm = hours >= 12 ? 'pm' : 'am';
  hours = hours % 12;
  hours = hours ? hours : 12;
  return `${day} ${month} ${year}, ${hours}:${minutes}:${seconds} ${ampm}`;
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
}) => {
  const [internalLoading, setInternalLoading] = useState(false);
  const [lastRefreshedAt, setLastRefreshedAt] = useState(() => new Date());
  const isLoading = loading || internalLoading;

  const spinValue = React.useRef(new Animated.Value(0)).current;

  React.useEffect(() => {
    if (isLoading) {
      Animated.loop(
        Animated.timing(spinValue, {
          toValue: 1,
          duration: 1000,
          easing: Easing.linear,
          useNativeDriver: true,
        }),
      ).start();
    } else {
      spinValue.setValue(0);
    }
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
            <RefreshCw size={iconSize} color="#0f172a" />
          </Animated.View>
        ) : (
          <RefreshCw size={iconSize} color="#0f172a" />
        )}
        <Text style={[styles.buttonText, size === 'sm' && styles.buttonTextSm, textStyle]}>
          {isLoading ? refreshingLabel : label}
        </Text>
      </TouchableOpacity>
      <Text style={styles.lastUpdatedText}>
        Last refreshed: {formatRefreshTime(lastRefreshedAt)}
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    width: '100%',
    alignItems: 'flex-start',
    gap: 4,
  },
  button: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    height: 44,
    paddingHorizontal: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    backgroundColor: '#ffffff',
  },
  buttonSm: {
    height: 40,
    paddingHorizontal: 8,
    gap: 6,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#0f172a',
  },
  buttonTextSm: {
    fontSize: 13,
    fontWeight: '600',
  },
  lastUpdatedText: {
    fontSize: 11,
    color: '#64748b',
    marginTop: 2,
    paddingLeft: 2,
  },
});

export default RefreshButton;

import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';

interface StatCardProps {
  title: string;
  value: string | number;
  icon: React.ReactNode;
  subtitle?: string;
  iconBgColor?: string;
  cardBgColor?: string;
  borderColor?: string;
  textColor?: string;
  onPress?: () => void;
}

export const StatCard: React.FC<StatCardProps> = ({
  title,
  value,
  icon,
  subtitle,
  iconBgColor = 'rgba(13, 148, 136, 0.15)',
  cardBgColor = '#ffffff',
  borderColor = '#e2e8f0',
  textColor = '#0f172a',
  onPress,
}) => {
  return (
    <TouchableOpacity
      style={[
        styles.card,
        { backgroundColor: cardBgColor, borderColor },
      ]}
      onPress={onPress}
      activeOpacity={0.8}
      disabled={!onPress}>
      <View style={[styles.iconContainer, { backgroundColor: iconBgColor }]}>
        {icon}
      </View>
      <View style={styles.textContainer}>
        <Text style={[styles.valueText, { color: textColor }]}>{value}</Text>
        <Text style={styles.titleText}>{title}</Text>
        {subtitle ? <Text style={styles.subtitleText}>{subtitle}</Text> : null}
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 14,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    shadowColor: '#0f172a',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 2,
  },
  iconContainer: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  textContainer: {
    flex: 1,
  },
  valueText: {
    color: '#0f172a',
    fontSize: 20,
    fontWeight: '800',
  },
  titleText: {
    color: '#475569',
    fontSize: 13,
    fontWeight: '600',
    marginTop: 2,
  },
  subtitleText: {
    color: '#94a3b8',
    fontSize: 11,
    marginTop: 1,
  },
});

export default StatCard;

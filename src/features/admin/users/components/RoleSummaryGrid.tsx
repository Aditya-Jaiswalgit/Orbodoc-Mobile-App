// src/features/admin/users/components/RoleSummaryGrid.tsx
import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { roleConfig } from '../constants';

export type RoleSummaryGridProps = {
  counts: Record<string, number>;
  selectedRole: string;
  setSelectedRole: (value: string) => void;
};

export function RoleSummaryGrid({
  counts,
  selectedRole,
  setSelectedRole,
}: RoleSummaryGridProps) {
  return (
    <View style={styles.gridContainer}>
      {Object.entries(roleConfig).map(([role, config]) => {
        const Icon = config.icon;
        const count = counts[role] || 0;
        const isSelected = selectedRole === role;

        return (
          <TouchableOpacity
            key={role}
            activeOpacity={0.7}
            onPress={() => setSelectedRole(isSelected ? 'all' : role)}
            style={[
              styles.card,
              isSelected && styles.selectedCard,
            ]}>
            <View style={styles.cardContent}>
              <View
                style={[
                  styles.iconContainer,
                  { backgroundColor: config.badgeBg || '#F3F4F6' },
                ]}>
                {Icon ? (
                  <Icon size={20} color={config.badgeText || '#374151'} />
                ) : null}
              </View>
              <Text style={styles.countText}>{count}</Text>
              <Text style={styles.labelText} numberOfLines={1}>
                {config.label}
              </Text>
            </View>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  gridContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginHorizontal: -4,
    marginVertical: 6,
  },
  card: {
    width: '23%',
    minWidth: 80,
    margin: '1%',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    paddingVertical: 10,
    paddingHorizontal: 6,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  selectedCard: {
    borderColor: '#0D9488',
    borderWidth: 2,
    backgroundColor: '#F0FDFA',
  },
  cardContent: {
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
  },
  iconContainer: {
    width: 38,
    height: 38,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 6,
  },
  countText: {
    fontSize: 18,
    fontWeight: '700',
    color: '#0F172A',
    marginBottom: 2,
  },
  labelText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#64748B',
    textAlign: 'center',
  },
});

export default RoleSummaryGrid;

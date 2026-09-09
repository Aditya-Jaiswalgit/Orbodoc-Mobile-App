import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

interface LabStatCardProps {
  label: string;
  value: string | number;
  icon: React.ReactNode;
}

export const LabStatCard: React.FC<LabStatCardProps> = ({ label, value, icon }) => {
  return (
    <View style={styles.card}>
      <View style={styles.leftCol}>
        <Text style={styles.label}>{label}</Text>
        <Text style={styles.value}>{value}</Text>
      </View>
      <View style={styles.iconCircle}>
        {icon}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    flex: 1,
    backgroundColor: '#ffffff',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    paddingHorizontal: 16,
    paddingVertical: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    minHeight: 78,
    shadowColor: '#0f172a',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.02,
    shadowRadius: 3,
    elevation: 1,
  },
  leftCol: {
    flex: 1,
    justifyContent: 'center',
  },
  label: {
    fontSize: 12.5,
    color: '#64748b',
    fontWeight: '500',
    marginBottom: 4,
  },
  value: {
    fontSize: 20,
    fontWeight: '800',
    color: '#0f172a',
  },
  iconCircle: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#ecfdf5',
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 8,
  },
});

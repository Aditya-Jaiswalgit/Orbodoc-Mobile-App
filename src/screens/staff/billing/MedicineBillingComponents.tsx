import React from 'react';
import { Text, TouchableOpacity, View } from 'react-native';
import { X } from 'lucide-react-native';
import { styles } from '../styles/MedicineBilling.styles';
export function MetricCard({
  icon,
  iconColor,
  value,
  label,
  danger = false,
}: {
  icon: React.ReactNode;
  iconColor: string;
  value: string;
  label: string;
  danger?: boolean;
}) {
  return (
    <View style={styles.metricCard}>
      <View style={[styles.metricIcon, { backgroundColor: iconColor }]}>
        {icon}
      </View>
      <View style={styles.metricCopy}>
        <Text
          numberOfLines={1}
          adjustsFontSizeToFit
          minimumFontScale={0.75}
          style={[styles.metricNumber, danger && styles.extractedInlineDanger]}
        >
          {value}
        </Text>
        <Text numberOfLines={1} style={styles.metricCaption}>
          {label}
        </Text>
      </View>
    </View>
  );
}
export function BillMetric({
  label,
  value,
  valueColor = '#0F172A',
}: {
  label: string;
  value: string;
  valueColor?: string;
}) {
  return (
    <View style={styles.gridMetric}>
      <Text style={styles.metricLabel}>{label}</Text>
      <Text
        numberOfLines={1}
        adjustsFontSizeToFit
        minimumFontScale={0.8}
        style={[styles.metricValue, { color: valueColor }]}
      >
        {value}
      </Text>
    </View>
  );
}
export function Info({
  label,
  value,
  bold = false,
}: {
  label: string;
  value: string;
  bold?: boolean;
}) {
  return (
    <View style={styles.info}>
      <Text style={styles.muted}>{label}</Text>
      <Text style={[styles.optionText, bold && styles.bold]}>{value}</Text>
    </View>
  );
}
export function ModalHeader({
  title,
  onClose,
}: {
  title: string;
  onClose: () => void;
}) {
  return (
    <View style={styles.modalHeader}>
      <View style={styles.flex}>
        <Text style={styles.modalTitle}>{title}</Text>
      </View>
      <TouchableOpacity onPress={onClose} style={styles.close}>
        <X size={18} color="#475569" />
      </TouchableOpacity>
    </View>
  );
}

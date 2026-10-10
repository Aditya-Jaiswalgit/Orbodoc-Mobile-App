import React from 'react';
import { AppModal } from '../../../components/common/AppModal';
import { ActivityIndicator, KeyboardAvoidingView, Platform, ScrollView, Text, TouchableOpacity, View } from 'react-native';
import { Pill, X } from 'lucide-react-native';
import { styles } from '../styles/PharmacyInventory.styles';
export function InfoTile({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.infoTile}>
      <Text style={styles.infoLabel}>{label}</Text>
      <Text style={styles.infoValue} numberOfLines={2}>
        {value}
      </Text>
    </View>
  );
}

export function StatCard({
  icon,
  label,
  value,
  tone,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  tone: 'teal' | 'green' | 'amber' | 'blue';
}) {
  return (
    <View style={styles.statCard}>
      <View
        style={[
          styles.statIcon,
          tone === 'teal'
            ? styles.statTeal
            : tone === 'green'
            ? styles.statGreen
            : tone === 'amber'
            ? styles.statAmber
            : styles.statBlue,
        ]}
      >
        {icon}
      </View>
      <View style={styles.statCopy}>
        <Text
          style={styles.statValue}
          numberOfLines={1}
          adjustsFontSizeToFit
          minimumFontScale={0.72}
        >
          {value}
        </Text>
        <Text style={styles.statLabel}>{label}</Text>
      </View>
    </View>
  );
}

export function MenuAction({
  icon,
  label,
  onPress,
  destructive = false,
  highlighted = false,
}: {
  icon: React.ReactNode;
  label: string;
  onPress: () => void;
  destructive?: boolean;
  highlighted?: boolean;
}) {
  return (
    <TouchableOpacity
      style={[styles.menuAction, highlighted && styles.menuActionHighlighted]}
      onPress={onPress}
    >
      {icon}
      <Text
        style={[
          styles.menuActionText,
          destructive && styles.destructiveText,
          highlighted && styles.menuActionTextHighlighted,
        ]}
      >
        {label}
      </Text>
    </TouchableOpacity>
  );
}

export function FormModal({
  visible,
  variant,
  title,
  subtitle,
  saving,
  disableSave = false,
  onClose,
  onSave,
  children,
  saveLabel = 'Save Medicine',
}: {
  visible: boolean;
  variant?: 'medicine' | 'stock';
  title: string;
  subtitle?: string;
  saving: boolean;
  disableSave?: boolean;
  onClose: () => void;
  onSave: () => void;
  children: React.ReactNode;
  saveLabel?: string;
}) {
  const isMedicine = variant === 'medicine';
  const isStock = variant === 'stock';
  return (
    <AppModal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <View
        style={
          isMedicine
            ? styles.medicineModalBackdrop
            : isStock
            ? styles.stockModalBackdrop
            : styles.modalBackdrop
        }
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={
            isMedicine
              ? styles.medicineModalShell
              : isStock
              ? styles.stockModalShell
              : styles.modalShell
          }
        >
          <View
            style={[
              styles.modalCard,
              isMedicine && styles.medicineModalCard,
              isStock && styles.stockModalCard,
            ]}
          >
            <View
              style={
                isMedicine
                  ? styles.medicineModalHeader
                  : isStock
                  ? styles.stockModalHeader
                  : styles.modalHeader
              }
            >
              {isStock ? (
                <View style={styles.stockHeaderCopy}>
                  <Text style={styles.modalTitle}>{title}</Text>
                  {subtitle ? (
                    <Text style={styles.stockModalSubtitle}>{subtitle}</Text>
                  ) : null}
                </View>
              ) : (
                <View style={styles.modalHeading}>
                  <View
                    style={[
                      styles.modalIcon,
                      isMedicine && styles.medicineModalIcon,
                    ]}
                  >
                    <Pill
                      size={18}
                      color={isMedicine ? '#FFFFFF' : '#0D9488'}
                    />
                  </View>
                  <View style={styles.modalHeaderCopy}>
                    <Text
                      style={[
                        styles.modalTitle,
                        isMedicine && styles.medicineModalTitle,
                      ]}
                    >
                      {title}
                    </Text>
                    {subtitle ? (
                      <Text style={styles.medicineModalSubtitle}>
                        {subtitle}
                      </Text>
                    ) : null}
                  </View>
                </View>
              )}
              <TouchableOpacity
                accessibilityLabel="Close dialog"
                onPress={onClose}
                style={isStock ? styles.stockCloseButton : styles.closeButton}
              >
                <X size={18} color="#475569" />
              </TouchableOpacity>
            </View>
            <ScrollView
              style={
                isMedicine
                  ? styles.medicineFormScroll
                  : isStock
                  ? styles.stockFormScroll
                  : styles.formScroll
              }
              contentContainerStyle={
                isMedicine
                  ? styles.medicineFormContent
                  : isStock
                  ? styles.stockFormContent
                  : styles.formContent
              }
              keyboardShouldPersistTaps="handled"
            >
              {children}
            </ScrollView>
            {isStock ? (
              <View style={styles.stockModalFooter}>
                <TouchableOpacity
                  disabled={saving || disableSave}
                  style={[
                    styles.stockSaveButton,
                    (saving || disableSave) && styles.disabledButton,
                  ]}
                  onPress={onSave}
                >
                  {saving ? (
                    <ActivityIndicator size="small" color="#FFFFFF" />
                  ) : null}
                  <Text style={styles.saveText}>
                    {saving ? 'Updating...' : saveLabel}
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.stockCancelButton}
                  onPress={onClose}
                >
                  <Text style={styles.cancelText}>Cancel</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <View style={styles.modalFooter}>
                <TouchableOpacity style={styles.cancelButton} onPress={onClose}>
                  <Text style={styles.cancelText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  disabled={saving || disableSave}
                  style={[
                    styles.saveButton,
                    (saving || disableSave) && styles.disabledButton,
                  ]}
                  onPress={onSave}
                >
                  {saving ? (
                    <ActivityIndicator size="small" color="#FFFFFF" />
                  ) : null}
                  <Text style={styles.saveText}>
                    {saving ? 'Saving...' : saveLabel}
                  </Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        </KeyboardAvoidingView>
      </View>
    </AppModal>
  );
}

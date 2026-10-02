import React, { useState } from 'react';
import {
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import {
  CalendarClock,
  Clock,
  PhoneCall,
  Receipt,
  Search,
  Video,
} from 'lucide-react-native';
import { StaffHeader } from '../../components/common/StaffHeader';

interface StaffVideoServicesScreenProps {
  onOpenDrawer: () => void;
}

type TabType = 'calls' | 'consultancy' | 'billing';

export const StaffVideoServicesScreen: React.FC<StaffVideoServicesScreenProps> = ({
  onOpenDrawer,
}) => {
  const [activeTab, setActiveTab] = useState<TabType>('calls');
  const [searchQuery, setSearchQuery] = useState('');

  return (
    <View style={styles.container}>
      <StaffHeader onOpenDrawer={onOpenDrawer} />

      {/* Top Title Banner */}
      <View style={styles.titleBanner}>
        <View style={styles.titleRow}>
          <View style={styles.iconCircle}>
            <Video size={22} color="#0D9488" />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.screenTitle}>Video Services</Text>
            <Text style={styles.screenSubtitle}>
              Manage video consultations, schedule, and tele-billing
            </Text>
          </View>
        </View>

        {/* Tab Switcher */}
        <View style={styles.tabBar}>
          <TouchableOpacity
            style={[styles.tabButton, activeTab === 'calls' && styles.tabButtonActive]}
            onPress={() => setActiveTab('calls')}
          >
            <PhoneCall
              size={15}
              color={activeTab === 'calls' ? '#0D9488' : '#64748B'}
            />
            <Text
              style={[
                styles.tabButtonText,
                activeTab === 'calls' && styles.tabButtonTextActive,
              ]}
            >
              Video Calls
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.tabButton,
              activeTab === 'consultancy' && styles.tabButtonActive,
            ]}
            onPress={() => setActiveTab('consultancy')}
          >
            <CalendarClock
              size={15}
              color={activeTab === 'consultancy' ? '#0D9488' : '#64748B'}
            />
            <Text
              style={[
                styles.tabButtonText,
                activeTab === 'consultancy' && styles.tabButtonTextActive,
              ]}
            >
              Consultancy
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.tabButton,
              activeTab === 'billing' && styles.tabButtonActive,
            ]}
            onPress={() => setActiveTab('billing')}
          >
            <Receipt
              size={15}
              color={activeTab === 'billing' ? '#0D9488' : '#64748B'}
            />
            <Text
              style={[
                styles.tabButtonText,
                activeTab === 'billing' && styles.tabButtonTextActive,
              ]}
            >
              Tele-Billing
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
      >
        {/* Search Bar */}
        <View style={styles.searchBox}>
          <Search size={18} color="#94A3B8" />
          <TextInput
            style={styles.searchInput}
            placeholder={`Search ${activeTab}...`}
            placeholderTextColor="#94A3B8"
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
        </View>

        {/* Content Box */}
        <View style={styles.emptyCard}>
          <View style={styles.emptyIconBg}>
            {activeTab === 'calls' ? (
              <Video size={36} color="#0D9488" />
            ) : activeTab === 'consultancy' ? (
              <Clock size={36} color="#0D9488" />
            ) : (
              <Receipt size={36} color="#0D9488" />
            )}
          </View>
          <Text style={styles.emptyTitle}>
            {activeTab === 'calls'
              ? 'No Active Video Calls'
              : activeTab === 'consultancy'
              ? 'No Tele-Consultancy Slots'
              : 'No Tele-Consultation Bills'}
          </Text>
          <Text style={styles.emptyDesc}>
            {activeTab === 'calls'
              ? 'Scheduled patient tele-consultations will appear here when appointments are confirmed.'
              : activeTab === 'consultancy'
              ? 'Set up doctor video availability in your profile to accept online patient consultations.'
              : 'Completed tele-consultations with outstanding or settled invoices will be listed here.'}
          </Text>
        </View>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  titleBanner: {
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 14,
  },
  iconCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#CCFBF1',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  screenTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: '#0F172A',
  },
  screenSubtitle: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 2,
  },
  tabBar: {
    flexDirection: 'row',
    backgroundColor: '#F1F5F9',
    borderRadius: 10,
    padding: 3,
    marginTop: 4,
  },
  tabButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    borderRadius: 8,
    gap: 6,
  },
  tabButtonActive: {
    backgroundColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 2,
    elevation: 2,
  },
  tabButtonText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#64748B',
  },
  tabButtonTextActive: {
    color: '#0D9488',
    fontWeight: '700',
  },
  scrollContent: {
    padding: 16,
  },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 12,
    paddingHorizontal: 14,
    height: 46,
    marginBottom: 16,
  },
  searchInput: {
    flex: 1,
    marginLeft: 8,
    fontSize: 14,
    color: '#0F172A',
  },
  emptyCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 32,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginTop: 10,
  },
  emptyIconBg: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: '#F0FDFA',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0F172A',
    marginBottom: 6,
    textAlign: 'center',
  },
  emptyDesc: {
    fontSize: 13,
    color: '#64748B',
    textAlign: 'center',
    lineHeight: 18,
    paddingHorizontal: 12,
  },
});

export default StaffVideoServicesScreen;

import { StyleSheet } from 'react-native';

export const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 110,
  },

  // 1. Page Header (Exact Screenshot)
  pageHeader: {
    marginBottom: 16,
  },
  pageTitle: {
    fontFamily: 'Inter', fontSize: 24,
    fontWeight: '900',
    color: '#0f172a',
    letterSpacing: -0.6,
  },
  pageSubtitle: {
    fontFamily: 'Inter', fontSize: 13,
    color: '#64748b',
    marginTop: 6,
    lineHeight: 18,
  },

  // 2. Vertical Tabs Stack (Exact Screenshot)
  tabsStack: {
    backgroundColor: '#cbd5e1',
    borderRadius: 8,
    padding: 3,
    gap: 2,
    marginBottom: 16,
  },
  tabItemBtn: {
    paddingVertical: 9,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 6,
  },
  tabItemBtnActive: {
    backgroundColor: '#ffffff',
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowOffset: { width: 0, height: 1 },
    shadowRadius: 2,
    elevation: 2,
  },
  tabItemText: {
    fontFamily: 'Inter', fontSize: 13,
    fontWeight: '500',
    color: '#475569',
    textAlign: 'center',
  },
  tabItemTextActive: {
    color: '#0f172a',
    fontWeight: '600',
  },

  // 3. Main White Card Container (Exact Screenshot)
  mainWhiteCard: {
    backgroundColor: '#ffffff',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    padding: 16,
    shadowColor: '#0f172a',
    shadowOpacity: 0.03,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 6,
    elevation: 1,
  },
  cardHeaderTitle: {
    fontFamily: 'Inter', fontSize: 24,
    fontWeight: '800',
    color: '#0f172a',
    marginBottom: 12,
  },

  // Full-width Unread Strip (Exact Screenshot)
  unreadStrip: {
    backgroundColor: '#f1f5f9',
    borderRadius: 8,
    paddingVertical: 9,
    paddingHorizontal: 12,
    marginBottom: 12,
  },
  unreadStripText: {
    fontFamily: 'Inter', fontSize: 13,
    fontWeight: '600',
    color: '#0f172a',
  },

  // Mark All Read Button (Exact Screenshot)
  markAllReadButton: {
    width: '100%',
    height: 44,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 8,
    marginBottom: 10,
  },
  markAllReadText: {
    fontFamily: 'Inter', fontSize: 14,
    fontWeight: '600',
    color: '#0f172a',
  },

  // Clear History Button (Exact Screenshot)
  clearHistoryButton: {
    width: '100%',
    height: 44,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#fecaca',
    borderRadius: 8,
    marginBottom: 14,
  },
  clearHistoryText: {
    fontFamily: 'Inter', fontSize: 14,
    fontWeight: '600',
    color: '#ef4444',
  },

  // Search Box (Exact Screenshot)
  searchBox: {
    width: '100%',
    height: 44,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 8,
    paddingHorizontal: 12,
    marginBottom: 10,
  },
  searchInput: {
    fontFamily: 'Inter', flex: 1,
    height: 44,
    fontSize: 14,
    color: '#0f172a',
  },

  // Select Triggers (Exact Screenshot)
  selectTriggerBox: {
    width: '100%',
    height: 44,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 8,
    paddingHorizontal: 14,
    marginBottom: 10,
  },
  selectTriggerText: {
    fontFamily: 'Inter', fontSize: 14,
    fontWeight: '500',
    color: '#334155',
  },

  // Notification Cards List
  cardsList: {
    gap: 12,
  },

  // Notification Card (Exact Screenshot: Cyan tint with border for unread)
  notifCard: {
    borderRadius: 16,
    padding: 16,
  },
  notifCardUnread: {
    backgroundColor: '#ecfeff',
    borderWidth: 1,
    borderColor: '#a5f3fc',
  },
  notifCardRead: {
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },

  notifCardTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  notifCardTitle: {
    fontFamily: 'Inter', fontSize: 16,
    fontWeight: '700',
    color: '#0f172a',
  },
  notifCardDate: {
    fontFamily: 'Inter', fontSize: 12,
    color: '#64748b',
    marginTop: 3,
  },
  notifPillBadge: {
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 9999,
    paddingHorizontal: 10,
    paddingVertical: 2,
    alignSelf: 'flex-start',
  },
  notifPillBadgeText: {
    fontFamily: 'Inter', fontSize: 12,
    fontWeight: '600',
    color: '#0f172a',
  },
  notifPillBadgeRead: {
    backgroundColor: '#f1f5f9',
    borderColor: 'transparent',
  },
  notifPillBadgeReadText: {
    color: '#475569',
  },
  notifCardMessage: {
    fontFamily: 'Inter', fontSize: 14,
    color: '#334155',
    lineHeight: 21,
    marginTop: 12,
    marginBottom: 14,
  },

  notifCardFooterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: 'rgba(226, 232, 240, 0.9)',
  },
  notifToLabel: {
    fontFamily: 'Inter', fontSize: 12,
    color: '#64748b',
  },
  notifToName: {
    fontWeight: '600',
    color: '#334155',
  },
  notifRolePill: {
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 9999,
    paddingHorizontal: 10,
    paddingVertical: 3,
  },
  notifRolePillText: {
    fontFamily: 'Inter', fontSize: 12,
    fontWeight: '500',
    color: '#334155',
  },

  // Loader & Empty States
  loaderBox: {
    paddingVertical: 40,
    alignItems: 'center',
  },
  loadingText: {
    fontFamily: 'Inter', marginTop: 10,
    fontSize: 13,
    color: '#64748b',
  },
  emptyCard: {
    paddingVertical: 40,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderStyle: 'dashed',
    borderRadius: 12,
  },
  emptyText: {
    fontFamily: 'Inter', fontSize: 13,
    color: '#94a3b8',
  },
  disabledButton: {
    opacity: 0.5,
  },

  // Section Header Flex
  sectionHeaderFlex: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },

  // Category Tab Styles (Exact Screenshot)
  categoryCardBox: {
    backgroundColor: '#f8fafc',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    padding: 14,
    marginBottom: 10,
  },
  categoryLine: {
    fontFamily: 'Inter', fontSize: 14,
    color: '#334155',
    lineHeight: 20,
  },
  categoryLabel: {
    fontWeight: '700',
    color: '#1e293b',
  },
  categoryValue: {
    fontWeight: '400',
    color: '#334155',
  },

  // Subscriptions Tab Specifics (Exact Screenshot Match)
  subUserCardBox: {
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    backgroundColor: '#ffffff',
    padding: 16,
    marginBottom: 12,
  },
  subUserName: {
    fontFamily: 'Inter', fontSize: 16,
    fontWeight: '700',
    color: '#0f172a',
  },
  subUserClinic: {
    fontFamily: 'Inter', fontSize: 13,
    color: '#64748b',
    marginTop: 4,
  },
  subCardBodyBox: {
    marginTop: 14,
    paddingTop: 14,
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
  },
  subCatLabel: {
    fontFamily: 'Inter', fontSize: 11,
    fontWeight: '700',
    color: '#64748b',
    letterSpacing: 0.5,
  },
  subCatText: {
    fontFamily: 'Inter', fontSize: 14,
    color: '#334155',
    marginTop: 4,
    lineHeight: 20,
  },
  systemPill: {
    backgroundColor: '#1e293b',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 9999,
  },
  systemPillText: {
    fontFamily: 'Inter', color: '#ffffff',
    fontSize: 12,
    fontWeight: '700',
  },
  activePill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#bbf7d0',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 9999,
  },
  activePillText: {
    fontFamily: 'Inter', color: '#047857',
    fontSize: 12,
    fontWeight: '600',
  },
  manageSubButton: {
    height: 44,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 14,
    backgroundColor: '#ffffff',
  },
  manageSubButtonText: {
    fontFamily: 'Inter', fontSize: 14,
    fontWeight: '600',
    color: '#0f172a',
  },

  // Pagination Row
  paginationRow: {
    marginTop: 14,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
    gap: 8,
  },
  paginationLabel: {
    fontFamily: 'Inter', fontSize: 12,
    color: '#64748b',
  },
  pageNavBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: '#cbd5e1',
    borderRadius: 6,
    backgroundColor: '#ffffff',
  },
  pageNavBtnText: {
    fontFamily: 'Inter', fontSize: 12,
    fontWeight: '600',
    color: '#334155',
  },
  pageNavText: {
    fontFamily: 'Inter', fontSize: 12,
    fontWeight: '600',
    color: '#0f172a',
  },

  // Delivery Logs Specifics (Exact Screenshot Match)
  deliveryLogCard: {
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    backgroundColor: '#ffffff',
    padding: 16,
    marginBottom: 12,
  },
  logGridBox: {
    marginTop: 14,
    paddingTop: 14,
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
  },
  logMetaLabel: {
    fontFamily: 'Inter', fontSize: 12,
    color: '#64748b',
  },
  logMetaVal: {
    fontFamily: 'Inter', fontSize: 14,
    fontWeight: '600',
    color: '#1e293b',
    marginTop: 2,
  },

  // Modals Styling
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  dialogCard: {
    width: '100%',
    maxHeight: '90%',
    backgroundColor: '#ffffff',
    borderRadius: 16,
    overflow: 'hidden',
  },
  dialogHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  dialogTitle: {
    fontFamily: 'Inter', fontSize: 20,
    fontWeight: '800',
    color: '#0f172a',
  },
  dialogSubtitle: {
    fontFamily: 'Inter', fontSize: 12,
    color: '#64748b',
    marginTop: 2,
  },
  categoryGroupBox: {
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    marginBottom: 12,
    overflow: 'hidden',
  },
  categoryGroupTitle: {
    fontFamily: 'Inter', backgroundColor: '#f1f5f9',
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 13,
    fontWeight: '700',
    color: '#0f172a',
  },
  toggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#f8fafc',
  },
  toggleText: {
    fontFamily: 'Inter', fontSize: 13,
    color: '#334155',
    flex: 1,
    marginRight: 10,
  },
  dialogPaginationRow: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
    gap: 8,
  },
  dialogFooter: {
    flexDirection: 'row',
    gap: 10,
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
    backgroundColor: '#ffffff',
  },
  dialogCancelBtn: {
    flex: 1,
    height: 44,
    borderWidth: 1,
    borderColor: '#cbd5e1',
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#ffffff',
  },
  dialogCancelBtnText: {
    fontFamily: 'Inter', fontSize: 13,
    fontWeight: '600',
    color: '#334155',
  },
  dialogSaveBtn: {
    flex: 1.4,
    height: 44,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#0f172a',
  },
  dialogSaveBtnText: {
    fontFamily: 'Inter', fontSize: 13,
    fontWeight: '700',
    color: '#ffffff',
  },


  // Filter Pickers
  pickerBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.4)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  pickerCard: {
    width: '100%',
    maxWidth: 320,
    backgroundColor: '#ffffff',
    borderRadius: 14,
    padding: 16,
    elevation: 10,
  },
  pickerHeaderTitle: {
    fontFamily: 'Inter', fontSize: 16,
    fontWeight: '800',
    color: '#0f172a',
    marginBottom: 12,
  },
  pickerItemRow: {
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  pickerItemRowActive: {
    backgroundColor: '#f0fdf4',
  },
  pickerItemText: {
    fontFamily: 'Inter', fontSize: 14,
    color: '#334155',
    fontWeight: '600',
  },
});

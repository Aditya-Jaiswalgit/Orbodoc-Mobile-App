import { colors, radii, spacing, typography } from '../../../theme/tokens';
import { StyleSheet } from 'react-native';

export const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scrollContent: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
    paddingBottom: 110,
  },

  // 1. Page Header (Exact Screenshot)
  pageHeader: {
    marginBottom: spacing.lg,
  },
  pageTitle: {
    fontFamily: typography.family, fontSize: typography.size.display,
    fontWeight: typography.weight.black,
    color: colors.text,
    letterSpacing: -0.6,
  },
  pageSubtitle: {
    fontFamily: typography.family, fontSize: typography.size.caption,
    color: colors.muted,
    marginTop: spacing.tiny,
    lineHeight: 18,
  },

  // 2. Vertical Tabs Stack (Exact Screenshot)
  tabsStack: {
    backgroundColor: colors.input,
    borderRadius: radii.md,
    padding: 3,
    gap: 2,
    marginBottom: spacing.lg,
  },
  tabItemBtn: {
    paddingVertical: 9,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radii.sm,
  },
  tabItemBtnActive: {
    backgroundColor: colors.surface,
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowOffset: { width: 0, height: 1 },
    shadowRadius: 2,
    elevation: 2,
  },
  tabItemText: {
    fontFamily: typography.family, fontSize: typography.size.caption,
    fontWeight: typography.weight.medium,
    color: colors.muted,
    textAlign: 'center',
  },
  tabItemTextActive: {
    color: colors.text,
    fontWeight: typography.weight.semibold,
  },

  // 3. Main White Card Container (Exact Screenshot)
  mainWhiteCard: {
    backgroundColor: colors.surface,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.lg,
    shadowColor: colors.text,
    shadowOpacity: 0.03,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 6,
    elevation: 1,
  },
  cardHeaderTitle: {
    fontFamily: typography.family, fontSize: typography.size.display,
    fontWeight: typography.weight.extrabold,
    color: colors.text,
    marginBottom: spacing.md,
  },

  // Full-width Unread Strip (Exact Screenshot)
  unreadStrip: {
    backgroundColor: colors.secondary,
    borderRadius: radii.md,
    paddingVertical: 9,
    paddingHorizontal: spacing.md,
    marginBottom: spacing.md,
  },
  unreadStripText: {
    fontFamily: typography.family, fontSize: typography.size.caption,
    fontWeight: typography.weight.semibold,
    color: colors.text,
  },

  // Mark All Read Button (Exact Screenshot)
  markAllReadButton: {
    width: '100%',
    height: 44,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.md,
    marginBottom: 10,
  },
  markAllReadText: {
    fontFamily: typography.family, fontSize: typography.size.body,
    fontWeight: typography.weight.semibold,
    color: colors.text,
  },

  // Clear History Button (Exact Screenshot)
  clearHistoryButton: {
    width: '100%',
    height: 44,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.destructiveSoft,
    borderRadius: radii.md,
    marginBottom: 14,
  },
  clearHistoryText: {
    fontFamily: typography.family, fontSize: typography.size.body,
    fontWeight: typography.weight.semibold,
    color: colors.destructive,
  },

  // Search Box (Exact Screenshot)
  searchBox: {
    width: '100%',
    height: 44,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.md,
    paddingHorizontal: spacing.md,
    marginBottom: 10,
  },
  searchInput: {
    fontFamily: typography.family, flex: 1,
    height: 44,
    fontSize: typography.size.body,
    color: colors.text,
  },

  // Select Triggers (Exact Screenshot)
  selectTriggerBox: {
    width: '100%',
    height: 44,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.md,
    paddingHorizontal: 14,
    marginBottom: 10,
  },
  selectTriggerText: {
    fontFamily: typography.family, fontSize: typography.size.body,
    fontWeight: typography.weight.medium,
    color: colors.foreground,
  },

  // Notification Cards List
  cardsList: {
    gap: spacing.md,
  },
  notifListSeparator: { height: spacing.md },

  // Notification Card (Exact Screenshot: Cyan tint with border for unread)
  notifCard: {
    borderRadius: radii.xl,
    padding: spacing.lg,
  },
  notifCardUnread: {
    backgroundColor: '#ecfeff',
    borderWidth: 1,
    borderColor: '#a5f3fc',
  },
  notifCardRead: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },

  notifCardTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  notifCardTitle: {
    fontFamily: typography.family, fontSize: typography.size.subtitle,
    fontWeight: typography.weight.bold,
    color: colors.text,
  },
  notifCardDate: {
    fontFamily: typography.family, fontSize: typography.size.sm,
    color: colors.muted,
    marginTop: 3,
  },
  notifPillBadge: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 9999,
    paddingHorizontal: 10,
    paddingVertical: 2,
    alignSelf: 'flex-start',
  },
  notifPillBadgeText: {
    fontFamily: typography.family, fontSize: typography.size.sm,
    fontWeight: typography.weight.semibold,
    color: colors.text,
  },
  notifPillBadgeRead: {
    backgroundColor: colors.secondary,
    borderColor: 'transparent',
  },
  notifPillBadgeReadText: {
    color: colors.muted,
  },
  notifCardMessage: {
    fontFamily: typography.family, fontSize: typography.size.body,
    color: colors.foreground,
    lineHeight: 21,
    marginTop: spacing.md,
    marginBottom: 14,
  },

  notifCardFooterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingTop: spacing.md,
    borderTopWidth: 1,
    borderTopColor: 'rgba(226, 232, 240, 0.9)',
  },
  notifToLabel: {
    fontFamily: typography.family, fontSize: typography.size.sm,
    color: colors.muted,
  },
  notifToName: {
    fontWeight: typography.weight.semibold,
    color: colors.foreground,
  },
  notifRolePill: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 9999,
    paddingHorizontal: 10,
    paddingVertical: 3,
  },
  notifRolePillText: {
    fontFamily: typography.family, fontSize: typography.size.sm,
    fontWeight: typography.weight.medium,
    color: colors.foreground,
  },

  // Loader & Empty States
  loaderBox: {
    paddingVertical: 40,
    alignItems: 'center',
  },
  loadingText: {
    fontFamily: typography.family, marginTop: 10,
    fontSize: typography.size.caption,
    color: colors.muted,
  },
  emptyCard: {
    marginTop: spacing.md,
    paddingVertical: 40,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.border,
    borderStyle: 'dashed',
    borderRadius: radii.lg,
  },
  emptyText: {
    fontFamily: typography.family, fontSize: typography.size.caption,
    color: colors.subtle,
  },
  disabledButton: {
    opacity: 0.5,
  },

  // Section Header Flex
  sectionHeaderFlex: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: spacing.md,
  },

  // Category Tab Styles (Exact Screenshot)
  categoryCardBox: {
    backgroundColor: colors.background,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 14,
    marginBottom: 10,
  },
  categoryLine: {
    fontFamily: typography.family, fontSize: typography.size.body,
    color: colors.foreground,
    lineHeight: 20,
  },
  categoryLabel: {
    fontWeight: typography.weight.bold,
    color: colors.foreground,
  },
  categoryValue: {
    fontWeight: typography.weight.regular,
    color: colors.foreground,
  },

  // Subscriptions Tab Specifics (Exact Screenshot Match)
  subUserCardBox: {
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    padding: spacing.lg,
    marginBottom: spacing.md,
  },
  subUserName: {
    fontFamily: typography.family, fontSize: typography.size.subtitle,
    fontWeight: typography.weight.bold,
    color: colors.text,
  },
  subUserClinic: {
    fontFamily: typography.family, fontSize: typography.size.caption,
    color: colors.muted,
    marginTop: spacing.xs,
  },
  subCardBodyBox: {
    marginTop: 14,
    paddingTop: 14,
    borderTopWidth: 1,
    borderTopColor: colors.secondary,
  },
  subCatLabel: {
    fontFamily: typography.family, fontSize: typography.size.xs,
    fontWeight: typography.weight.bold,
    color: colors.muted,
    letterSpacing: 0.5,
  },
  subCatText: {
    fontFamily: typography.family, fontSize: typography.size.body,
    color: colors.foreground,
    marginTop: spacing.xs,
    lineHeight: 20,
  },
  systemPill: {
    backgroundColor: colors.foreground,
    paddingHorizontal: 10,
    paddingVertical: spacing.xs,
    borderRadius: 9999,
  },
  systemPillText: {
    fontFamily: typography.family, color: colors.surface,
    fontSize: typography.size.sm,
    fontWeight: typography.weight.bold,
  },
  activePill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: '#bbf7d0',
    paddingHorizontal: 10,
    paddingVertical: spacing.xs,
    borderRadius: 9999,
  },
  activePillText: {
    fontFamily: typography.family, color: '#047857',
    fontSize: typography.size.sm,
    fontWeight: typography.weight.semibold,
  },
  manageSubButton: {
    height: 44,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.md,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 14,
    backgroundColor: colors.surface,
  },
  manageSubButtonText: {
    fontFamily: typography.family, fontSize: typography.size.body,
    fontWeight: typography.weight.semibold,
    color: colors.text,
  },

  // Pagination Row
  paginationRow: {
    marginTop: 14,
    paddingTop: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.secondary,
    gap: spacing.sm,
  },
  paginationLabel: {
    fontFamily: typography.family, fontSize: typography.size.sm,
    color: colors.muted,
  },
  pageNavBtn: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.tiny,
    borderWidth: 1,
    borderColor: colors.input,
    borderRadius: radii.sm,
    backgroundColor: colors.surface,
  },
  pageNavBtnText: {
    fontFamily: typography.family, fontSize: typography.size.sm,
    fontWeight: typography.weight.semibold,
    color: colors.foreground,
  },
  pageNavText: {
    fontFamily: typography.family, fontSize: typography.size.sm,
    fontWeight: typography.weight.semibold,
    color: colors.text,
  },

  // Delivery Logs Specifics (Exact Screenshot Match)
  deliveryLogCard: {
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    padding: spacing.lg,
    marginBottom: spacing.md,
  },
  logGridBox: {
    marginTop: 14,
    paddingTop: 14,
    borderTopWidth: 1,
    borderTopColor: colors.secondary,
  },
  logMetaLabel: {
    fontFamily: typography.family, fontSize: typography.size.sm,
    color: colors.muted,
  },
  logMetaVal: {
    fontFamily: typography.family, fontSize: typography.size.body,
    fontWeight: typography.weight.semibold,
    color: colors.foreground,
    marginTop: 2,
  },

  // Modals Styling
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.lg,
  },
  dialogCard: {
    width: '100%',
    maxHeight: '90%',
    backgroundColor: colors.surface,
    borderRadius: radii.xl,
    overflow: 'hidden',
  },
  dialogHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    padding: spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: colors.secondary,
  },
  dialogTitle: {
    fontFamily: typography.family, fontSize: typography.size.title,
    fontWeight: typography.weight.extrabold,
    color: colors.text,
  },
  dialogSubtitle: {
    fontFamily: typography.family, fontSize: typography.size.sm,
    color: colors.muted,
    marginTop: 2,
  },
  categoryGroupBox: {
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: spacing.md,
    overflow: 'hidden',
  },
  categoryGroupTitle: {
    fontFamily: typography.family, backgroundColor: colors.secondary,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    fontSize: typography.size.caption,
    fontWeight: typography.weight.bold,
    color: colors.text,
  },
  toggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: colors.background,
  },
  toggleText: {
    fontFamily: typography.family, fontSize: typography.size.caption,
    color: colors.foreground,
    flex: 1,
    marginRight: 10,
  },
  dialogPaginationRow: {
    paddingHorizontal: spacing.lg,
    paddingVertical: 10,
    borderTopWidth: 1,
    borderTopColor: colors.secondary,
    gap: spacing.sm,
  },
  dialogFooter: {
    flexDirection: 'row',
    gap: 10,
    padding: spacing.lg,
    borderTopWidth: 1,
    borderTopColor: colors.secondary,
    backgroundColor: colors.surface,
  },
  dialogCancelBtn: {
    flex: 1,
    height: 44,
    borderWidth: 1,
    borderColor: colors.input,
    borderRadius: radii.md,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surface,
  },
  dialogCancelBtnText: {
    fontFamily: typography.family, fontSize: typography.size.caption,
    fontWeight: typography.weight.semibold,
    color: colors.foreground,
  },
  dialogSaveBtn: {
    flex: 1.4,
    height: 44,
    borderRadius: radii.md,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.text,
  },
  dialogSaveBtnText: {
    fontFamily: typography.family, fontSize: typography.size.caption,
    fontWeight: typography.weight.bold,
    color: colors.surface,
  },


  // Filter Pickers
  pickerBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.4)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.xxl,
  },
  pickerCard: {
    width: '100%',
    maxWidth: 320,
    backgroundColor: colors.surface,
    borderRadius: radii.lg,
    padding: spacing.lg,
    elevation: 10,
  },
  pickerHeaderTitle: {
    fontFamily: typography.family, fontSize: typography.size.subtitle,
    fontWeight: typography.weight.extrabold,
    color: colors.text,
    marginBottom: spacing.md,
  },
  pickerItemRow: {
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.secondary,
  },
  pickerItemRowActive: {
    backgroundColor: '#f0fdf4',
  },
  pickerItemText: {
    fontFamily: typography.family, fontSize: typography.size.body,
    color: colors.foreground,
    fontWeight: typography.weight.semibold,
  },
});

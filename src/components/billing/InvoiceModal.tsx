import React from 'react';
import {
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { BillingCardIcon } from '../common/CustomIcons';
import { generateInvoiceHtml, printOrDownloadPdf } from '../../utils/pdfGenerator';

export interface InvoiceItem {
  name: string;
  quantity: number;
  unitPrice: number;
  totalPrice?: number;
}

export interface InvoiceModalProps {
  visible: boolean;
  title?: string;
  invoiceType?: 'treatment' | 'medicine' | 'lab';
  invoiceNumber: string;
  invoiceDate?: string;
  clinicName?: string;
  clinicAddress?: string;
  clinicPhone?: string;
  patientName: string;
  patientPhone?: string;
  doctorName?: string;
  prescriptionId?: string | number;
  paymentMethod?: string;
  paymentStatus?: 'paid' | 'partial' | 'partially_paid' | 'pending' | 'unpaid' | 'cancelled' | string;
  items: InvoiceItem[];
  subtotal: number;
  discount?: number;
  tax?: number;
  grandTotal: number;
  paidAmount?: number;
  dueAmount?: number;
  notes?: string;
  preparedBy?: string;
  onPay?: () => void;
  onClose: () => void;
}

export const InvoiceModal: React.FC<InvoiceModalProps> = ({
  visible,
  title = 'Invoice Details',
  invoiceType = 'treatment',
  invoiceNumber,
  invoiceDate,
  clinicName = 'Aarogya Care Clinic',
  clinicAddress = '102, Shree Heights, AB Road',
  clinicPhone = '9876543210 | contact@aarogyacare.com',
  patientName,
  patientPhone = '9876534927',
  doctorName = 'Dr. Rahul Sharma',
  prescriptionId,
  paymentMethod = 'UPI',
  paymentStatus = 'paid',
  items = [],
  subtotal,
  discount = 0,
  tax = 0,
  grandTotal,
  paidAmount,
  dueAmount,
  notes = 'Thank you for choosing us for your care.',
  preparedBy,
  onPay,
  onClose,
}) => {
  const normStatus = (paymentStatus || 'paid').toLowerCase();
  const isPaid = normStatus === 'paid';
  const isPartial = normStatus === 'partial' || normStatus === 'partially_paid';

  const effectivePaid = paidAmount !== undefined ? paidAmount : isPaid ? grandTotal : 0;
  const effectiveDue = dueAmount !== undefined ? dueAmount : Math.max(0, grandTotal - effectivePaid);

  const displayTypeHeader = invoiceType === 'medicine' ? 'MEDICINE INVOICE' : invoiceType === 'lab' ? 'LAB REPORT INVOICE' : 'TREATMENT INVOICE';
  const displaySubHeader = invoiceType === 'medicine' ? 'PATIENT CARE & PHARMACY SERVICES' : invoiceType === 'lab' ? 'PATIENT DIAGNOSTIC & LAB SERVICES' : 'PATIENT CARE & TREATMENT SERVICES';

  const handlePrintDownloadPdf = () => {
    const html = generateInvoiceHtml({
      invoiceNumber: invoiceNumber || 'INV-001',
      invoiceDate: invoiceDate || new Date().toISOString().split('T')[0],
      clinicName: clinicName || 'Aarogya Care Clinic',
      patientName: patientName || 'Patient',
      patientPhone: patientPhone || '',
      paymentStatus: normStatus,
      items: items.map((it) => ({
        name: it.name,
        qty: it.quantity,
        unitPrice: Number(it.unitPrice || 0),
        totalPrice: Number(it.totalPrice || (it.quantity * Number(it.unitPrice || 0))),
      })),
      subtotal: Number(subtotal || grandTotal),
      discount: Number(discount || 0),
      tax: Number(tax || 0),
      grandTotal: Number(grandTotal || 0),
      paidAmount: Number(effectivePaid || 0),
      dueAmount: Number(effectiveDue || 0),
    });
    printOrDownloadPdf(html, `Invoice_${invoiceNumber || 'receipt'}`);
  };

  // Split clinic phone/email if formatted with '|' to avoid awkward ".com" line breaks
  const phoneParts = clinicPhone ? clinicPhone.split('|').map((p) => p.trim()) : [];

  return (
    <Modal visible={visible} animationType="slide" transparent={true} onRequestClose={onClose}>
      <View style={styles.modalBg}>
        <View style={styles.modalCardWide}>
          {/* Header Banner */}
          <View style={styles.headerBanner}>
            <View style={styles.headerLeftRow}>
              <BillingCardIcon color="#ffffff" size={20} />
              <Text style={styles.invoiceTitleText} numberOfLines={1}>{title} {invoiceNumber}</Text>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
              <Text style={styles.closeBtnText}>✕</Text>
            </TouchableOpacity>
          </View>

          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollBody}>
            {/* Letterhead Container */}
            <View style={styles.letterheadCard}>
              <View style={styles.letterheadTopRow}>
                <View style={styles.clinicInfoCol}>
                  <Text style={styles.clinicNameText}>{clinicName}</Text>
                  <Text style={styles.clinicSubText}>{displaySubHeader}</Text>
                  {clinicAddress ? <Text style={styles.clinicMetaText}>{clinicAddress}</Text> : null}
                  {phoneParts.map((pt, i) => (
                    <Text key={i} style={styles.clinicMetaText}>{pt}</Text>
                  ))}
                </View>

                <View style={styles.invoiceRightMeta}>
                  <Text style={styles.invoiceMetaType}>{displayTypeHeader}</Text>
                  <Text style={styles.invoiceMetaNumber} numberOfLines={1}>{invoiceNumber}</Text>
                  <Text style={styles.invoiceMetaDate}>
                    Issued {invoiceDate || new Date().toISOString().split('T')[0]}
                  </Text>
                </View>
              </View>

              <View style={styles.dividerLine} />

              {/* Patient & Doctor Grid */}
              <View style={styles.metaGridRow}>
                <View style={{ flex: 1, paddingRight: 6 }}>
                  <Text style={styles.sectionLabel}>BILL TO</Text>
                  <Text style={styles.metaTitleText} numberOfLines={1}>{patientName || 'Patient'}</Text>
                  <Text style={styles.metaSubText}>Phone: {patientPhone || '-'}</Text>
                </View>

                <View style={{ flex: 1, alignItems: 'flex-end', paddingLeft: 6 }}>
                  <Text style={styles.sectionLabel}>DOCTOR & APPOINTMENT</Text>
                  <Text style={styles.metaTitleText} numberOfLines={1}>{preparedBy || doctorName}</Text>
                  <Text style={styles.metaSubText}>
                    {prescriptionId ? `Prescription: #${prescriptionId}` : `Date: ${invoiceDate || new Date().toISOString().split('T')[0]}`}
                  </Text>
                </View>
              </View>

              {/* Payment Method & Status Pill */}
              <View style={styles.paymentStatusRow}>
                <Text style={styles.paymentMethodText}>
                  Payment Method: <Text style={styles.boldText}>{paymentMethod.toUpperCase()}</Text>
                </Text>
                <View style={[styles.statusBadge, isPaid ? styles.paidBg : isPartial ? styles.partialBg : styles.pendingBg]}>
                  <Text style={[styles.statusBadgeText, isPaid ? styles.paidText : isPartial ? styles.partialText : styles.pendingText]}>
                    {isPaid ? '✓ Paid' : isPartial ? '🕒 Partially Paid' : '⚠️ Pending'}
                  </Text>
                </View>
              </View>

              {/* Itemized Table */}
              <Text style={styles.itemsTableHeading}>TREATMENT & SERVICE ITEMS</Text>
              <View style={styles.tableBorderCard}>
                <View style={styles.tableHeaderRow}>
                  <Text style={[styles.tableHeadCell, { flex: 0.4 }]}>#</Text>
                  <Text style={[styles.tableHeadCell, { flex: 2.2 }]}>Item</Text>
                  <Text style={[styles.tableHeadCell, { flex: 0.7, textAlign: 'center' }]}>Qty</Text>
                  <Text style={[styles.tableHeadCell, { flex: 1.2, textAlign: 'right' }]}>Rate</Text>
                  <Text style={[styles.tableHeadCell, { flex: 0.8, textAlign: 'right' }]}>Disc.</Text>
                  <Text style={[styles.tableHeadCell, { flex: 1.3, textAlign: 'right' }]}>Total</Text>
                </View>

                {items && items.length > 0 ? (
                  items.map((it, idx) => (
                    <View key={idx} style={[styles.tableDataRow, idx === items.length - 1 && styles.lastDataRow]}>
                      <Text style={{ flex: 0.4, fontSize: 11, color: '#64748b' }}>{idx + 1}</Text>
                      <Text style={{ flex: 2.2, fontSize: 12, fontWeight: '700', color: '#0f172a' }}>{it.name}</Text>
                      <Text style={{ flex: 0.7, fontSize: 11, color: '#334155', textAlign: 'center' }}>{it.quantity}</Text>
                      <Text style={{ flex: 1.2, fontSize: 11, color: '#334155', textAlign: 'right' }}>₹{Number(it.unitPrice || 0).toFixed(2)}</Text>
                      <Text style={{ flex: 0.8, fontSize: 11, color: '#64748b', textAlign: 'right' }}>0%</Text>
                      <Text style={{ flex: 1.3, fontSize: 12, fontWeight: '800', color: '#0f172a', textAlign: 'right' }}>
                        ₹{Number(it.totalPrice || (it.quantity * Number(it.unitPrice || 0))).toFixed(2)}
                      </Text>
                    </View>
                  ))
                ) : (
                  <View style={{ padding: 12, alignItems: 'center' }}>
                    <Text style={{ color: '#64748b', fontSize: 12 }}>General Medical Consultation & Services</Text>
                  </View>
                )}
              </View>

              {/* Notes & Summary Totals */}
              <View style={styles.summaryFooterRow}>
                <View style={{ flex: 1, paddingRight: 8 }}>
                  <Text style={styles.sectionLabel}>NOTES</Text>
                  <Text style={styles.notesText}>{notes}</Text>
                  <Text style={[styles.notesText, { marginTop: 8 }]}>
                    Prepared by: <Text style={{ fontWeight: '700', color: '#0f172a' }}>{preparedBy || doctorName}</Text>
                  </Text>
                </View>

                <View style={{ flex: 1.15, gap: 4 }}>
                  <View style={styles.summaryLine}>
                    <Text style={styles.summaryLabel}>Subtotal</Text>
                    <Text style={styles.summaryVal}>₹{Number(subtotal || grandTotal).toFixed(2)}</Text>
                  </View>
                  <View style={styles.summaryLine}>
                    <Text style={styles.summaryLabel}>Discount</Text>
                    <Text style={[styles.summaryVal, { color: '#16a34a' }]}>-₹{Number(discount).toFixed(2)}</Text>
                  </View>
                  <View style={styles.summaryLine}>
                    <Text style={styles.summaryLabel}>Tax</Text>
                    <Text style={styles.summaryVal}>+₹{Number(tax).toFixed(2)}</Text>
                  </View>

                  <View style={[styles.summaryLine, styles.totalLineBorder]}>
                    <Text style={styles.totalLabelText}>Total</Text>
                    <Text style={styles.totalValText}>₹{Number(grandTotal).toFixed(2)}</Text>
                  </View>
                  <View style={styles.summaryLine}>
                    <Text style={{ fontSize: 11, fontWeight: '700', color: '#16a34a' }}>Amount Paid</Text>
                    <Text style={{ fontSize: 12, fontWeight: '800', color: '#16a34a' }}>₹{Number(effectivePaid).toFixed(2)}</Text>
                  </View>
                  <View style={styles.summaryLine}>
                    <Text style={{ fontSize: 11, fontWeight: '700', color: '#dc2626' }}>Balance Due</Text>
                    <Text style={{ fontSize: 12, fontWeight: '800', color: '#dc2626' }}>₹{Number(effectiveDue).toFixed(2)}</Text>
                  </View>
                </View>
              </View>

              <View style={styles.systemFooterBanner}>
                <Text style={styles.systemFooterText}>
                  This is a system-generated invoice. Thank you for your visit.
                </Text>
              </View>
            </View>

            {/* Action Buttons */}
            <View style={styles.actionButtonsRow}>
              {onPay && effectiveDue > 0 ? (
                <TouchableOpacity style={styles.payBtn} onPress={onPay}>
                  <Text style={styles.btnTextWhite} numberOfLines={1}>Pay ₹{Number(effectiveDue).toFixed(2)}</Text>
                </TouchableOpacity>
              ) : null}
              <TouchableOpacity style={styles.pdfBtn} onPress={handlePrintDownloadPdf}>
                <Text style={styles.btnTextWhite} numberOfLines={1}>📥 Download PDF</Text>
              </TouchableOpacity>

              <TouchableOpacity style={styles.printBtn} onPress={handlePrintDownloadPdf}>
                <Text style={styles.btnTextWhite} numberOfLines={1}>🖨️ Print</Text>
              </TouchableOpacity>

              <TouchableOpacity style={styles.closeActionBtn} onPress={onClose}>
                <Text style={styles.closeActionBtnText} numberOfLines={1}>Close</Text>
              </TouchableOpacity>
            </View>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalBg: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 14,
  },
  modalCardWide: {
    width: '100%',
    maxWidth: 480,
    backgroundColor: '#ffffff',
    borderRadius: 20,
    overflow: 'hidden',
    maxHeight: '92%',
  },
  headerBanner: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#073b3a',
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  headerLeftRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flex: 1,
    paddingRight: 8,
  },
  invoiceTitleText: {
    fontSize: 15,
    fontWeight: '800',
    color: '#ffffff',
    flexShrink: 1,
  },
  closeBtn: {
    padding: 4,
  },
  closeBtnText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#94a3b8',
  },
  scrollBody: {
    padding: 12,
    gap: 12,
  },
  letterheadCard: {
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#cbd5e1',
    borderRadius: 14,
    padding: 12,
  },
  letterheadTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  clinicInfoCol: {
    flex: 1.3,
    paddingRight: 6,
  },
  clinicNameText: {
    fontSize: 17,
    fontWeight: '900',
    color: '#0f172a',
  },
  clinicSubText: {
    fontSize: 9.5,
    fontWeight: '800',
    color: '#0d9488',
    letterSpacing: 0.6,
    marginTop: 2,
  },
  clinicMetaText: {
    fontSize: 10.5,
    color: '#64748b',
    marginTop: 2,
  },
  invoiceRightMeta: {
    flex: 1,
    alignItems: 'flex-end',
  },
  invoiceMetaType: {
    fontSize: 9.5,
    fontWeight: '800',
    color: '#0d9488',
    letterSpacing: 0.6,
  },
  invoiceMetaNumber: {
    fontSize: 13,
    fontWeight: '900',
    color: '#0f172a',
    marginTop: 2,
  },
  invoiceMetaDate: {
    fontSize: 10.5,
    color: '#94a3b8',
    marginTop: 2,
  },
  dividerLine: {
    height: 2,
    backgroundColor: '#0d9488',
    marginVertical: 10,
  },
  metaGridRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  sectionLabel: {
    fontSize: 9,
    fontWeight: '800',
    color: '#64748b',
    letterSpacing: 0.5,
  },
  metaTitleText: {
    fontSize: 14,
    fontWeight: '800',
    color: '#0f172a',
    marginTop: 2,
  },
  metaSubText: {
    fontSize: 11,
    color: '#475569',
    marginTop: 2,
  },
  paymentStatusRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#e6fffa',
    borderWidth: 1,
    borderColor: '#99f6e4',
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 10,
    marginTop: 10,
  },
  paymentMethodText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#0f172a',
  },
  boldText: {
    fontWeight: '900',
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
  },
  paidBg: { backgroundColor: '#dcfce7' },
  paidText: { fontSize: 10.5, fontWeight: '800', color: '#166534' },
  partialBg: { backgroundColor: '#ffedd5' },
  partialText: { fontSize: 10.5, fontWeight: '800', color: '#c2410c' },
  pendingBg: { backgroundColor: '#fef3c7' },
  pendingText: { fontSize: 10.5, fontWeight: '800', color: '#92400e' },

  itemsTableHeading: {
    fontSize: 10.5,
    fontWeight: '800',
    color: '#475569',
    letterSpacing: 0.5,
    marginTop: 12,
    marginBottom: 6,
  },
  tableBorderCard: {
    borderWidth: 1,
    borderColor: '#cbd5e1',
    borderRadius: 10,
    overflow: 'hidden',
  },
  tableHeaderRow: {
    flexDirection: 'row',
    backgroundColor: '#0f172a',
    paddingVertical: 7,
    paddingHorizontal: 8,
  },
  tableHeadCell: {
    fontSize: 10,
    fontWeight: '800',
    color: '#ffffff',
  },
  tableDataRow: {
    flexDirection: 'row',
    paddingVertical: 9,
    paddingHorizontal: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
    alignItems: 'center',
  },
  lastDataRow: {
    borderBottomWidth: 0,
  },
  summaryFooterRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 12,
  },
  notesText: {
    fontSize: 10.5,
    color: '#475569',
    marginTop: 2,
  },
  summaryLine: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  summaryLabel: {
    fontSize: 11,
    color: '#64748b',
  },
  summaryVal: {
    fontSize: 11,
    fontWeight: '700',
    color: '#0f172a',
  },
  totalLineBorder: {
    borderTopWidth: 1,
    borderTopColor: '#cbd5e1',
    paddingTop: 5,
    marginTop: 3,
  },
  totalLabelText: {
    fontSize: 14,
    fontWeight: '900',
    color: '#0f172a',
  },
  totalValText: {
    fontSize: 15,
    fontWeight: '900',
    color: '#0f172a',
  },
  systemFooterBanner: {
    backgroundColor: '#f8fafc',
    borderRadius: 8,
    padding: 8,
    marginTop: 10,
    alignItems: 'center',
  },
  systemFooterText: {
    fontSize: 10,
    color: '#64748b',
    textAlign: 'center',
  },
  actionButtonsRow: {
    flexDirection: 'row',
    gap: 6,
    justifyContent: 'space-between',
    marginTop: 4,
  },
  payBtn: {
    flex: 1,
    backgroundColor: '#0d9488',
    borderRadius: 10,
    paddingVertical: 11,
    alignItems: 'center',
  },
  pdfBtn: {
    flex: 1,
    backgroundColor: '#0d9488',
    borderRadius: 10,
    paddingVertical: 10,
    paddingHorizontal: 4,
    alignItems: 'center',
    justifyContent: 'center',
  },
  printBtn: {
    flex: 1,
    backgroundColor: '#0f172a',
    borderRadius: 10,
    paddingVertical: 10,
    paddingHorizontal: 4,
    alignItems: 'center',
    justifyContent: 'center',
  },
  btnTextWhite: {
    color: '#ffffff',
    fontSize: 11.5,
    fontWeight: '800',
  },
  closeActionBtn: {
    flex: 0.8,
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#cbd5e1',
    borderRadius: 10,
    paddingVertical: 10,
    paddingHorizontal: 4,
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeActionBtnText: {
    color: '#0f172a',
    fontSize: 11.5,
    fontWeight: '800',
  },
});

export default InvoiceModal;

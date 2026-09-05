import { Platform } from 'react-native';

export interface PrescriptionPdfData {
  rxNumber?: string;
  patientName: string;
  patientAge?: string | number;
  patientGender?: string;
  patientPhone?: string;
  doctorName: string;
  doctorSpecialization?: string;
  clinicName?: string;
  clinicAddress?: string;
  clinicPhone?: string;
  date?: string;
  symptoms?: string;
  diagnosis?: string;
  advice?: string;
  medicines: Array<{
    medicine_name: string;
    dosage?: string;
    frequency?: string;
    duration?: string;
    instructions?: string;
  }>;
}

export interface InvoicePdfData {
  invoiceNumber: string;
  invoiceDate: string;
  clinicName?: string;
  clinicAddress?: string;
  clinicPhone?: string;
  patientName: string;
  patientPhone?: string;
  patientCode?: string;
  doctorName?: string;
  paymentStatus: 'paid' | 'partially_paid' | 'pending' | 'unpaid' | string;
  items: Array<{
    name: string;
    qty: number;
    unitPrice: number;
    totalPrice: number;
  }>;
  subtotal: number;
  discount: number;
  tax: number;
  grandTotal: number;
  paidAmount: number;
  dueAmount: number;
  paymentMethod?: string;
}

/**
 * Generate Printable HTML for Doctor Prescription
 */
export function generatePrescriptionHtml(data: PrescriptionPdfData): string {
  const medsRows = (data.medicines || [])
    .map(
      (m, idx) => `
      <tr>
        <td style="padding: 10px; border-bottom: 1px solid #e2e8f0; font-weight: bold; color: #0f172a;">${idx + 1}. ${m.medicine_name}</td>
        <td style="padding: 10px; border-bottom: 1px solid #e2e8f0; text-align: center; color: #334155;">${m.dosage || '1 Tab'}</td>
        <td style="padding: 10px; border-bottom: 1px solid #e2e8f0; text-align: center; color: #334155;">${m.frequency || '1-0-1 (After Food)'}</td>
        <td style="padding: 10px; border-bottom: 1px solid #e2e8f0; text-align: center; color: #334155;">${m.duration || '5 Days'}</td>
        <td style="padding: 10px; border-bottom: 1px solid #e2e8f0; color: #64748b; font-size: 12px;">${m.instructions || '-'}</td>
      </tr>
    `
    )
    .join('');

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8" />
      <title>Prescription_${data.patientName || 'Patient'}</title>
      <style>
        body { font-family: 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; margin: 0; padding: 24px; color: #0f172a; background: #ffffff; }
        .header-table { width: 100%; border-bottom: 2.5px solid #0d9488; padding-bottom: 16px; margin-bottom: 20px; }
        .clinic-title { font-size: 24px; font-weight: 800; color: #0d9488; margin: 0; }
        .clinic-sub { font-size: 13px; color: #64748b; margin-top: 4px; }
        .rx-badge { background: #0d9488; color: #ffffff; padding: 6px 14px; border-radius: 6px; font-weight: 800; font-size: 16px; display: inline-block; }
        
        .meta-card { background: #f8fafc; border: 1px solid #cbd5e1; border-radius: 10px; padding: 14px; margin-bottom: 20px; }
        .meta-grid { display: flex; justify-content: space-between; flex-wrap: wrap; gap: 12px; }
        .meta-item { font-size: 13px; color: #334155; }
        .meta-item strong { color: #0f172a; }

        .diagnosis-box { background: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 8px; padding: 12px; margin-bottom: 20px; }
        .diagnosis-title { font-size: 13px; font-weight: 800; color: #166534; margin: 0 0 4px 0; }
        .diagnosis-text { font-size: 14px; color: #15803d; margin: 0; }

        .rx-section-header { font-size: 16px; font-weight: 800; color: #0f172a; margin-bottom: 12px; border-left: 4px solid #0d9488; padding-left: 10px; }
        .med-table { width: 100%; border-collapse: collapse; margin-bottom: 24px; }
        .med-table th { background: #0d9488; color: #ffffff; font-size: 12px; font-weight: 800; text-transform: uppercase; padding: 10px; text-align: left; }

        .advice-box { background: #fffbe6; border: 1px solid #ffe58f; border-radius: 8px; padding: 12px; margin-bottom: 30px; }
        .advice-title { font-size: 13px; font-weight: 800; color: #d48806; margin: 0 0 4px 0; }

        .footer-sign { display: flex; justify-content: space-between; align-items: flex-end; margin-top: 40px; border-top: 1px solid #e2e8f0; padding-top: 20px; }
        .sign-col { text-align: right; }
        .sign-line { width: 160px; border-top: 1.5px solid #0f172a; margin-top: 40px; margin-left: auto; }

        @media print {
          body { padding: 0; }
          .no-print { display: none; }
        }
      </style>
    </head>
    <body>
      <table class="header-table">
        <tr>
          <td>
            <h1 class="clinic-title">${data.clinicName || 'Aarogya Care Healthcare Clinic'}</h1>
            <div class="clinic-sub">📍 ${data.clinicAddress || 'Palasiya Main Road, Anantapur, AP'} | 📞 ${data.clinicPhone || '+91 98765 43210'}</div>
          </td>
          <td style="text-align: right;">
            <div class="rx-badge">Rx PRESCRIPTION</div>
            <div style="font-size: 12px; color: #64748b; margin-top: 6px;">Rx No: <strong>${data.rxNumber || `RX-${Date.now().toString().slice(-6)}`}</strong></div>
          </td>
        </tr>
      </table>

      <div class="meta-card">
        <div class="meta-grid">
          <div class="meta-item"><strong>Patient Name:</strong> ${data.patientName}</div>
          <div class="meta-item"><strong>Age / Gender:</strong> ${data.patientAge || '32'} YRS / ${data.patientGender || 'Male'}</div>
          <div class="meta-item"><strong>Phone:</strong> ${data.patientPhone || 'N/A'}</div>
          <div class="meta-item"><strong>Date:</strong> ${data.date || new Date().toLocaleDateString()}</div>
          <div class="meta-item"><strong>Consulting Doctor:</strong> ${data.doctorName} (${data.doctorSpecialization || 'General Physician'})</div>
        </div>
      </div>

      ${
        data.diagnosis || data.symptoms
          ? `
        <div class="diagnosis-box">
          <div class="diagnosis-title">🩺 CHIEF COMPLAINTS & DIAGNOSIS</div>
          <div class="diagnosis-text">${data.diagnosis || data.symptoms}</div>
        </div>
      `
          : ''
      }

      <div class="rx-section-header">💊 PRESCRIBED MEDICATIONS</div>
      <table class="med-table">
        <thead>
          <tr>
            <th>Medicine Name</th>
            <th style="text-align: center;">Dosage</th>
            <th style="text-align: center;">Frequency</th>
            <th style="text-align: center;">Duration</th>
            <th>Instructions</th>
          </tr>
        </thead>
        <tbody>
          ${medsRows}
        </tbody>
      </table>

      ${
        data.advice
          ? `
        <div class="advice-box">
          <div class="advice-title">💡 DOCTOR'S ADVICE & SPECIAL INSTRUCTIONS</div>
          <div style="font-size: 13px; color: #873800;">${data.advice}</div>
        </div>
      `
          : ''
      }

      <div class="footer-sign">
        <div style="font-size: 11px; color: #94a3b8;">
          This is an official computer-generated medical prescription.<br />
          Valid for 30 days from date of issue.
        </div>
        <div class="sign-col">
          <div class="sign-line"></div>
          <div style="font-size: 13px; font-weight: 800; color: #0f172a; margin-top: 4px;">${data.doctorName}</div>
          <div style="font-size: 11px; color: #64748b;">Authorized Signatory</div>
        </div>
      </div>
    </body>
    </html>
  `;
}

/**
 * Generate Printable HTML for Billing Invoices (Treatment / Medicine / Lab)
 */
export function generateInvoiceHtml(data: InvoicePdfData): string {
  const itemRows = (data.items || [])
    .map(
      (it, idx) => `
      <tr>
        <td style="padding: 10px; border-bottom: 1px solid #e2e8f0; font-weight: 600; color: #0f172a;">${idx + 1}</td>
        <td style="padding: 10px; border-bottom: 1px solid #e2e8f0; font-weight: bold; color: #0f172a;">${it.name}</td>
        <td style="padding: 10px; border-bottom: 1px solid #e2e8f0; text-align: center; color: #334155;">${it.qty}</td>
        <td style="padding: 10px; border-bottom: 1px solid #e2e8f0; text-align: right; color: #334155;">₹${it.unitPrice.toFixed(2)}</td>
        <td style="padding: 10px; border-bottom: 1px solid #e2e8f0; text-align: right; font-weight: bold; color: #0f172a;">₹${it.totalPrice.toFixed(2)}</td>
      </tr>
    `
    )
    .join('');

  const isPaid = String(data.paymentStatus).toLowerCase() === 'paid';
  const statusBg = isPaid ? '#dcfce7' : '#fef3c7';
  const statusColor = isPaid ? '#166534' : '#92400e';

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8" />
      <title>Invoice_${data.invoiceNumber}</title>
      <style>
        body { font-family: 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; margin: 0; padding: 24px; color: #0f172a; background: #ffffff; }
        .header-table { width: 100%; border-bottom: 2.5px solid #0d9488; padding-bottom: 16px; margin-bottom: 20px; }
        .clinic-title { font-size: 24px; font-weight: 800; color: #0d9488; margin: 0; }
        .clinic-sub { font-size: 13px; color: #64748b; margin-top: 4px; }
        .status-badge { background: ${statusBg}; color: ${statusColor}; padding: 6px 14px; border-radius: 6px; font-weight: 800; font-size: 14px; display: inline-block; text-transform: uppercase; }

        .meta-card { background: #f8fafc; border: 1px solid #cbd5e1; border-radius: 10px; padding: 14px; margin-bottom: 20px; }
        .meta-grid { display: flex; justify-content: space-between; flex-wrap: wrap; gap: 12px; }
        .meta-item { font-size: 13px; color: #334155; }
        .meta-item strong { color: #0f172a; }

        .item-table { width: 100%; border-collapse: collapse; margin-bottom: 24px; }
        .item-table th { background: #0d9488; color: #ffffff; font-size: 12px; font-weight: 800; text-transform: uppercase; padding: 10px; }

        .summary-box { width: 280px; margin-left: auto; background: #f8fafc; border: 1px solid #cbd5e1; border-radius: 10px; padding: 14px; margin-bottom: 30px; }
        .summary-row { display: flex; justify-content: space-between; margin-bottom: 8px; font-size: 13px; color: #475569; }
        .grand-row { border-top: 1.5px solid #0d9488; padding-top: 8px; margin-top: 8px; font-size: 16px; font-weight: 900; color: #0d9488; }

        .footer-sign { display: flex; justify-content: space-between; align-items: flex-end; margin-top: 40px; border-top: 1px solid #e2e8f0; padding-top: 20px; }
        .sign-line { width: 160px; border-top: 1.5px solid #0f172a; margin-top: 40px; margin-left: auto; }
      </style>
    </head>
    <body>
      <table class="header-table">
        <tr>
          <td>
            <h1 class="clinic-title">${data.clinicName || 'Aarogya Care Dental & Healthcare Clinic'}</h1>
            <div class="clinic-sub">📍 ${data.clinicAddress || 'Palasiya Main Road, Anantapur, AP'} | 📞 ${data.clinicPhone || '+91 98765 43210'}</div>
          </td>
          <td style="text-align: right;">
            <div class="status-badge">STATUS: ${String(data.paymentStatus).toUpperCase()}</div>
            <div style="font-size: 14px; font-weight: 800; color: #0f172a; margin-top: 6px;">INVOICE #${data.invoiceNumber}</div>
          </td>
        </tr>
      </table>

      <div class="meta-card">
        <div class="meta-grid">
          <div class="meta-item"><strong>Patient Name:</strong> ${data.patientName}</div>
          <div class="meta-item"><strong>Phone:</strong> ${data.patientPhone || 'N/A'}</div>
          <div class="meta-item"><strong>Date:</strong> ${data.invoiceDate}</div>
          <div class="meta-item"><strong>Doctor / Provider:</strong> ${data.doctorName || 'Dr. Sharma'}</div>
        </div>
      </div>

      <table class="item-table">
        <thead>
          <tr>
            <th style="text-align: left;">S.No</th>
            <th style="text-align: left;">Particulars / Service Description</th>
            <th style="text-align: center;">Qty</th>
            <th style="text-align: right;">Unit Price (₹)</th>
            <th style="text-align: right;">Total Amount (₹)</th>
          </tr>
        </thead>
        <tbody>
          ${itemRows}
        </tbody>
      </table>

      <div class="summary-box">
        <div class="summary-row"><span>Subtotal:</span><strong>₹${data.subtotal.toFixed(2)}</strong></div>
        <div class="summary-row"><span>Discount:</span><strong>-₹${data.discount.toFixed(2)}</strong></div>
        <div class="summary-row"><span>Tax (GST 0%):</span><strong>₹${data.tax.toFixed(2)}</strong></div>
        <div class="summary-row grand-row"><span>Grand Total:</span><span>₹${data.grandTotal.toFixed(2)}</span></div>
        <div class="summary-row" style="margin-top: 8px;"><span>Amount Paid:</span><strong style="color: #16a34a;">₹${data.paidAmount.toFixed(2)}</strong></div>
        <div class="summary-row"><span>Balance Due:</span><strong style="color: #dc2626;">₹${data.dueAmount.toFixed(2)}</strong></div>
      </div>

      <div class="footer-sign">
        <div style="font-size: 11px; color: #94a3b8;">
          This is an official computer-generated billing receipt.<br />
          Thank you for choosing OrboDoc Healthcare.
        </div>
        <div style="text-align: right;">
          <div class="sign-line"></div>
          <div style="font-size: 13px; font-weight: 800; color: #0f172a; margin-top: 4px;">Accounts Desk</div>
          <div style="font-size: 11px; color: #64748b;">Authorized Signatory</div>
        </div>
      </div>
    </body>
    </html>
  `;
}

/**
 * Print or Save PDF Document (Dual Blob File Download + In-Page iFrame Print)
 */
export function printOrDownloadPdf(htmlContent: string, documentName: string = 'Document') {
  if (Platform.OS === 'web' && typeof window !== 'undefined' && typeof document !== 'undefined') {
    try {
      const cleanDocName = documentName.replace(/[^a-zA-Z0-9_-]/g, '_');

      // 1. Direct Blob File Download (Saves .html / printable document directly to Downloads folder)
      const blob = new Blob([htmlContent], { type: 'text/html;charset=utf-8' });
      const blobUrl = window.URL.createObjectURL(blob);
      const downloadLink = document.createElement('a');
      downloadLink.href = blobUrl;
      downloadLink.download = `${cleanDocName}.html`;
      document.body.appendChild(downloadLink);
      downloadLink.click();

      setTimeout(() => {
        try {
          document.body.removeChild(downloadLink);
          window.URL.revokeObjectURL(blobUrl);
        } catch (e) {}
      }, 1000);

      // 2. Hidden In-Page Print iFrame (Triggers system Print to PDF dialog without popup blocker issues)
      let printFrame = document.getElementById('hidden-print-iframe') as HTMLIFrameElement;
      if (!printFrame) {
        printFrame = document.createElement('iframe');
        printFrame.id = 'hidden-print-iframe';
        printFrame.style.position = 'fixed';
        printFrame.style.right = '0';
        printFrame.style.bottom = '0';
        printFrame.style.width = '0';
        printFrame.style.height = '0';
        printFrame.style.border = '0';
        document.body.appendChild(printFrame);
      }

      const frameDoc = printFrame.contentDocument || printFrame.contentWindow?.document;
      if (frameDoc) {
        frameDoc.open();
        frameDoc.write(htmlContent);
        frameDoc.close();
        setTimeout(() => {
          if (printFrame.contentWindow) {
            printFrame.contentWindow.focus();
            printFrame.contentWindow.print();
          }
        }, 400);
      }
      return true;
    } catch (e) {
      console.warn('PDF download & print error', e);
    }
  }
  return false;
}

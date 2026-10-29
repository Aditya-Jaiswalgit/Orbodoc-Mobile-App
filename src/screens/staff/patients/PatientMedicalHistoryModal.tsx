import { colors, radii, spacing, typography } from '../../../theme/tokens';
import React, { useEffect, useMemo, useState } from 'react';
import { AppModal } from '../../../components/common/AppModal';
import { ActivityIndicator, Alert, NativeModules, Platform, StyleSheet, Text, TextInput, TouchableOpacity, View, useWindowDimensions } from 'react-native';
import { LiquidBorderScrollView } from '../../../components/common/LiquidBorderScrollView';
import {
  AlertCircle,
  CalendarDays,
  ChevronDown,
  ChevronUp,
  ContactRound,
  Download,
  Droplets,
  Eye,
  FileText,
  FlaskConical,
  HeartPulse,
  IndianRupee,
  Microscope,
  Pill,
  Printer,
  RotateCcw,
  Search,
  ShieldAlert,
  SlidersHorizontal,
  Stethoscope,
  UserRound,
  X,
} from 'lucide-react-native';
import {
  getPatientMedicalHistoryApi,
  MedicalHistoryPayload,
} from '../../../api/patientApi';
import { PatientModel } from '../../../types/clinicTypes';
import { showErrorToast } from '../../../utils/toast';
import { printHtmlDocument } from '../../../utils/pdfActions';

type Props = {
  visible: boolean;
  patient: PatientModel | null;
  token: string | null;
  canExport: boolean;
  onClose: () => void;
};
type RecordFilter = 'all' | 'visits' | 'reports';
type DateFilter = 'all' | '30-days' | '90-days' | 'this-year';
const DATE_FILTERS: { key: DateFilter; label: string }[] = [
  { key: 'all', label: 'All dates' },
  { key: '30-days', label: 'Last 30 days' },
  { key: '90-days', label: 'Last 90 days' },
  { key: 'this-year', label: 'This year' },
];

function dateMatches(value: string | null | undefined, filter: DateFilter) {
  if (filter === 'all') return true;
  if (!value) return false;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return false;
  const today = new Date();
  if (filter === 'this-year') return date.getFullYear() === today.getFullYear();
  const from = new Date(today);
  from.setDate(from.getDate() - (filter === '30-days' ? 30 : 90));
  from.setHours(0, 0, 0, 0);
  today.setHours(23, 59, 59, 999);
  return date >= from && date <= today;
}

function dateTime(date?: string | null, time?: string | null) {
  if (!date) return 'Date not recorded';
  const parsed = new Date(date);
  const formatted = Number.isNaN(parsed.getTime())
    ? date
    : parsed.toLocaleDateString();
  return [formatted, time].filter(Boolean).join(' ');
}

function formatDoctorName(value?: string | null) {
  const name = String(value || '').trim();
  if (!name) return 'Dr. Not assigned';
  return /^dr\.?\s/i.test(name) ? name : `Dr. ${name}`;
}

function resultRows(
  input: unknown,
): Array<{ name: string; value: string; unit: string; range: string }> {
  let data: any = input;
  if (typeof data === 'string') {
    try {
      data = JSON.parse(data);
    } catch {
      return [{ name: 'Report Data', value: data, unit: '', range: '' }];
    }
  }
  if (!data || typeof data !== 'object' || Array.isArray(data)) return [];
  if (Array.isArray(data.rows))
    return data.rows.map((row: any) => ({
      name: String(row.parameter ?? ''),
      value: String(row.value ?? ''),
      unit: String(row.unit ?? ''),
      range: String(row.reference_range ?? ''),
    }));
  return Object.entries(data).map(([name, value]) => ({
    name: name.replace(/_/g, ' '),
    value: value == null ? '-' : String(value),
    unit: '',
    range: '',
  }));
}

const escapeHtml = (value: unknown) =>
  String(value ?? '').replace(
    /[&<>"']/g,
    char =>
      ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' }[
        char
      ]!),
  );

function createLabReportHtml(
  report: MedicalHistoryPayload['labReports'][number],
  patientName: string,
  patientId: string | number,
  patientCode: string,
  clinicName: string,
  uploadedAt: string,
  statusText: string,
  price: number,
) {
  const rows = resultRows(report.report_data);
  const reportId = String(report.report_id || report.lab_test_id || '-');
  const bodyRows = (rows.length ? rows : [{ name: '-', value: '-', unit: '-', range: '-' }])
    .map((row, index) => `<tr><td>${escapeHtml(report.test_name || '-')}</td><td>${escapeHtml(reportId)}</td><td>${escapeHtml(row.name || '-')}</td><td>${escapeHtml(row.value || '-')}</td><td>${escapeHtml(row.unit || '-')}</td><td>${escapeHtml(row.range || report.reference_range || '-')}</td><td>${escapeHtml(statusText)}</td><td>${escapeHtml(uploadedAt)}</td><td class="right">${index === 0 ? `₹ ${price.toFixed(2)}` : ''}</td></tr>`)
    .join('');
  return `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${escapeHtml(clinicName)} - Lab Report #${escapeHtml(reportId)}</title><style>
  *{box-sizing:border-box}body{font-family:Arial,sans-serif;margin:18px;color:#0f172a;background:#f8fafc}.page{border:1px solid #27a599;background:#fff}.header{border-bottom:1px solid #27a599;padding:18px;text-align:center}.header h1{margin:0;font-size:28px;text-transform:capitalize}.subtitle{margin:6px 0 0;color:#1d7c72;font-size:16px;font-weight:700}.generated{margin:6px 0 0;font-size:13px}.info{display:grid;grid-template-columns:1fr 1fr;border-bottom:1px solid #27a599}.info-card{padding:14px;border-right:1px solid #e2e8f0}.info-card:last-child{border-right:none}.info-card p{margin:6px 0;font-size:14px}.table-wrap{padding:14px 20px}table{width:100%;border-collapse:collapse;table-layout:fixed}th{border:1px solid #27a599;padding:8px 5px;text-align:left;font-size:10px;color:#64748b;overflow-wrap:anywhere}td{border:1px solid #cbd5e1;padding:8px 5px;font-size:11px;vertical-align:top;overflow-wrap:anywhere}.right{text-align:right}.total td{font-weight:700}.remarks{margin:12px 20px 16px;border:1px solid #27a599;padding:12px}.remarks h3{margin:0 0 8px;color:#1d7c72;font-size:16px}.remarks p{margin:0;font-size:15px;white-space:pre-wrap}.foot{display:flex;justify-content:space-between;gap:12px;border-top:1px solid #27a599;padding:12px 20px;color:#1d7c72;font-size:12px;overflow-wrap:anywhere}@page{size:A4;margin:12mm}@media print{body{margin:0;background:#fff}.page{border:none}.table-wrap{padding:12px 14px}th,td{font-size:9px;padding:6px 4px}}
  </style></head><body><main class="page"><header class="header"><h1>${escapeHtml(clinicName)}</h1><p class="subtitle">Lab Diagnostic Report</p><p class="generated">Generated on: ${escapeHtml(uploadedAt)}</p></header><section class="info"><div class="info-card"><p><b>Patient Name:</b> ${escapeHtml(patientName)}</p><p><b>Patient ID:</b> ${escapeHtml(patientId)}</p><p><b>Patient Code:</b> ${escapeHtml(patientCode)}</p></div><div class="info-card"><p><b>Referred Doctor(s):</b> ${escapeHtml(report.doctor_name || '-')}</p><p><b>Technician:</b> ${escapeHtml(report.technician_name || '-')}</p><p><b>Total Price:</b> ₹ ${price.toFixed(2)}</p></div></section><section class="table-wrap"><table><thead><tr><th>Test Name</th><th>Report ID</th><th>Parameter</th><th>Value</th><th>Unit</th><th>Reference Range</th><th>Status</th><th>Uploaded At</th><th class="right">Price</th></tr></thead><tbody>${bodyRows}<tr class="total"><td colspan="8" class="right">Total</td><td class="right">₹ ${price.toFixed(2)}</td></tr></tbody></table></section><section class="remarks"><h3>Remarks</h3><p>${escapeHtml(report.remarks || '-')}</p></section><footer class="foot"><span>Clinic: ${escapeHtml(clinicName)}</span><span>Patient: ${escapeHtml(patientName)} (${escapeHtml(patientId)})</span></footer></main></body></html>`;
}

function createHistoryPdfHtml(
  history: MedicalHistoryPayload,
  fallbackName: string,
  fallbackCode: string,
  age: string,
) {
  const patient = history.patient;
  const patientName = patient.full_name || fallbackName || 'Patient';
  const patientCode = patient.patient_code || fallbackCode || '-';
  const dateLabel = new Intl.DateTimeFormat('en-IN', {
    dateStyle: 'short',
    timeStyle: 'short',
  }).format(new Date());
  const detail = (label: string, value?: string | null) =>
    `<div class="detail"><b>${escapeHtml(label)}</b><span>${escapeHtml(
      value || 'Not recorded',
    )}</span></div>`;
  const visitCards = history.visits
    .map(
      visit => `<article class="record">
    <header class="record-head"><div class="record-title"><strong>${escapeHtml(
      visit.reason || 'Consultation',
    )}</strong><span class="badge">${escapeHtml(
        visit.status || 'Recorded',
      )}</span></div>
    <div class="meta">${escapeHtml(
      dateTime(visit.appointment_date, visit.appointment_time),
    )} &nbsp; Â· &nbsp; ${escapeHtml(
        formatDoctorName(visit.doctor_name),
      )}</div>
    ${
      visit.prescription_id
        ? `<div class="prescription">Prescription #${escapeHtml(
            visit.prescription_id,
          )}</div>`
        : ''
    }</header>
    <div class="record-body">${
      visit.notes
        ? `<div class="note"><b>Notes</b><br>${escapeHtml(visit.notes)}</div>`
        : ''
    }
      ${
        visit.symptoms || visit.diagnosis || visit.advice
          ? `<div class="details">${
              visit.symptoms ? detail('Symptoms', visit.symptoms) : ''
            }${visit.diagnosis ? detail('Diagnosis', visit.diagnosis) : ''}${
              visit.advice ? detail('Clinical advice', visit.advice) : ''
            }</div>`
          : ''
      }
      ${
        (visit.medicines || []).length
          ? `<section class="medicine"><div class="medicine-head">Prescribed medicines <span>${
              visit.medicines!.length
            }</span></div>${visit
              .medicines!.map(
                medicine =>
                  `<div class="medicine-row"><b>${escapeHtml(
                    medicine.medicine_name || '-',
                  )}</b>${
                    medicine.instruction
                      ? `<p>${escapeHtml(medicine.instruction)}</p>`
                      : ''
                  }<div class="chips"><span>Dosage: ${escapeHtml(
                    medicine.dosage || '-',
                  )}</span><span>Frequency: ${escapeHtml(
                    medicine.frequency || '-',
                  )}</span><span>Duration: ${escapeHtml(
                    medicine.duration || '-',
                  )}</span></div></div>`,
              )
              .join('')}</section>`
          : ''
      }
    </div></article>`,
    )
    .join('');
  const reportCards = history.labReports
    .map(report => {
      const rows = resultRows(report.report_data);
      const status = report.is_abnormal
        ? 'Abnormal'
        : report.status || 'Normal';
      return `<article class="record report"><header class="record-head"><div class="record-title"><strong>${escapeHtml(
        report.test_name || 'Lab report',
      )}</strong><span class="badge ${
        report.is_abnormal ? 'abnormal' : ''
      }">${escapeHtml(status)}</span></div>
      <div class="meta">${escapeHtml(
        [report.test_type, report.sample_type].filter(Boolean).join(' Â· ') ||
          'General diagnostic test',
      )} &nbsp; Â· &nbsp; ${escapeHtml(
        dateTime(report.uploaded_at || report.created_at),
      )} &nbsp; Â· &nbsp; Report #${escapeHtml(
        report.report_id || 'Pending',
      )}</div></header>
      <div class="record-body"><div class="report-meta">${detail(
        'Patient',
        `${patientName} Â· ${patientCode}`,
      )}${detail('Referred by', report.doctor_name)}${detail(
        'Technician',
        report.technician_name,
      )}${detail(
        'Reported on',
        dateTime(report.uploaded_at || report.created_at),
      )}</div>
        <h3 class="table-title">Test results <small>${
          rows.length
        } parameters recorded</small><span>Total: â‚¹${Number(
        report.price || 0,
      ).toFixed(2)}</span></h3>
        <table><thead><tr><th>Parameter</th><th>Result</th><th>Unit</th><th>Reference range</th><th>Status</th></tr></thead><tbody>${(rows.length
          ? rows
          : [{ name: '-', value: '-', unit: '-', range: '-' }]
        )
          .map(
            row =>
              `<tr><td>${escapeHtml(row.name)}</td><td><b>${escapeHtml(
                row.value,
              )}</b></td><td>${escapeHtml(
                row.unit || '-',
              )}</td><td>${escapeHtml(
                row.range || report.reference_range || '-',
              )}</td><td>${escapeHtml(status)}</td></tr>`,
          )
          .join('')}</tbody></table>
        <div class="remarks"><b>Clinical remarks</b><br>${escapeHtml(
          report.remarks || 'No remarks recorded.',
        )}</div>
      </div></article>`;
    })
    .join('');

  return `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=794, initial-scale=1"><style>
    *{box-sizing:border-box;-webkit-print-color-adjust:exact;print-color-adjust:exact} @page{size:A4 portrait;margin:12mm}
    html,body{margin:0;background:#f8fafc;color:#0f172a;font:13px Arial,Helvetica,sans-serif}body{padding:18px}
    .page{max-width:820px;margin:0 auto;background:#f8fafc}.hero{display:flex;align-items:center;gap:14px;padding:20px 22px;background:#020617;color:#fff;border-radius:18px 18px 0 0;border-bottom:3px solid #14b8a6}
    .mark{display:grid;place-items:center;width:46px;height:46px;border-radius:15px;background:#2dd4bf;color:#071522;font-size:24px;font-weight:bold}.hero h1{margin:0;font-size:21px;letter-spacing:-.4px}.hero p{margin:5px 0 0;color:#cbd5e1;font-size:11px}.meta-line{display:flex;gap:7px;align-items:center;flex-wrap:wrap}.code{padding:3px 8px;border:1px solid #2dd4bf55;border-radius:20px;background:#2dd4bf1a;color:#99f6e4;font-size:9px}
    .filters{display:flex;gap:8px;padding:12px;background:white;border-bottom:1px solid #e2e8f0}.search,.filter{padding:9px 11px;border:1px solid #e2e8f0;border-radius:12px;background:#f8fafc;color:#64748b;font-size:11px}.search{flex:1}.content{padding:18px 14px}.section{margin-bottom:22px}.section-title{display:flex;align-items:center;gap:10px;margin:0 0 12px}.section-icon{display:grid;place-items:center;width:34px;height:34px;border:1px solid #ccfbf1;border-radius:11px;background:#f0fdfa;color:#27a599;font-weight:bold}.section-title h2{margin:0;font-size:14px}.section-title p{margin:3px 0 0;color:#64748b;font-size:10px}.count{margin-left:auto;padding:5px 8px;border-radius:18px;background:#f1f5f9;color:#64748b;font-size:10px}
    .summary{display:grid;grid-template-columns:repeat(3,1fr);gap:9px}.summary .info{min-height:72px;padding:12px;border:1px solid #e2e8f0;border-radius:14px;background:white;box-shadow:0 1px 2px #0f172a0a}.info b,.detail b{display:block;margin-bottom:5px;color:#94a3b8;font-size:9px;font-weight:bold;letter-spacing:.08em;text-transform:uppercase}.info span,.detail span{font-size:11px;font-weight:600;line-height:1.45}
    .record{margin:10px 0;overflow:hidden;border:1px solid #e2e8f0;border-radius:16px;background:white;box-shadow:0 1px 2px #0f172a0a}.record-head{padding:14px 16px;border-bottom:1px solid #f1f5f9;background:linear-gradient(90deg,#f0fdfa,#fff)}.record-title{display:flex;align-items:center;gap:8px;flex-wrap:wrap}.record-title strong{font-size:13px}.badge{padding:4px 8px;border-radius:20px;background:#d1fae5;color:#047857;font-size:8px;font-weight:bold;text-transform:uppercase}.badge.abnormal{background:#ffe4e6;color:#be123c}.meta{margin-top:6px;color:#64748b;font-size:10px}.prescription{display:inline-block;margin-top:8px;padding:5px 8px;border:1px solid #ccfbf1;border-radius:15px;color:#1d7c72;font-size:9px}.record-body{padding:14px 16px}.note{margin-bottom:10px;padding:10px 12px;border:1px solid #fef3c7;border-radius:11px;background:#fffbeb;color:#78350f;font-size:11px;line-height:1.5}.details{display:grid;grid-template-columns:repeat(3,1fr);gap:8px}.detail{padding:10px 11px;border-radius:11px;background:#f8fafc}.medicine{margin-top:11px;overflow:hidden;border:1px solid #e2e8f0;border-radius:12px}.medicine-head{padding:10px 12px;border-bottom:1px solid #e2e8f0;background:#f8fafc;font-size:11px;font-weight:bold}.medicine-head span{float:right;color:#64748b}.medicine-row{padding:11px 12px;border-bottom:1px solid #f1f5f9;font-size:11px}.medicine-row p{margin:4px 0;color:#64748b}.chips{display:flex;gap:6px;flex-wrap:wrap;margin-top:7px}.chips span{padding:5px 8px;border:1px solid #e2e8f0;border-radius:14px;background:#f8fafc;color:#64748b;font-size:9px}
    .report-meta{display:grid;grid-template-columns:repeat(2,1fr);gap:7px;margin-bottom:13px}.table-title{display:flex;align-items:center;gap:8px;margin:0 0 8px;font-size:12px}.table-title small{color:#64748b;font-size:9px;font-weight:normal}.table-title span{margin-left:auto;padding:6px 9px;border-radius:10px;background:#f1f5f9;color:#475569;font-size:9px}table{width:100%;border-collapse:collapse;font-size:9px}th,td{padding:8px 7px;border:1px solid #e2e8f0;text-align:left}th{background:#f8fafc;color:#64748b;font-size:8px;text-transform:uppercase}td{color:#334155}.remarks{margin-top:11px;padding:10px 12px;border:1px solid #e2e8f0;border-radius:11px;background:#f8fafc;color:#475569;font-size:10px;line-height:1.5}.remarks b{color:#94a3b8;font-size:8px;letter-spacing:.08em;text-transform:uppercase}.empty{padding:18px;border:1px dashed #cbd5e1;border-radius:12px;background:#fff;color:#64748b;text-align:center;font-size:11px}
    .footer{display:flex;justify-content:space-between;padding:11px 14px;border-top:1px solid #e2e8f0;background:white;color:#64748b;font-size:9px}
  </style></head><body><main class="page"><header class="hero"><div class="mark">â™¡</div><div><h1>Medical history</h1><p class="meta-line"><b>${escapeHtml(
    patientName,
  )}</b><span class="code">${escapeHtml(patientCode)}</span><span>${escapeHtml(
    patient.gender || 'Gender not recorded',
  )} Â· ${escapeHtml(age)}</span></p></div></header>
    <div class="filters"><div class="search">âŒ• &nbsp; Search visits, diagnosis, medicines, lab tests...</div><div class="filter">All history &nbsp;âŒ„</div><div class="filter">All dates &nbsp;âŒ„</div></div><div class="content">
    <section class="section"><div class="section-title"><div class="section-icon">â™¡</div><div><h2>Patient overview</h2><p>Important health and emergency information</p></div></div><div class="summary">${[
      ['Blood group', patient.blood_group || 'Not recorded'],
      ['Allergies', patient.allergies || 'None recorded'],
      [
        'Emergency contact',
        [
          patient.emergency_contact_name,
          patient.emergency_relation,
          patient.emergency_contact,
        ]
          .filter(Boolean)
          .join(' Â· ') || 'Not recorded',
      ],
    ]
      .map(
        ([label, value]) =>
          `<div class="info"><b>${escapeHtml(label)}</b><span>${escapeHtml(
            value,
          )}</span></div>`,
      )
      .join('')}</div></section>
    <section class="section"><div class="section-title"><div class="section-icon">âœš</div><div><h2>Visit history</h2><p>Consultations, diagnoses and prescribed medicines</p></div><span class="count">${
      history.visits.length
    }</span></div>${
    visitCards || '<div class="empty">No visit history found.</div>'
  }</section>
    <section class="section"><div class="section-title"><div class="section-icon">â™§</div><div><h2>Lab reports</h2><p>Test requests and diagnostic results</p></div><span class="count">${
      history.labReports.length
    }</span></div>${
    reportCards || '<div class="empty">No lab reports found.</div>'
  }</section></div>
    <footer class="footer"><span>Private patient information Â· Handle with care</span><span>Generated ${escapeHtml(
      dateLabel,
    )} Â· Clinic Management</span></footer></main></body></html>`;
}

function SummaryRow({
  title,
  value,
  Icon,
}: {
  title: string;
  value: string;
  Icon: React.ComponentType<any>;
}) {
  return (
    <View style={styles.summaryRow}>
      <View style={styles.summaryIcon}>
        <Icon size={16} color={colors.primary} />
      </View>
      <View style={styles.summaryCopy}>
        <Text style={styles.eyebrow}>{title}</Text>
        <Text style={styles.summaryValue}>{value || 'Not recorded'}</Text>
      </View>
    </View>
  );
}

export function PatientMedicalHistoryModal({
  visible,
  patient,
  token,
  canExport,
  onClose,
}: Props) {
  const { height } = useWindowDimensions();
  const [history, setHistory] = useState<MedicalHistoryPayload | null>(null);
  const [loading, setLoading] = useState(false);
  const [query, setQuery] = useState('');
  const [recordFilter, setRecordFilter] = useState<RecordFilter>('all');
  const [dateFilter, setDateFilter] = useState<DateFilter>('all');
  const [openFilter, setOpenFilter] = useState<'record' | 'date' | null>(null);
  const [expandedReport, setExpandedReport] = useState<string | null>(null);
  const [downloading, setDownloading] = useState<string | null>(null);
  const [printing, setPrinting] = useState<string | null>(null);

  useEffect(() => {
    if (!visible || !patient?.id || !token) return;
    let cancelled = false;
    setLoading(true);
    setHistory(null);
    setQuery('');
    setRecordFilter('all');
    setDateFilter('all');
    setExpandedReport(null);
    getPatientMedicalHistoryApi(patient.id, token)
      .then(response => {
        if (!response.success)
          throw new Error(
            response.message || 'Unable to load medical history.',
          );
        if (!cancelled) setHistory(response.data || null);
      })
      .catch((error: any) => {
        if (!cancelled)
          showErrorToast(
            'Medical history',
            error?.message || 'Unable to load medical history.',
          );
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [visible, patient?.id, token]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    const visits = (
      recordFilter === 'reports' ? [] : history?.visits || []
    ).filter(item => {
      const text = [
        item.reason,
        item.notes,
        item.status,
        item.doctor_name,
        item.diagnosis,
        item.symptoms,
        item.advice,
        item.prescription_id,
        ...(item.medicines || []).flatMap(m => [
          m.medicine_name,
          m.dosage,
          m.frequency,
          m.duration,
          m.instruction,
        ]),
      ]
        .join(' ')
        .toLowerCase();
      return (
        (!q || text.includes(q)) &&
        dateMatches(item.appointment_date, dateFilter)
      );
    });
    const labReports = (
      recordFilter === 'visits' ? [] : history?.labReports || []
    ).filter(item => {
      const text = [
        item.test_name,
        item.test_type,
        item.sample_type,
        item.status,
        item.report_id,
        item.doctor_name,
        item.technician_name,
        item.remarks,
        typeof item.report_data === 'string'
          ? item.report_data
          : JSON.stringify(item.report_data || {}),
      ]
        .join(' ')
        .toLowerCase();
      return (
        (!q || text.includes(q)) &&
        dateMatches(item.uploaded_at || item.created_at, dateFilter)
      );
    });
    return { visits, labReports };
  }, [dateFilter, history, query, recordFilter]);

  const age = useMemo(() => {
    const dob = history?.patient?.date_of_birth;
    if (!dob) return '-';
    const date = new Date(dob);
    if (Number.isNaN(date.getTime())) return '-';
    let years = new Date().getFullYear() - date.getFullYear();
    if (
      new Date().getMonth() < date.getMonth() ||
      (new Date().getMonth() === date.getMonth() &&
        new Date().getDate() < date.getDate())
    )
      years--;
    return `${years} yrs`;
  }, [history?.patient?.date_of_birth]);

  const reportPdf = async (
    report: MedicalHistoryPayload['labReports'][number],
  ) => {
    if (
      Platform.OS !== 'android' ||
      !NativeModules.BillPdfDownload?.downloadHtmlAsPdf
    ) {
      Alert.alert(
        'PDF download unavailable',
        'PDF download is currently supported on Android.',
      );
      return;
    }
    const patientInfo = history?.patient;
    const patientName = patientInfo?.full_name || patient?.full_name || 'Patient';
    const patientCode = patientInfo?.patient_code || patient?.patient_code || '-';
    const html = createLabReportHtml(
      report,
      patientName,
      patientInfo?.id || patient?.id || patientCode,
      patientCode,
      patientInfo?.clinic_name || 'Clinic',
      dateTime(report.uploaded_at || report.created_at),
      report.is_abnormal ? 'Abnormal' : 'Normal',
      Number(report.price || 0),
    );
    const fileName = `lab-report-${report.report_id || report.lab_test_id}.pdf`;
    setDownloading(String(report.lab_test_id));
    try {
      await NativeModules.BillPdfDownload.downloadHtmlAsPdf(html, fileName);
      Alert.alert('PDF downloaded', `${fileName} is saved in Downloads.`);
    } catch (error: any) {
      Alert.alert(
        'Download failed',
        error?.message || 'Could not create the lab report PDF.',
      );
    } finally {
      setDownloading(null);
    }
  };

  const printReport = async (report: MedicalHistoryPayload['labReports'][number]) => {
    const patientInfo = history?.patient;
    const patientName = patientInfo?.full_name || patient?.full_name || 'Patient';
    const patientCode = patientInfo?.patient_code || patient?.patient_code || '-';
    const html = createLabReportHtml(
      report,
      patientName,
      patientInfo?.id || patient?.id || patientCode,
      patientCode,
      patientInfo?.clinic_name || 'Clinic',
      dateTime(report.uploaded_at || report.created_at),
      report.is_abnormal ? 'Abnormal' : 'Normal',
      Number(report.price || 0),
    );
    setPrinting(String(report.lab_test_id));
    try {
      await printHtmlDocument(html, `Lab report ${report.report_id || report.lab_test_id}`);
    } catch (error: any) {
      Alert.alert('Print failed', error?.message || 'Could not open the lab report print dialog.');
    } finally {
      setPrinting(null);
    }
  };

  const downloadHistoryPdf = async () => {
    if (!canExport) {
      showErrorToast(
        'Permission denied',
        'You do not have permission to export patient records.',
      );
      return;
    }
    if (!history) return;
    if (
      Platform.OS !== 'android' ||
      !NativeModules.BillPdfDownload?.downloadHtmlAsPdf
    ) {
      Alert.alert(
        'PDF download unavailable',
        'PDF download is currently supported on Android.',
      );
      return;
    }
    const p = history.patient;
    const html = createHistoryPdfHtml(
      history,
      patient?.full_name || 'Patient',
      patient?.patient_code || '-',
      age,
    );
    setDownloading('history');
    try {
      await NativeModules.BillPdfDownload.downloadHtmlAsPdf(
        html,
        `medical-history-${
          p.patient_code || patient?.patient_code || patient?.id
        }.pdf`,
      );
      Alert.alert(
        'PDF downloaded',
        'Medical history PDF is saved in Downloads.',
      );
    } catch (error: any) {
      Alert.alert(
        'Download failed',
        error?.message || 'Could not create the medical history PDF.',
      );
    } finally {
      setDownloading(null);
    }
  };

  const printHistory = async () => {
    if (!canExport || !history) return;
    const html = createHistoryPdfHtml(
      history,
      patient?.full_name || 'Patient',
      patient?.patient_code || '-',
      age,
    );
    setPrinting('history');
    try {
      await printHtmlDocument(html, `Medical history ${patient?.patient_code || patient?.id || ''}`);
    } catch (error: any) {
      Alert.alert('Print failed', error?.message || 'Could not open the medical history print dialog.');
    } finally {
      setPrinting(null);
    }
  };

  const resetFilters = () => {
    setQuery('');
    setRecordFilter('all');
    setDateFilter('all');
    setExpandedReport(null);
  };
  const recordsCount = filtered.visits.length + filtered.labReports.length;
  const filtersActive =
    Boolean(query.trim()) || recordFilter !== 'all' || dateFilter !== 'all';

  return (
    <AppModal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
      statusBarTranslucent
    >
      <View style={styles.backdrop}>
        <View
          style={[
            styles.modal,
            { height: Math.max(300, Math.min(height - 24, 880)) },
          ]}
        >
          <View style={styles.header}>
            <View style={styles.headerIcon}>
              <HeartPulse size={23} color="#071522" />
            </View>
            <View style={styles.headerCopy}>
              <Text style={styles.title}>Medical history</Text>
              <View style={styles.patientMeta}>
                <Text style={styles.patientName} numberOfLines={1}>
                  {history?.patient?.full_name ||
                    patient?.full_name ||
                    'Patient'}
                </Text>
                <Text style={styles.codeBadge}>
                  {history?.patient?.patient_code ||
                    patient?.patient_code ||
                    '-'}
                </Text>
                <Text style={styles.patientAge}>
                  {history?.patient?.gender || 'Gender not recorded'}{' · '}{age}
                </Text>
              </View>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.closeIcon}>
              <X size={18} color={colors.surface} />
            </TouchableOpacity>
          </View>

          {!loading && history ? (
            <View style={styles.filters}>
              <View style={styles.searchBox}>
                <Search size={15} color={colors.subtle} />
                <TextInput
                  value={query}
                  onChangeText={setQuery}
                  placeholder="Search visits, diagnosis, medicines, lab tests..."
                  placeholderTextColor={colors.subtle}
                  style={styles.searchInput}
                />
                {query ? (
                  <TouchableOpacity onPress={() => setQuery('')}>
                    <X size={14} color={colors.muted} />
                  </TouchableOpacity>
                ) : null}
              </View>
              <View style={styles.filterRow}>
                <View style={styles.filterCell}>
                  <TouchableOpacity
                    style={styles.filterButton}
                    onPress={() =>
                      setOpenFilter(openFilter === 'record' ? null : 'record')
                    }
                  >
                    <Text style={styles.filterText}>
                      {recordFilter === 'all'
                        ? 'All history'
                        : recordFilter === 'visits'
                        ? 'Visits only'
                        : 'Lab reports only'}
                    </Text>
                    <ChevronDown size={14} color={colors.muted} />
                  </TouchableOpacity>
                  {openFilter === 'record' ? (
                    <View style={styles.dropdown}>
                      {(['all', 'visits', 'reports'] as RecordFilter[]).map(
                        key => (
                          <TouchableOpacity
                            key={key}
                            style={styles.dropdownOption}
                            onPress={() => {
                              setRecordFilter(key);
                              setOpenFilter(null);
                              setExpandedReport(null);
                            }}
                          >
                            <Text style={styles.filterText}>
                              {key === 'all'
                                ? 'All history'
                                : key === 'visits'
                                ? 'Visits only'
                                : 'Lab reports only'}
                            </Text>
                          </TouchableOpacity>
                        ),
                      )}
                    </View>
                  ) : null}
                </View>
                <View style={styles.filterCell}>
                  <TouchableOpacity
                    style={styles.filterButton}
                    onPress={() =>
                      setOpenFilter(openFilter === 'date' ? null : 'date')
                    }
                  >
                    <Text style={styles.filterText}>
                      {
                        DATE_FILTERS.find(item => item.key === dateFilter)
                          ?.label
                      }
                    </Text>
                    <ChevronDown size={14} color={colors.muted} />
                  </TouchableOpacity>
                  {openFilter === 'date' ? (
                    <View style={[styles.dropdown, styles.dropdownRight]}>
                      {DATE_FILTERS.map(item => (
                        <TouchableOpacity
                          key={item.key}
                          style={styles.dropdownOption}
                          onPress={() => {
                            setDateFilter(item.key);
                            setOpenFilter(null);
                            setExpandedReport(null);
                          }}
                        >
                          <Text style={styles.filterText}>{item.label}</Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                  ) : null}
                </View>
              </View>
              {filtersActive ? (
                <View style={styles.filterSummary}>
                  <Text style={styles.filterNote}>
                    {recordsCount} of{' '}
                    {(history.visits?.length || 0) +
                      (history.labReports?.length || 0)}{' '}
                    medical records match
                  </Text>
                  <TouchableOpacity style={styles.reset} onPress={resetFilters}>
                    <RotateCcw size={12} color={colors.primary} />
                    <Text style={styles.resetText}>Reset filters</Text>
                  </TouchableOpacity>
                </View>
              ) : (
                <View style={styles.filterSummary}>
                  <SlidersHorizontal size={12} color={colors.subtle} />
                  <Text style={styles.filterNote}>
                    Filter by record type or date
                  </Text>
                </View>
              )}
            </View>
          ) : null}

          {loading ? (
            <View style={styles.loading}>
              <ActivityIndicator size="large" color={colors.primary} />
              <Text style={styles.sectionTitle}>
                Loading medical history...
              </Text>
              <Text style={styles.filterNote}>
                Collecting visits, reports, and patient summary.
              </Text>
            </View>
          ) : (
            <LiquidBorderScrollView
              style={styles.content}
              contentContainerStyle={styles.contentInner}
              showsVerticalScrollIndicator
              keyboardShouldPersistTaps="handled"
            >
              {!history ? (
                <View style={styles.empty}>
                  <Text style={styles.emptyTitle}>
                    Medical history unavailable
                  </Text>
                  <Text style={styles.filterNote}>
                    Check your connection and try again.
                  </Text>
                </View>
              ) : filtersActive && recordsCount === 0 ? (
                <View style={styles.empty}>
                  <Search size={26} color={colors.subtle} />
                  <Text style={styles.emptyTitle}>
                    No matching medical records
                  </Text>
                  <Text style={styles.filterNote}>
                    Try changing your search, record type, or date filter.
                  </Text>
                  <TouchableOpacity onPress={resetFilters} style={styles.reset}>
                    <RotateCcw size={13} color={colors.primary} />
                    <Text style={styles.resetText}>Clear filters</Text>
                  </TouchableOpacity>
                </View>
              ) : (
                <>
                  {recordFilter !== 'reports' ? (
                    <>
                      <View style={styles.sectionTitleRow}>
                        <View style={styles.sectionIcon}>
                          <HeartPulse size={17} color={colors.primary} />
                        </View>
                        <View style={styles.sectionCopy}>
                          <Text style={styles.sectionTitle}>
                            Patient overview
                          </Text>
                          <Text style={styles.sectionSubtitle}>
                            Important health and emergency information
                          </Text>
                        </View>
                      </View>
                      <SummaryRow
                        title="Blood group"
                        value={history?.patient?.blood_group || 'Not recorded'}
                        Icon={Droplets}
                      />
                      <SummaryRow
                        title="Allergies"
                        value={history?.patient?.allergies || 'None recorded'}
                        Icon={ShieldAlert}
                      />
                      <SummaryRow
                        title="Emergency contact"
                        value={
                          [
                            history?.patient?.emergency_contact_name,
                            history?.patient?.emergency_relation,
                            history?.patient?.emergency_contact,
                          ]
                            .filter(Boolean)
                            .join(' Â· ') || 'Not recorded'
                        }
                        Icon={ContactRound}
                      />
                    </>
                  ) : null}

                  {recordFilter !== 'reports' ? (
                    <>
                      <View style={styles.sectionTitleRow}>
                        <View style={styles.sectionIcon}>
                          <Stethoscope size={17} color={colors.primary} />
                        </View>
                        <View style={styles.sectionCopy}>
                          <Text style={styles.sectionTitle}>Visit history</Text>
                          <Text style={styles.sectionSubtitle}>
                            Consultations, diagnoses and prescribed medicines
                          </Text>
                        </View>
                        <Text style={styles.countBadge}>
                          {filtered.visits.length}
                        </Text>
                      </View>
                      {filtered.visits.length ? (
                        filtered.visits.map(visit => (
                          <View
                            key={String(visit.appointment_id)}
                            style={styles.recordCard}
                          >
                            <View style={styles.recordHead}>
                              <View style={styles.recordTitleRow}>
                                <Text style={styles.recordTitle}>
                                  {visit.reason || 'Consultation'}
                                </Text>
                                <Text style={styles.statusBadge}>
                                  {visit.status || 'Recorded'}
                                </Text>
                              </View>
                              <View style={styles.recordMeta}>
                                <CalendarDays size={12} color={colors.muted} />
                                <Text style={styles.recordMetaText}>
                                  {dateTime(
                                    visit.appointment_date,
                                    visit.appointment_time,
                                  )}
                                </Text>
                                <Stethoscope size={12} color={colors.muted} />
                                <Text style={styles.recordMetaText}>
                                  {formatDoctorName(visit.doctor_name)}
                                </Text>
                              </View>
                              {visit.prescription_id ? (
                                <Text style={styles.prescriptionBadge}>
                                  <FileText size={11} color={colors.primary} />{' '}
                                  Prescription #{visit.prescription_id}
                                </Text>
                              ) : null}
                            </View>
                            <View style={styles.recordBody}>
                              {visit.notes ? (
                                <View style={styles.notes}>
                                  <AlertCircle size={14} color={colors.warning} />
                                  <Text style={styles.notesText}>
                                    {visit.notes}
                                  </Text>
                                </View>
                              ) : null}
                              {[
                                ['Symptoms', visit.symptoms],
                                ['Diagnosis', visit.diagnosis],
                                ['Clinical advice', visit.advice],
                              ]
                                .filter(([, value]) => value)
                                .map(([label, value]) => (
                                  <View
                                    key={String(label)}
                                    style={styles.detailBlock}
                                  >
                                    <Text style={styles.eyebrow}>{label}</Text>
                                    <Text style={styles.detailValue}>
                                      {value}
                                    </Text>
                                  </View>
                                ))}
                              {visit.medicines?.length ? (
                                <View style={styles.subSection}>
                                  <View style={styles.subHeader}>
                                    <Pill size={15} color={colors.primary} />
                                    <Text style={styles.subTitle}>
                                      Prescribed medicines
                                    </Text>
                                    <Text style={styles.countBadge}>
                                      {visit.medicines.length}
                                    </Text>
                                  </View>
                                  {visit.medicines.map(medicine => (
                                    <View
                                      key={String(
                                        medicine.prescription_item_id,
                                      )}
                                      style={styles.medicine}
                                    >
                                      <Text style={styles.medicineName}>
                                        {medicine.medicine_name || '-'}
                                      </Text>
                                      {medicine.instruction ? (
                                        <Text style={styles.recordMetaText}>
                                          {medicine.instruction}
                                        </Text>
                                      ) : null}
                                      <Text style={styles.medicineInfo}>
                                        Dosage: {medicine.dosage || '-'} Â·
                                        Frequency: {medicine.frequency || '-'}{' '}
                                        Â· Duration: {medicine.duration || '-'}
                                      </Text>
                                    </View>
                                  ))}
                                </View>
                              ) : visit.prescription_id ? (
                                <Text style={styles.filterNote}>
                                  No medicines found for this prescription.
                                </Text>
                              ) : null}
                            </View>
                          </View>
                        ))
                      ) : (
                        <Text style={styles.emptyInline}>
                          No visit history found.
                        </Text>
                      )}
                    </>
                  ) : null}

                  {recordFilter !== 'visits' ? (
                    <>
                      <View style={styles.sectionTitleRow}>
                        <View style={styles.sectionIcon}>
                          <FlaskConical size={17} color={colors.primary} />
                        </View>
                        <View style={styles.sectionCopy}>
                          <Text style={styles.sectionTitle}>Lab reports</Text>
                          <Text style={styles.sectionSubtitle}>
                            Test requests and diagnostic results
                          </Text>
                        </View>
                        <Text style={styles.countBadge}>
                          {filtered.labReports.length}
                        </Text>
                      </View>
                      {filtered.labReports.length ? (
                        filtered.labReports.map(report => {
                          const id = String(
                            report.report_id || report.lab_test_id,
                          );
                          const expanded = expandedReport === id;
                          const rows = resultRows(report.report_data);
                          return (
                            <View
                              key={String(report.lab_test_id)}
                              style={[
                                styles.recordCard,
                                expanded && styles.expandedCard,
                              ]}
                            >
                              <View style={styles.reportHead}>
                                <View style={styles.reportIcon}>
                                  <FlaskConical size={18} color="#7C3AED" />
                                </View>
                                <View style={styles.reportCopy}>
                                  <View style={styles.recordTitleRow}>
                                    <Text style={styles.recordTitle}>
                                      {report.test_name || '-'}
                                    </Text>
                                    <Text style={styles.statusBadge}>
                                      {report.is_abnormal
                                        ? 'Abnormal'
                                        : report.status || 'Ordered'}
                                    </Text>
                                  </View>
                                  <Text style={styles.reportType}>
                                    {[report.test_type, report.sample_type]
                                      .filter(Boolean)
                                      .join(' Â· ') ||
                                      'General diagnostic test'}
                                  </Text>
                                  <Text style={styles.recordMetaText}>
                                    {dateTime(
                                      report.uploaded_at || report.created_at,
                                    )}{' '}
                                    Â· Report #{report.report_id || 'Pending'}
                                  </Text>
                                </View>
                              </View>
                              {report.report_id ? (
                                <TouchableOpacity
                                  style={styles.expandButton}
                                  onPress={() =>
                                    setExpandedReport(expanded ? null : id)
                                  }
                                >
                                  {expanded ? (
                                    <ChevronUp size={14} color={colors.primary} />
                                  ) : (
                                    <Eye size={14} color={colors.muted} />
                                  )}
                                  <Text
                                    style={[
                                      styles.expandText,
                                      expanded && styles.expandTextActive,
                                    ]}
                                  >
                                    {expanded ? 'Hide report' : 'View report'}
                                  </Text>
                                </TouchableOpacity>
                              ) : null}
                              {expanded ? (
                                <View style={styles.reportDetails}>
                                  <View style={styles.reportPrintableCard}>
                                  <View style={styles.reportExpandedHeader}>
                                    <View style={styles.reportFileIcon}>
                                      <FileText size={18} color={colors.primary} />
                                    </View>
                                    <View style={styles.reportExpandedCopy}>
                                      <View style={styles.recordTitleRow}>
                                        <Text style={styles.reportDetailTitle} numberOfLines={2}>
                                          {report.test_name || 'Lab report'}
                                        </Text>
                                        <Text style={[styles.statusBadge, report.is_abnormal ? styles.abnormalReportStatus : undefined]}>
                                          {report.is_abnormal ? 'Abnormal' : 'Normal'}
                                        </Text>
                                      </View>
                                      <Text style={styles.reportDetailSubtitle}>
                                        {history?.patient?.clinic_name || 'Clinic'} · Report #{report.report_id || report.lab_test_id}
                                      </Text>
                                    </View>
                                  </View>
                                  <View style={styles.reportActions}>
                                    <TouchableOpacity
                                      disabled={printing === String(report.lab_test_id)}
                                      style={styles.reportActionButton}
                                      onPress={() => void printReport(report)}>
                                      {printing === String(report.lab_test_id) ? <ActivityIndicator size="small" color={colors.primary} /> : <Printer size={13} color={colors.muted} />}
                                      <Text style={styles.reportActionText}>Print</Text>
                                    </TouchableOpacity>
                                    <TouchableOpacity
                                      disabled={downloading === String(report.lab_test_id)}
                                      style={styles.reportActionButton}
                                      onPress={() => void reportPdf(report)}>
                                      {downloading === String(report.lab_test_id) ? <ActivityIndicator size="small" color={colors.primary} /> : <Download size={13} color={colors.muted} />}
                                      <Text style={styles.reportActionText}>Download</Text>
                                    </TouchableOpacity>
                                  </View>
                                  <SummaryRow
                                    title="Patient"
                                    value={`${
                                      history?.patient?.full_name ||
                                      patient?.full_name ||
                                      'Patient'
                                    } Â· ${
                                      history?.patient?.patient_code ||
                                      patient?.patient_code ||
                                      '-'
                                    }`}
                                    Icon={UserRound}
                                  />
                                  <SummaryRow
                                    title="Referred by"
                                    value={report.doctor_name || 'Not recorded'}
                                    Icon={Stethoscope}
                                  />
                                  <SummaryRow
                                    title="Technician"
                                    value={
                                      report.technician_name || 'Not recorded'
                                    }
                                    Icon={Microscope}
                                  />
                                  <SummaryRow
                                    title="Reported on"
                                    value={dateTime(
                                      report.uploaded_at || report.created_at,
                                    )}
                                    Icon={CalendarDays}
                                  />
                                  <View style={styles.resultSection}>
                                    <View style={styles.resultSectionHeader}>
                                      <View>
                                        <Text style={styles.subTitle}>Test results</Text>
                                        <Text style={styles.recordMetaText}>{rows.length} parameters recorded</Text>
                                      </View>
                                      <View style={styles.resultTotalPill}>
                                        <IndianRupee size={13} color={colors.primary} />
                                        <Text style={styles.recordMetaText}>Total:</Text>
                                        <Text style={styles.resultTotalValue}>{Number(report.price || 0).toFixed(2)}</Text>
                                      </View>
                                    </View>
                                    {rows.length ? (
                                      rows.map((row, index) => (
                                        <View
                                          key={`${id}-${index}`}
                                          style={styles.resultRow}
                                        >
                                          <View style={styles.resultTop}>
                                            <Text style={styles.medicineName}>
                                              {row.name ||
                                                `Parameter ${index + 1}`}
                                            </Text>
                                            <Text style={styles.resultValue}>
                                              {row.value || '-'} {row.unit}
                                            </Text>
                                          </View>
                                          <View style={styles.resultMetrics}>
                                            <View style={styles.resultMetric}>
                                              <Text style={styles.resultMetricLabel}>Reference range</Text>
                                              <Text style={styles.resultMetricValue}>
                                                {row.range || report.reference_range || '-'}
                                              </Text>
                                            </View>
                                            <View style={styles.resultMetric}>
                                              <Text style={styles.resultMetricLabel}>Status</Text>
                                              <Text style={styles.resultMetricValue}>
                                                {report.is_abnormal ? 'Abnormal' : 'Normal'}
                                              </Text>
                                            </View>
                                          </View>
                                        </View>
                                      ))
                                    ) : (
                                      <Text style={styles.emptyInline}>
                                        No test results recorded.
                                      </Text>
                                    )}
                                  </View>
                                  <View style={styles.detailBlock}>
                                    <Text style={styles.eyebrow}>
                                      Clinical remarks
                                    </Text>
                                    <Text style={styles.detailValue}>
                                      {report.remarks || 'No remarks recorded.'}
                                    </Text>
                                  </View>
                                  </View>
                                </View>
                              ) : null}
                            </View>
                          );
                        })
                      ) : (
                        <Text style={styles.emptyInline}>
                          No lab reports found.
                        </Text>
                      )}
                    </>
                  ) : null}
                </>
              )}
            </LiquidBorderScrollView>
          )}

          <View style={styles.footer}>
            <View style={{ flex: 1 }} />
            {canExport ? (
              <TouchableOpacity
                disabled={!history || printing === 'history'}
                style={styles.downloadButton}
                onPress={() => void printHistory()}>
                {printing === 'history' ? <ActivityIndicator size="small" color={colors.primary} /> : <Printer size={14} color={colors.muted} />}
                <Text style={styles.downloadButtonText}>Print</Text>
              </TouchableOpacity>
            ) : null}
            {canExport ? (
              <TouchableOpacity
                disabled={!history || downloading === 'history'}
                style={styles.downloadButton}
                onPress={() => void downloadHistoryPdf()}
              >
                {downloading === 'history' ? (
                  <ActivityIndicator size="small" color={colors.primary} />
                ) : (
                  <Download size={14} color={colors.muted} />
                )}
                <Text style={styles.downloadButtonText}>Download PDF</Text>
              </TouchableOpacity>
            ) : null}
            <TouchableOpacity style={styles.closeButton} onPress={onClose}>
              <X size={14} color={colors.surface} />
              <Text style={styles.closeText}>Close</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </AppModal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.md,
    backgroundColor: 'rgba(15,23,42,0.68)',
  },
  modal: {
    width: '100%',
    maxWidth: 650,
    overflow: 'hidden',
    borderRadius: 19,
    backgroundColor: colors.background,
    elevation: 22,
  },
  header: {
    minHeight: 84,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    padding: 15,
    paddingRight: 58,
    backgroundColor: '#071522',
  },
  headerIcon: {
    width: 43,
    height: 43,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 15,
    backgroundColor: '#2DD4BF',
  },
  headerCopy: { flex: 1, minWidth: 0 },
  title: { fontFamily: typography.family, color: colors.surface, fontSize: typography.size.title, fontWeight: typography.weight.extrabold },
  patientMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: spacing.tiny,
    marginTop: spacing.xs,
  },
  patientName: {
    fontFamily: typography.family, maxWidth: '48%',
    color: colors.surface,
    fontSize: typography.size.micro,
    fontWeight: typography.weight.bold,
  },
  codeBadge: {
    fontFamily: typography.family, overflow: 'hidden',
    borderRadius: radii.md,
    paddingHorizontal: 7,
    paddingVertical: 3,
    backgroundColor: 'rgba(45,212,191,0.13)',
    color: colors.mintBorder,
    fontSize: 8,
    fontWeight: typography.weight.bold,
  },
  patientAge: { fontFamily: typography.family, color: colors.input, fontSize: 9 },
  closeIcon: {
    position: 'absolute',
    right: 12,
    top: 14,
    width: 34,
    height: 34,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 17,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.15)',
    backgroundColor: 'rgba(255,255,255,0.1)',
  },
  filters: {
    zIndex: 5,
    gap: spacing.sm,
    padding: 11,
    borderBottomWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  searchBox: {
    minHeight: 37,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: 10,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 11,
    backgroundColor: colors.background,
  },
  searchInput: { fontFamily: typography.family, flex: 1, paddingVertical: 5, color: colors.foreground, fontSize: typography.size.xs },
  filterRow: { flexDirection: 'row', gap: spacing.sm },
  filterCell: { zIndex: 10, flex: 1 },
  filterButton: {
    minHeight: 37,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 5,
    paddingHorizontal: 10,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 11,
    backgroundColor: colors.background,
  },
  filterText: { fontFamily: typography.family, flex: 1, color: colors.foreground, fontSize: typography.size.micro },
  dropdown: {
    position: 'absolute',
    top: 40,
    left: 0,
    right: 0,
    zIndex: 20,
    padding: spacing.xs,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 11,
    backgroundColor: colors.surface,
    elevation: 10,
  },
  dropdownRight: { right: 0 },
  dropdownOption: {
    minHeight: 34,
    justifyContent: 'center',
    paddingHorizontal: spacing.sm,
  },
  filterSummary: {
    minHeight: 19,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 5,
  },
  filterNote: { fontFamily: typography.family, color: colors.muted, fontSize: 9 },
  reset: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  resetText: { fontFamily: typography.family, color: colors.primary, fontSize: 9, fontWeight: typography.weight.bold },
  content: { flex: 1 },
  contentInner: { gap: 10, padding: spacing.md, paddingBottom: spacing.xl },
  loading: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: spacing.sm },
  empty: {
    minHeight: 260,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    padding: 25,
  },
  emptyTitle: {
    fontFamily: typography.family, color: colors.foreground,
    fontSize: typography.size.caption,
    fontWeight: typography.weight.extrabold,
    textAlign: 'center',
  },
  sectionTitleRow: {
    minHeight: 43,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 9,
    marginTop: 3,
  },
  sectionIcon: {
    width: 34,
    height: 34,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 11,
    borderWidth: 1,
    borderColor: colors.mintBorder,
    backgroundColor: colors.mint,
  },
  sectionCopy: { flex: 1, minWidth: 0 },
  sectionTitle: { fontFamily: typography.family, color: colors.text, fontSize: typography.size.lg, fontWeight: typography.weight.extrabold },
  sectionSubtitle: { fontFamily: typography.family, marginTop: 2, color: colors.muted, fontSize: 9 },
  countBadge: {
    fontFamily: typography.family, minWidth: 22,
    height: 22,
    overflow: 'hidden',
    paddingHorizontal: spacing.tiny,
    paddingTop: 5,
    borderRadius: radii.lg,
    backgroundColor: colors.secondary,
    color: colors.muted,
    fontSize: 9,
    fontWeight: typography.weight.bold,
    textAlign: 'center',
  },
  summaryRow: {
    minHeight: 58,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    padding: 10,
    borderRadius: radii.lg,
    backgroundColor: colors.background,
  },
  summaryIcon: {
    width: 28,
    height: 28,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radii.md,
    backgroundColor: colors.background,
  },
  summaryCopy: { flex: 1, minWidth: 0 },
  eyebrow: {
    fontFamily: typography.family, color: colors.subtle,
    fontSize: typography.size.sm,
    fontWeight: typography.weight.extrabold,
    letterSpacing: 0.7,
    textTransform: 'uppercase',
  },
  summaryValue: {
    fontFamily: typography.family, marginTop: 3,
    color: colors.foreground,
    fontSize: typography.size.xs,
    fontWeight: typography.weight.semibold,
  },
  recordCard: {
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.xl,
    backgroundColor: colors.surface,
    elevation: 1,
  },
  expandedCard: { borderColor: '#2DD4BF' },
  recordHead: {
    gap: spacing.tiny,
    padding: spacing.md,
    borderBottomWidth: 1,
    borderColor: colors.secondary,
    backgroundColor: colors.surface,
  },
  recordTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: spacing.tiny,
  },
  recordTitle: { fontFamily: typography.family, color: colors.text, fontSize: typography.size.xs, fontWeight: typography.weight.extrabold },
  statusBadge: {
    fontFamily: typography.family, overflow: 'hidden',
    borderRadius: 9,
    paddingHorizontal: 7,
    paddingVertical: spacing.xs,
    backgroundColor: '#ECFDF5',
    color: colors.successDark,
    fontSize: 8,
    fontWeight: typography.weight.extrabold,
    textTransform: 'uppercase',
  },
  recordMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 5,
  },
  recordMetaText: { fontFamily: typography.family, color: colors.muted, fontSize: 8 },
  prescriptionBadge: {
    fontFamily: typography.family, alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    marginTop: 2,
    paddingHorizontal: spacing.sm,
    paddingVertical: 5,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.mintBorder,
    color: colors.primaryDark,
    fontSize: 8,
  },
  recordBody: { gap: 9, padding: spacing.md },
  notes: {
    minHeight: 40,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: 10,
    paddingVertical: spacing.sm,
    borderWidth: 1,
    borderColor: colors.warningSoft,
    borderRadius: radii.lg,
    backgroundColor: '#FFFBEB',
  },
  notesText: { fontFamily: typography.family, flex: 1, color: '#78350F', fontSize: typography.size.micro },
  detailBlock: {
    minHeight: 55,
    justifyContent: 'center',
    gap: spacing.xs,
    padding: 10,
    borderRadius: radii.lg,
    backgroundColor: colors.background,
  },
  detailValue: { fontFamily: typography.family, color: colors.foreground, fontSize: typography.size.micro, lineHeight: 15 },
  subSection: {
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.lg,
  },
  subHeader: {
    minHeight: 40,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    paddingHorizontal: 10,
    borderBottomWidth: 1,
    borderColor: colors.secondary,
  },
  subTitle: { fontFamily: typography.family, color: colors.foreground, fontSize: typography.size.body, fontWeight: typography.weight.extrabold },
  medicine: {
    gap: 3,
    padding: 10,
    borderBottomWidth: 1,
    borderColor: colors.secondary,
  },
  medicineName: { fontFamily: typography.family, color: colors.text, fontSize: typography.size.micro, fontWeight: typography.weight.extrabold },
  medicineInfo: { fontFamily: typography.family, color: colors.muted, fontSize: 8 },
  emptyInline: { fontFamily: typography.family, padding: 13, color: colors.muted, fontSize: 9 },
  reportHead: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    padding: spacing.md,
  },
  reportIcon: {
    width: 37,
    height: 37,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radii.lg,
    backgroundColor: '#F5F3FF',
  },
  reportCopy: { flex: 1, minWidth: 0, gap: spacing.xs },
  reportType: { fontFamily: typography.family, color: colors.muted, fontSize: 9 },
  expandButton: {
    minHeight: 36,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.tiny,
    marginHorizontal: 11,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 11,
    backgroundColor: colors.background,
  },
  expandText: { fontFamily: typography.family, color: colors.muted, fontSize: typography.size.micro, fontWeight: typography.weight.bold },
  expandTextActive: { color: colors.primary },
  reportDetails: {
    gap: spacing.sm,
    padding: 10,
    borderTopWidth: 1,
    borderColor: colors.secondary,
    backgroundColor: colors.background,
  },
  reportPrintableCard: {
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.lg,
    backgroundColor: colors.surface,
  },
  reportExpandedHeader: {
    minHeight: 66,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: spacing.md,
    paddingVertical: 10,
    backgroundColor: colors.mint,
    borderBottomWidth: 1,
    borderColor: colors.secondary,
  },
  reportFileIcon: {
    width: 42,
    height: 42,
    flexShrink: 0,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.mintBorder,
    backgroundColor: colors.surface,
  },
  reportExpandedCopy: { flex: 1, minWidth: 0, gap: spacing.xs },
  reportDetailTitle: { fontFamily: typography.family, flexShrink: 1, color: colors.text, fontSize: typography.size.sm, fontWeight: typography.weight.extrabold },
  reportDetailSubtitle: { fontFamily: typography.family, color: colors.muted, fontSize: 9 },
  abnormalReportStatus: { backgroundColor: colors.destructive, color: colors.surface },
  reportActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: 10,
    backgroundColor: colors.mint,
  },
  reportActionButton: {
    minHeight: 36,
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.tiny,
    paddingHorizontal: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 11,
    backgroundColor: colors.surface,
  },
  reportActionText: { fontFamily: typography.family, color: colors.muted, fontSize: typography.size.micro, fontWeight: typography.weight.bold },
  resultSectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.tiny,
  },
  resultTotalPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingHorizontal: 9,
    paddingVertical: 7,
    borderRadius: radii.lg,
    backgroundColor: colors.secondary,
  },
  resultTotalValue: { fontFamily: typography.family, color: colors.text, fontSize: typography.size.micro, fontWeight: typography.weight.extrabold },
  downloadSmall: {
    minHeight: 32,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 9,
    borderWidth: 1,
    borderColor: colors.mintBorder,
    borderRadius: radii.md,
    backgroundColor: colors.surface,
  },
  downloadSmallText: { fontFamily: typography.family, color: colors.primary, fontSize: 9, fontWeight: typography.weight.bold },
  resultSection: {
    gap: 7,
    padding: 10,
    borderRadius: radii.lg,
    backgroundColor: colors.surface,
  },
  resultRow: {
    gap: 5,
    padding: 9,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 11,
    backgroundColor: colors.background,
  },
  resultTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 7,
  },
  resultMetrics: {
    flexDirection: 'row',
    gap: 14,
    marginTop: 5,
  },
  resultMetric: { flex: 1, gap: 3 },
  resultMetricLabel: {
    fontFamily: typography.family, color: colors.muted,
    fontSize: 8,
    textTransform: 'uppercase',
  },
  resultMetricValue: {
    fontFamily: typography.family, color: colors.text,
    fontSize: typography.size.micro,
    fontWeight: typography.weight.semibold,
  },
  resultValue: { fontFamily: typography.family, color: colors.primaryDark, fontSize: typography.size.xs, fontWeight: typography.weight.extrabold },
  footer: {
    minHeight: 51,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderTopWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  downloadButton: {
    minHeight: 36,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
    paddingHorizontal: 10,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 11,
    backgroundColor: colors.background,
  },
  downloadButtonText: { fontFamily: typography.family, color: colors.muted, fontSize: 9, fontWeight: typography.weight.bold },
  closeButton: {
    minWidth: 84,
    minHeight: 36,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
    paddingHorizontal: 10,
    borderRadius: 11,
    backgroundColor: '#101827',
  },
  closeText: { fontFamily: typography.family, color: colors.surface, fontSize: typography.size.micro, fontWeight: typography.weight.extrabold },
});

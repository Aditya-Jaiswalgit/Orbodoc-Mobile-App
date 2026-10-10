import React, { useEffect, useMemo, useState } from 'react';
import { AppModal } from '../../../components/common/AppModal';
import { ActivityIndicator, Alert, NativeModules, Platform, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View, useWindowDimensions } from 'react-native';
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
  Pill,
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

function createPdfHtml(
  title: string,
  rows: Array<[string, string]>,
  table?: Array<{ name: string; value: string; unit: string; range: string }>,
) {
  const dateLabel = new Intl.DateTimeFormat('en-IN', {
    dateStyle: 'short',
    timeStyle: 'short',
  }).format(new Date());
  return `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=794, initial-scale=1"><style>
    *{box-sizing:border-box}html,body{margin:0;min-height:100%;background:#fff;color:#1e293b;font:13px Arial,sans-serif}body{padding:34px 42px 38px}.page-meta{display:flex;justify-content:space-between;color:#64748b;font-size:10px;padding-bottom:18px;border-bottom:1px solid #e2e8f0}.sheet{margin:22px auto 0;max-width:710px;border:1px solid #e2e8f0;border-radius:22px;overflow:hidden;background:#fff;box-shadow:0 12px 32px rgba(15,23,42,.10)}.hero{display:flex;align-items:center;gap:14px;padding:22px 26px;background:#071522;color:white}.mark{width:46px;height:46px;border-radius:15px;background:#2dd4bf;color:#071522;display:flex;align-items:center;justify-content:center;font-size:24px;font-weight:bold}.hero h1{margin:0;font-size:22px;letter-spacing:-.4px}.hero p{margin:6px 0 0;color:#cbd5e1;font-size:12px}.body{padding:22px 24px}.section{margin:0 0 20px}.section h2{font-size:15px;margin:0 0 4px;color:#0f172a}.section .sub{font-size:11px;color:#64748b;margin-bottom:12px}.cards{display:grid;grid-template-columns:1fr 1fr;gap:10px}.info{padding:13px 14px;border:1px solid #e2e8f0;border-radius:14px;background:#fff;min-height:62px}.info b{display:block;color:#94a3b8;font-size:9px;text-transform:uppercase;letter-spacing:.08em;margin-bottom:6px}.info span{font-size:12px;font-weight:600}.record{margin:11px 0;border:1px solid #dbe3eb;border-radius:15px;overflow:hidden}.record-head{padding:14px 15px;background:linear-gradient(90deg,#f8fafc,#fff);border-bottom:1px solid #eef2f6}.record-head strong{font-size:14px}.badge{display:inline-block;margin-left:8px;padding:4px 8px;border-radius:12px;background:#ecfdf5;color:#059669;font-size:9px;font-weight:bold;text-transform:uppercase}.meta{margin-top:7px;color:#64748b;font-size:10px}.record-body{padding:14px 15px}.note{padding:11px 12px;background:#fffbeb;border:1px solid #fef3c7;border-radius:11px;color:#78350f;margin-bottom:10px}.detail{padding:11px 12px;margin:8px 0;background:#f8fafc;border-radius:11px}.detail b{display:block;color:#94a3b8;font-size:9px;letter-spacing:.08em;text-transform:uppercase;margin-bottom:6px}.detail span{font-size:12px}.table-title{font-size:13px;font-weight:bold;margin:14px 0 8px}.table{width:100%;border-collapse:collapse;font-size:10px}.table td,.table th{border:1px solid #dbe3eb;padding:9px;text-align:left}.table th{background:#f8fafc;color:#64748b;font-size:9px;text-transform:uppercase}.label{color:#64748b;width:32%;background:#f8fafc}.report-meta{display:grid;grid-template-columns:1fr 1fr;gap:8px;margin:12px 0}.footer{padding:12px 24px;border-top:1px solid #e2e8f0;color:#64748b;font-size:9px;display:flex;justify-content:space-between}
  </style></head><body><div class="page-meta"><span>${escapeHtml(
    dateLabel,
  )}</span><span>Clinic Management</span></div><main class="sheet"><header class="hero"><div class="mark">â™¡</div><div><h1>${escapeHtml(
    title,
  )}</h1><p>Patient medical records and diagnostic history</p></div></header><div class="body"><section class="section"><h2>${
    table ? 'Lab report' : 'Patient overview and medical history'
  }</h2><div class="sub">Private patient information Â· Handle with care</div><div class="cards">${rows
    .map(
      ([label, value]) =>
        `<div class="info"><b>${escapeHtml(label)}</b><span>${escapeHtml(
          value || 'Not recorded',
        )}</span></div>`,
    )
    .join('')}</div></section>${
    table
      ? `<section><div class="table-title">Test results</div><div class="sub">${
          table.length
        } parameters recorded</div><table class="table"><thead><tr><th>Parameter</th><th>Result</th><th>Unit</th><th>Reference range</th></tr></thead><tbody>${table
          .map(
            row =>
              `<tr><td>${escapeHtml(row.name)}</td><td><b>${escapeHtml(
                row.value,
              )}</b></td><td>${escapeHtml(row.unit)}</td><td>${escapeHtml(
                row.range,
              )}</td></tr>`,
          )
          .join('')}</tbody></table></section>`
      : ''
  }</div><footer class="footer"><span>Clinic: ${escapeHtml(
    rows.find(([label]) => label === 'Clinic')?.[1] || 'Clinic',
  )}</span><span>Patient record Â· ${escapeHtml(
    dateLabel,
  )}</span></footer></main></body></html>`;
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
    .filters{display:flex;gap:8px;padding:12px;background:white;border-bottom:1px solid #e2e8f0}.search,.filter{padding:9px 11px;border:1px solid #e2e8f0;border-radius:12px;background:#f8fafc;color:#64748b;font-size:11px}.search{flex:1}.content{padding:18px 14px}.section{margin-bottom:22px}.section-title{display:flex;align-items:center;gap:10px;margin:0 0 12px}.section-icon{display:grid;place-items:center;width:34px;height:34px;border:1px solid #ccfbf1;border-radius:11px;background:#f0fdfa;color:#0d9488;font-weight:bold}.section-title h2{margin:0;font-size:14px}.section-title p{margin:3px 0 0;color:#64748b;font-size:10px}.count{margin-left:auto;padding:5px 8px;border-radius:18px;background:#f1f5f9;color:#64748b;font-size:10px}
    .summary{display:grid;grid-template-columns:repeat(3,1fr);gap:9px}.summary .info{min-height:72px;padding:12px;border:1px solid #e2e8f0;border-radius:14px;background:white;box-shadow:0 1px 2px #0f172a0a}.info b,.detail b{display:block;margin-bottom:5px;color:#94a3b8;font-size:9px;font-weight:bold;letter-spacing:.08em;text-transform:uppercase}.info span,.detail span{font-size:11px;font-weight:600;line-height:1.45}
    .record{margin:10px 0;overflow:hidden;border:1px solid #e2e8f0;border-radius:16px;background:white;box-shadow:0 1px 2px #0f172a0a}.record-head{padding:14px 16px;border-bottom:1px solid #f1f5f9;background:linear-gradient(90deg,#f0fdfa,#fff)}.record-title{display:flex;align-items:center;gap:8px;flex-wrap:wrap}.record-title strong{font-size:13px}.badge{padding:4px 8px;border-radius:20px;background:#d1fae5;color:#047857;font-size:8px;font-weight:bold;text-transform:uppercase}.badge.abnormal{background:#ffe4e6;color:#be123c}.meta{margin-top:6px;color:#64748b;font-size:10px}.prescription{display:inline-block;margin-top:8px;padding:5px 8px;border:1px solid #ccfbf1;border-radius:15px;color:#0f766e;font-size:9px}.record-body{padding:14px 16px}.note{margin-bottom:10px;padding:10px 12px;border:1px solid #fef3c7;border-radius:11px;background:#fffbeb;color:#78350f;font-size:11px;line-height:1.5}.details{display:grid;grid-template-columns:repeat(3,1fr);gap:8px}.detail{padding:10px 11px;border-radius:11px;background:#f8fafc}.medicine{margin-top:11px;overflow:hidden;border:1px solid #e2e8f0;border-radius:12px}.medicine-head{padding:10px 12px;border-bottom:1px solid #e2e8f0;background:#f8fafc;font-size:11px;font-weight:bold}.medicine-head span{float:right;color:#64748b}.medicine-row{padding:11px 12px;border-bottom:1px solid #f1f5f9;font-size:11px}.medicine-row p{margin:4px 0;color:#64748b}.chips{display:flex;gap:6px;flex-wrap:wrap;margin-top:7px}.chips span{padding:5px 8px;border:1px solid #e2e8f0;border-radius:14px;background:#f8fafc;color:#64748b;font-size:9px}
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
        <Icon size={16} color="#64748B" />
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
    if (!canExport) {
      showErrorToast(
        'Permission denied',
        'You do not have permission to export patient records.',
      );
      return;
    }
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
    const results = resultRows(report.report_data);
    const html = createPdfHtml(
      report.test_name || 'Lab report',
      [
        [
          'Patient',
          `${patientInfo?.full_name || patient?.full_name || 'Patient'} Â· ${
            patientInfo?.patient_code || patient?.patient_code || ''
          }`,
        ],
        ['Clinic', patientInfo?.clinic_name || 'Clinic'],
        ['Report ID', String(report.report_id || report.lab_test_id)],
        ['Status', report.is_abnormal ? 'Abnormal' : 'Normal'],
        ['Referred by', report.doctor_name || 'Not recorded'],
        ['Technician', report.technician_name || 'Not recorded'],
        ['Reported on', dateTime(report.uploaded_at || report.created_at)],
        ['Remarks', report.remarks || 'No remarks recorded'],
      ],
      results,
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
              <X size={18} color="#FFFFFF" />
            </TouchableOpacity>
          </View>

          {!loading && history ? (
            <View style={styles.filters}>
              <View style={styles.searchBox}>
                <Search size={15} color="#94A3B8" />
                <TextInput
                  value={query}
                  onChangeText={setQuery}
                  placeholder="Search visits, diagnosis, medicines, lab tests..."
                  placeholderTextColor="#94A3B8"
                  style={styles.searchInput}
                />
                {query ? (
                  <TouchableOpacity onPress={() => setQuery('')}>
                    <X size={14} color="#64748B" />
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
                    <ChevronDown size={14} color="#64748B" />
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
                    <ChevronDown size={14} color="#64748B" />
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
                    <RotateCcw size={12} color="#0D9488" />
                    <Text style={styles.resetText}>Reset filters</Text>
                  </TouchableOpacity>
                </View>
              ) : (
                <View style={styles.filterSummary}>
                  <SlidersHorizontal size={12} color="#94A3B8" />
                  <Text style={styles.filterNote}>
                    Filter by record type or date
                  </Text>
                </View>
              )}
            </View>
          ) : null}

          {loading ? (
            <View style={styles.loading}>
              <ActivityIndicator size="large" color="#0D9488" />
              <Text style={styles.sectionTitle}>
                Loading medical history...
              </Text>
              <Text style={styles.filterNote}>
                Collecting visits, reports, and patient summary.
              </Text>
            </View>
          ) : (
            <ScrollView
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
                  <Search size={26} color="#94A3B8" />
                  <Text style={styles.emptyTitle}>
                    No matching medical records
                  </Text>
                  <Text style={styles.filterNote}>
                    Try changing your search, record type, or date filter.
                  </Text>
                  <TouchableOpacity onPress={resetFilters} style={styles.reset}>
                    <RotateCcw size={13} color="#0D9488" />
                    <Text style={styles.resetText}>Clear filters</Text>
                  </TouchableOpacity>
                </View>
              ) : (
                <>
                  {recordFilter !== 'reports' ? (
                    <>
                      <View style={styles.sectionTitleRow}>
                        <View style={styles.sectionIcon}>
                          <HeartPulse size={17} color="#0D9488" />
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
                          <Stethoscope size={17} color="#0D9488" />
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
                                <CalendarDays size={12} color="#64748B" />
                                <Text style={styles.recordMetaText}>
                                  {dateTime(
                                    visit.appointment_date,
                                    visit.appointment_time,
                                  )}
                                </Text>
                                <Stethoscope size={12} color="#64748B" />
                                <Text style={styles.recordMetaText}>
                                  {formatDoctorName(visit.doctor_name)}
                                </Text>
                              </View>
                              {visit.prescription_id ? (
                                <Text style={styles.prescriptionBadge}>
                                  <FileText size={11} color="#0D9488" />{' '}
                                  Prescription #{visit.prescription_id}
                                </Text>
                              ) : null}
                            </View>
                            <View style={styles.recordBody}>
                              {visit.notes ? (
                                <View style={styles.notes}>
                                  <AlertCircle size={14} color="#D97706" />
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
                                    <Pill size={15} color="#0D9488" />
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
                          <FlaskConical size={17} color="#0D9488" />
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
                                    <ChevronUp size={14} color="#0D9488" />
                                  ) : (
                                    <Eye size={14} color="#475569" />
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
                                  <View style={styles.reportActions}>
                                    <Text style={styles.recordMetaText}>
                                      Clinic:{' '}
                                      {history?.patient?.clinic_name ||
                                        'Clinic'}{' '}
                                      Â· Total: â‚¹
                                      {Number(report.price || 0).toFixed(2)}
                                    </Text>
                                    {canExport ? (
                                      <TouchableOpacity
                                        disabled={
                                          downloading ===
                                          String(report.lab_test_id)
                                        }
                                        style={styles.downloadSmall}
                                        onPress={() => void reportPdf(report)}
                                      >
                                        {downloading ===
                                        String(report.lab_test_id) ? (
                                          <ActivityIndicator
                                            size="small"
                                            color="#0D9488"
                                          />
                                        ) : (
                                          <Download size={13} color="#0D9488" />
                                        )}
                                        <Text style={styles.downloadSmallText}>
                                          Download PDF
                                        </Text>
                                      </TouchableOpacity>
                                    ) : null}
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
                                    Icon={FlaskConical}
                                  />
                                  <SummaryRow
                                    title="Reported on"
                                    value={dateTime(
                                      report.uploaded_at || report.created_at,
                                    )}
                                    Icon={CalendarDays}
                                  />
                                  <View style={styles.resultSection}>
                                    <Text style={styles.subTitle}>
                                      Test results
                                    </Text>
                                    <Text style={styles.recordMetaText}>
                                      {rows.length} parameters recorded
                                    </Text>
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
                                          <Text style={styles.recordMetaText}>
                                            Reference range:{' '}
                                            {row.range ||
                                              report.reference_range ||
                                              '-'}{' '}
                                            Â·{' '}
                                            {report.is_abnormal
                                              ? 'Abnormal'
                                              : 'Normal'}
                                          </Text>
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
            </ScrollView>
          )}

          <View style={styles.footer}>
            <View style={{ flex: 1 }} />
            {canExport ? (
              <TouchableOpacity
                disabled={!history || downloading === 'history'}
                style={styles.downloadButton}
                onPress={() => void downloadHistoryPdf()}
              >
                {downloading === 'history' ? (
                  <ActivityIndicator size="small" color="#0D9488" />
                ) : (
                  <Download size={14} color="#475569" />
                )}
                <Text style={styles.downloadButtonText}>Download PDF</Text>
              </TouchableOpacity>
            ) : null}
            <TouchableOpacity style={styles.closeButton} onPress={onClose}>
              <X size={14} color="#FFFFFF" />
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
    padding: 12,
    backgroundColor: 'rgba(15,23,42,0.68)',
  },
  modal: {
    width: '100%',
    maxWidth: 650,
    overflow: 'hidden',
    borderRadius: 19,
    backgroundColor: '#F8FAFC',
    elevation: 22,
  },
  header: {
    minHeight: 84,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
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
  title: { color: '#FFFFFF', fontSize: 17, fontWeight: '800' },
  patientMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 4,
  },
  patientName: {
    maxWidth: '48%',
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '700',
  },
  codeBadge: {
    overflow: 'hidden',
    borderRadius: 10,
    paddingHorizontal: 7,
    paddingVertical: 3,
    backgroundColor: 'rgba(45,212,191,0.13)',
    color: '#99F6E4',
    fontSize: 8,
    fontWeight: '700',
  },
  patientAge: { color: '#CBD5E1', fontSize: 9 },
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
    gap: 8,
    padding: 11,
    borderBottomWidth: 1,
    borderColor: '#E2E8F0',
    backgroundColor: '#FFFFFF',
  },
  searchBox: {
    minHeight: 37,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 10,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 11,
    backgroundColor: '#F8FAFC',
  },
  searchInput: { flex: 1, paddingVertical: 5, color: '#334155', fontSize: 11 },
  filterRow: { flexDirection: 'row', gap: 8 },
  filterCell: { zIndex: 10, flex: 1 },
  filterButton: {
    minHeight: 37,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 5,
    paddingHorizontal: 10,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 11,
    backgroundColor: '#F8FAFC',
  },
  filterText: { flex: 1, color: '#334155', fontSize: 10 },
  dropdown: {
    position: 'absolute',
    top: 40,
    left: 0,
    right: 0,
    zIndex: 20,
    padding: 4,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 11,
    backgroundColor: '#FFFFFF',
    elevation: 10,
  },
  dropdownRight: { right: 0 },
  dropdownOption: {
    minHeight: 34,
    justifyContent: 'center',
    paddingHorizontal: 8,
  },
  filterSummary: {
    minHeight: 19,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 5,
  },
  filterNote: { color: '#64748B', fontSize: 9 },
  reset: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  resetText: { color: '#0D9488', fontSize: 9, fontWeight: '700' },
  content: { flex: 1 },
  contentInner: { gap: 10, padding: 12, paddingBottom: 20 },
  loading: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 8 },
  empty: {
    minHeight: 260,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    padding: 25,
  },
  emptyTitle: {
    color: '#334155',
    fontSize: 13,
    fontWeight: '800',
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
    borderColor: '#CCFBF1',
    backgroundColor: '#F0FDFA',
  },
  sectionCopy: { flex: 1, minWidth: 0 },
  sectionTitle: { color: '#0F172A', fontSize: 12, fontWeight: '800' },
  sectionSubtitle: { marginTop: 2, color: '#64748B', fontSize: 9 },
  countBadge: {
    minWidth: 22,
    height: 22,
    overflow: 'hidden',
    paddingHorizontal: 6,
    paddingTop: 5,
    borderRadius: 12,
    backgroundColor: '#F1F5F9',
    color: '#64748B',
    fontSize: 9,
    fontWeight: '700',
    textAlign: 'center',
  },
  summaryRow: {
    minHeight: 64,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    padding: 11,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 15,
    backgroundColor: '#FFFFFF',
    elevation: 1,
  },
  summaryIcon: {
    width: 34,
    height: 34,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 11,
    backgroundColor: '#F1F5F9',
  },
  summaryCopy: { flex: 1, minWidth: 0 },
  eyebrow: {
    color: '#94A3B8',
    fontSize: 8,
    fontWeight: '800',
    letterSpacing: 0.7,
    textTransform: 'uppercase',
  },
  summaryValue: {
    marginTop: 3,
    color: '#1E293B',
    fontSize: 11,
    fontWeight: '600',
  },
  recordCard: {
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 16,
    backgroundColor: '#FFFFFF',
    elevation: 1,
  },
  expandedCard: { borderColor: '#2DD4BF' },
  recordHead: {
    gap: 6,
    padding: 12,
    borderBottomWidth: 1,
    borderColor: '#F1F5F9',
    backgroundColor: '#FFFFFF',
  },
  recordTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 6,
  },
  recordTitle: { color: '#0F172A', fontSize: 11, fontWeight: '800' },
  statusBadge: {
    overflow: 'hidden',
    borderRadius: 9,
    paddingHorizontal: 7,
    paddingVertical: 4,
    backgroundColor: '#ECFDF5',
    color: '#059669',
    fontSize: 8,
    fontWeight: '800',
    textTransform: 'uppercase',
  },
  recordMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 5,
  },
  recordMetaText: { color: '#64748B', fontSize: 8 },
  prescriptionBadge: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 2,
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#99F6E4',
    color: '#0F766E',
    fontSize: 8,
  },
  recordBody: { gap: 9, padding: 12 },
  notes: {
    minHeight: 40,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: '#FEF3C7',
    borderRadius: 12,
    backgroundColor: '#FFFBEB',
  },
  notesText: { flex: 1, color: '#78350F', fontSize: 10 },
  detailBlock: {
    minHeight: 55,
    justifyContent: 'center',
    gap: 4,
    padding: 10,
    borderRadius: 12,
    backgroundColor: '#F8FAFC',
  },
  detailValue: { color: '#1E293B', fontSize: 10, lineHeight: 15 },
  subSection: {
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 12,
  },
  subHeader: {
    minHeight: 40,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    paddingHorizontal: 10,
    borderBottomWidth: 1,
    borderColor: '#F1F5F9',
  },
  subTitle: { color: '#1E293B', fontSize: 10, fontWeight: '800' },
  medicine: {
    gap: 3,
    padding: 10,
    borderBottomWidth: 1,
    borderColor: '#F1F5F9',
  },
  medicineName: { color: '#0F172A', fontSize: 10, fontWeight: '800' },
  medicineInfo: { color: '#64748B', fontSize: 8 },
  emptyInline: { padding: 13, color: '#64748B', fontSize: 9 },
  reportHead: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    padding: 12,
  },
  reportIcon: {
    width: 37,
    height: 37,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 12,
    backgroundColor: '#F5F3FF',
  },
  reportCopy: { flex: 1, minWidth: 0, gap: 4 },
  reportType: { color: '#64748B', fontSize: 9 },
  expandButton: {
    minHeight: 36,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    marginHorizontal: 11,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 11,
    backgroundColor: '#F8FAFC',
  },
  expandText: { color: '#475569', fontSize: 10, fontWeight: '700' },
  expandTextActive: { color: '#0D9488' },
  reportDetails: {
    gap: 8,
    padding: 10,
    borderTopWidth: 1,
    borderColor: '#F1F5F9',
    backgroundColor: '#F8FAFC',
  },
  reportActions: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
    gap: 6,
  },
  downloadSmall: {
    minHeight: 32,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 9,
    borderWidth: 1,
    borderColor: '#CCFBF1',
    borderRadius: 10,
    backgroundColor: '#FFFFFF',
  },
  downloadSmallText: { color: '#0D9488', fontSize: 9, fontWeight: '700' },
  resultSection: {
    gap: 7,
    padding: 10,
    borderRadius: 12,
    backgroundColor: '#FFFFFF',
  },
  resultRow: {
    gap: 5,
    padding: 9,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 11,
    backgroundColor: '#F8FAFC',
  },
  resultTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 7,
  },
  resultValue: { color: '#0F766E', fontSize: 11, fontWeight: '800' },
  footer: {
    minHeight: 51,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderTopWidth: 1,
    borderColor: '#E2E8F0',
    backgroundColor: '#FFFFFF',
  },
  downloadButton: {
    minHeight: 36,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
    paddingHorizontal: 10,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 11,
    backgroundColor: '#F8FAFC',
  },
  downloadButtonText: { color: '#475569', fontSize: 9, fontWeight: '700' },
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
  closeText: { color: '#FFFFFF', fontSize: 10, fontWeight: '800' },
});

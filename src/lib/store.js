import fs from 'node:fs';
import * as XLSX from 'xlsx';
import { PATHS, ensureDataDir } from './paths.js';
import { getSettings } from './settings.js';

// SheetJS ESM build has no bundled filesystem access — bind Node's fs so
// XLSX.readFile / writeFile work.
XLSX.set_fs(fs);

const SHEET_NAME = 'Donations';

// Column order used in the .xlsx file (headers are Marathi-friendly labels).
const COLUMNS = [
  ['receiptNo', 'पावती क्र. (Receipt No)'],
  ['date', 'दिनांक (Date)'],
  ['name', 'देणगीदाराचे नाव (Name)'],
  ['mobile', 'मोबाईल (Mobile)'],
  ['whatsapp', 'व्हॉट्सअ‍ॅप (WhatsApp)'],
  ['totalAmount', 'एकूण रक्कम (Total)'],
  ['paidAmount', 'भरलेली रक्कम (Paid)'],
  ['balance', 'बाकी रक्कम (Balance)'],
  ['status', 'स्थिती (Status)'],
  ['paymentMethod', 'पेमेंट पद्धत (Payment Method)'],
  ['transactionId', 'व्यवहार क्र. (Transaction ID)'],
  ['notes', 'टीप (Notes)'],
  ['createdAt', 'नोंद वेळ (Created At)'],
];

const HEADER_TO_KEY = Object.fromEntries(COLUMNS.map(([k, h]) => [h, k]));
// Legacy header (single "amount" field) → mapped so old files keep their value.
HEADER_TO_KEY['रक्कम (Amount)'] = 'amount';

// Fills Total/Paid/Balance/Status for rows saved under the old single-amount schema.
function migrateLegacy(rec) {
  const hasNew = rec.totalAmount !== '' && rec.totalAmount != null;
  const legacy = Number(rec.amount);
  if (!hasNew && rec.amount != null && rec.amount !== '' && !Number.isNaN(legacy)) {
    rec.totalAmount = legacy;
    rec.paidAmount = legacy; // legacy receipts recorded fully-paid amounts
    rec.balance = 0;
    rec.status = 'Paid';
  }
  delete rec.amount;
  return rec;
}

function readWorkbook() {
  ensureDataDir();
  if (!fs.existsSync(PATHS.donations)) {
    return [];
  }
  const wb = XLSX.readFile(PATHS.donations);
  const ws = wb.Sheets[SHEET_NAME] || wb.Sheets[wb.SheetNames[0]];
  if (!ws) return [];
  const rows = XLSX.utils.sheet_to_json(ws, { defval: '' });
  return rows.map((row) => {
    const rec = {};
    for (const [header, value] of Object.entries(row)) {
      const key = HEADER_TO_KEY[header] || header;
      rec[key] = value;
    }
    return migrateLegacy(rec);
  });
}

function writeWorkbook(records) {
  ensureDataDir();
  const aoa = [COLUMNS.map(([, h]) => h)];
  for (const r of records) {
    aoa.push(COLUMNS.map(([k]) => (r[k] ?? '')));
  }
  const ws = XLSX.utils.aoa_to_sheet(aoa);
  // Reasonable column widths for readability.
  ws['!cols'] = [
    { wch: 18 }, { wch: 12 }, { wch: 24 }, { wch: 14 }, { wch: 14 },
    { wch: 12 }, { wch: 12 }, { wch: 12 }, { wch: 12 }, { wch: 18 },
    { wch: 20 }, { wch: 30 }, { wch: 22 },
  ];
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, SHEET_NAME);
  XLSX.writeFile(wb, PATHS.donations);
}

// Payment status derived from total vs paid.
function computeStatus(total, paid) {
  if (paid <= 0) return 'Pending';
  if (paid >= total) return 'Paid';
  return 'Partial';
}

// Normalises total/paid inputs → { totalAmount, paidAmount, balance, status }.
function money(totalRaw, paidRaw, { paidDefaultsToTotal = true } = {}) {
  const total = Math.max(0, Number(totalRaw) || 0);
  let paid;
  if (paidRaw === undefined || paidRaw === null || paidRaw === '') {
    paid = paidDefaultsToTotal ? total : 0;
  } else {
    paid = Math.max(0, Number(paidRaw) || 0);
  }
  if (paid > total) paid = total; // can't pay more than the pledged total
  return {
    totalAmount: total,
    paidAmount: paid,
    balance: Math.max(0, total - paid),
    status: computeStatus(total, paid),
  };
}

export function getDonations() {
  const rows = readWorkbook();
  // Newest first for display.
  return rows.slice().reverse();
}

export function getAllDonationsRaw() {
  return readWorkbook();
}

export function getDonation(receiptNo) {
  return readWorkbook().find((r) => String(r.receiptNo) === String(receiptNo)) || null;
}

function nextReceiptNumber(existing) {
  const settings = getSettings();
  const prefix = settings.receiptPrefix || 'LBGUM';
  const year = new Date().getFullYear();
  const tag = `${prefix}-${year}-`;
  let max = 0;
  for (const r of existing) {
    const rn = String(r.receiptNo || '');
    if (rn.startsWith(tag)) {
      const n = parseInt(rn.slice(tag.length), 10);
      if (!Number.isNaN(n) && n > max) max = n;
    }
  }
  return `${tag}${String(max + 1).padStart(4, '0')}`;
}

export function addDonation(input) {
  const records = readWorkbook();
  const receiptNo = nextReceiptNumber(records);
  // Accept `totalAmount` (new) or `amount` (legacy) for the pledged total.
  const m = money(input.totalAmount ?? input.amount, input.paidAmount);
  const record = {
    receiptNo,
    date: input.date || new Date().toISOString().slice(0, 10),
    name: String(input.name || '').trim(),
    mobile: String(input.mobile || '').trim(),
    whatsapp: String(input.whatsapp || '').trim(),
    ...m,
    paymentMethod: input.paymentMethod || 'Cash',
    transactionId: String(input.transactionId || '').trim(),
    notes: String(input.notes || '').trim(),
    createdAt: new Date().toISOString(),
  };
  records.push(record);
  writeWorkbook(records);
  return record;
}

export function updateDonation(receiptNo, input) {
  const records = readWorkbook();
  const idx = records.findIndex((r) => String(r.receiptNo) === String(receiptNo));
  if (idx === -1) return null;
  const cur = records[idx];
  const m = money(
    input.totalAmount ?? cur.totalAmount,
    input.paidAmount ?? cur.paidAmount,
    { paidDefaultsToTotal: false }
  );
  const updated = {
    ...cur,
    date: input.date ?? cur.date,
    name: input.name != null ? String(input.name).trim() : cur.name,
    mobile: input.mobile != null ? String(input.mobile).trim() : cur.mobile,
    whatsapp: input.whatsapp != null ? String(input.whatsapp).trim() : cur.whatsapp,
    ...m,
    paymentMethod: input.paymentMethod ?? cur.paymentMethod,
    transactionId: input.transactionId != null ? String(input.transactionId).trim() : cur.transactionId,
    notes: input.notes != null ? String(input.notes).trim() : cur.notes,
    updatedAt: new Date().toISOString(),
  };
  records[idx] = updated;
  writeWorkbook(records);
  return updated;
}

export function deleteDonation(receiptNo) {
  const records = readWorkbook();
  const idx = records.findIndex((r) => String(r.receiptNo) === String(receiptNo));
  if (idx === -1) return false;
  records.splice(idx, 1);
  writeWorkbook(records);
  return true;
}

// --- Stats helpers -------------------------------------------------------

function isToday(dateStr) {
  const today = new Date().toISOString().slice(0, 10);
  return String(dateStr).slice(0, 10) === today;
}

function isThisMonth(dateStr) {
  const now = new Date();
  const ym = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  return String(dateStr).slice(0, 7) === ym;
}

export function getStats() {
  const rows = readWorkbook();
  let todayTotal = 0;
  let monthTotal = 0;
  let total = 0;
  let outstanding = 0;
  let todayCount = 0;
  const donors = new Set();
  for (const r of rows) {
    // Collection figures are based on money actually received (paid).
    const paid = Number(r.paidAmount) || 0;
    const bal = Number(r.balance) || 0;
    total += paid;
    outstanding += bal;
    if (isToday(r.date)) { todayTotal += paid; todayCount += 1; }
    if (isThisMonth(r.date)) monthTotal += paid;
    donors.add((String(r.mobile || '').trim() || String(r.name || '').trim()).toLowerCase());
  }
  donors.delete('');
  return {
    todayTotal,
    monthTotal,
    total,
    outstanding,
    todayCount,
    count: rows.length,
    donorCount: donors.size,
  };
}

export function getWorkbookBuffer() {
  ensureDataDir();
  const records = readWorkbook();
  if (records.length === 0) {
    // Return an empty-but-valid workbook with headers.
    const ws = XLSX.utils.aoa_to_sheet([COLUMNS.map(([, h]) => h)]);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, SHEET_NAME);
    return XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
  }
  const wb = XLSX.readFile(PATHS.donations);
  return XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
}

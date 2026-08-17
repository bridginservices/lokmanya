// Client-side Marathi PDF receipt generator.
// Renders an HTML receipt (browser shapes Devanagari correctly), captures it
// with html2canvas, and embeds the image into a jsPDF A5 page — then downloads.
import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';

// ---- Number → Marathi words (Indian numbering) ----
const ONES = ['', 'एक', 'दोन', 'तीन', 'चार', 'पाच', 'सहा', 'सात', 'आठ', 'नऊ', 'दहा',
  'अकरा', 'बारा', 'तेरा', 'चौदा', 'पंधरा', 'सोळा', 'सतरा', 'अठरा', 'एकोणीस',
  'वीस', 'एकवीस', 'बावीस', 'तेवीस', 'चोवीस', 'पंचवीस', 'सव्वीस', 'सत्तावीस', 'अठ्ठावीस', 'एकोणतीस',
  'तीस', 'एकतीस', 'बत्तीस', 'तेहतीस', 'चौतीस', 'पस्तीस', 'छत्तीस', 'सदतीस', 'अडतीस', 'एकोणचाळीस',
  'चाळीस', 'एक्केचाळीस', 'बेचाळीस', 'त्रेचाळीस', 'चव्वेचाळीस', 'पंचेचाळीस', 'सेहेचाळीस', 'सत्तेचाळीस', 'अठ्ठेचाळीस', 'एकोणपन्नास',
  'पन्नास', 'एक्कावन्न', 'बावन्न', 'त्रेपन्न', 'चोपन्न', 'पंचावन्न', 'छप्पन्न', 'सत्तावन्न', 'अठ्ठावन्न', 'एकोणसाठ',
  'साठ', 'एकसष्ट', 'बासष्ट', 'त्रेसष्ट', 'चौसष्ट', 'पासष्ट', 'सहासष्ट', 'सदुसष्ट', 'अडुसष्ट', 'एकोणसत्तर',
  'सत्तर', 'एक्काहत्तर', 'बाहत्तर', 'त्र्याहत्तर', 'चौर्‍याहत्तर', 'पंच्याहत्तर', 'शहात्तर', 'सत्याहत्तर', 'अठ्ठ्याहत्तर', 'एकोणऐंशी',
  'ऐंशी', 'एक्क्याऐंशी', 'ब्याऐंशी', 'त्र्याऐंशी', 'चौऱ्याऐंशी', 'पंच्याऐंशी', 'शहाऐंशी', 'सत्त्याऐंशी', 'अठ्ठ्याऐंशी', 'एकोणनव्वद',
  'नव्वद', 'एक्क्याण्णव', 'ब्याण्णव', 'त्र्याण्णव', 'चौऱ्याण्णव', 'पंच्याण्णव', 'शहाण्णव', 'सत्त्याण्णव', 'अठ्ठ्याण्णव', 'नव्व्याण्णव'];

function twoDigit(n) { return ONES[n] || ''; }

function threeDigit(n) {
  let out = '';
  const h = Math.floor(n / 100);
  const rest = n % 100;
  if (h) out += ONES[h] + 'शे';
  if (rest) out += (out ? ' ' : '') + twoDigit(rest);
  return out;
}

export function amountInMarathiWords(num) {
  num = Math.floor(Math.abs(Number(num) || 0));
  if (num === 0) return 'शून्य';
  const crore = Math.floor(num / 10000000); num %= 10000000;
  const lakh = Math.floor(num / 100000); num %= 100000;
  const thousand = Math.floor(num / 1000); num %= 1000;
  const hundred = num;
  const parts = [];
  if (crore) parts.push(threeDigit(crore) + ' कोटी');
  if (lakh) parts.push(twoDigit(lakh) + ' लाख');
  if (thousand) parts.push(twoDigit(thousand) + ' हजार');
  if (hundred) parts.push(threeDigit(hundred));
  return parts.join(' ').trim();
}

const PAY_MR = { Cash: 'रोख', UPI: 'यूपीआय', 'Bank Transfer': 'बँक ट्रान्सफर' };

function fmtDate(d) {
  try {
    const dt = new Date(d);
    if (Number.isNaN(dt.getTime())) return d;
    return dt.toLocaleDateString('en-GB'); // dd/mm/yyyy
  } catch { return d; }
}

// Builds the receipt DOM node (off-screen).
function buildReceiptNode(donation, settings) {
  const el = document.createElement('div');
  el.style.cssText = 'position:fixed;left:-9999px;top:0;width:760px;background:#fff;';

  // Total / Paid / Balance / Status (fall back to legacy single-amount records).
  const total = Number(donation.totalAmount ?? donation.amount) || 0;
  const paid = Number(donation.paidAmount ?? total) || 0;
  const balance = Number(donation.balance ?? Math.max(0, total - paid)) || 0;
  const status = donation.status || (paid <= 0 ? 'Pending' : paid >= total ? 'Paid' : 'Partial');
  const statusMap = {
    Paid: { t: 'पूर्ण भरणा (Paid)', bg: '#e8f5e9', c: '#256d2a' },
    Partial: { t: 'अंशतः भरणा (Partial)', bg: '#fff3d6', c: '#a15c00' },
    Pending: { t: 'बाकी (Pending)', bg: '#fdecec', c: '#b3261e' },
  };
  const st = statusMap[status] || statusMap.Pending;
  const inr = (n) => '₹ ' + Number(n || 0).toLocaleString('en-IN');

  const logo = settings.logo
    ? `<img src="${settings.logo}" crossorigin="anonymous" style="width:70px;height:70px;border-radius:50%;object-fit:cover;border:3px solid #f4b400" />`
    : `<div style="width:70px;height:70px;border-radius:50%;background:radial-gradient(circle at 30% 25%,#f4b400,#ff7a00);display:flex;align-items:center;justify-content:center;font-size:38px">🕉️</div>`;

  el.innerHTML = `
    <div style="font-family:'Noto Sans Devanagari','Nirmala UI',sans-serif;color:#2b1a10;
                border:3px solid #c1121f;border-radius:16px;overflow:hidden;background:#fff">
      <div style="height:8px;background:linear-gradient(90deg,#ff7a00,#f4b400,#c1121f)"></div>
      <div style="padding:26px 34px 30px">
        <div style="display:flex;align-items:center;gap:18px;border-bottom:2px dashed #f0e2cf;padding-bottom:18px">
          ${logo}
          <div style="flex:1">
            <div style="font-size:25px;font-weight:800;color:#c1121f;line-height:1.2">${escapeHtml(settings.mandalName)}</div>
            <div style="font-size:13px;color:#7a6a5c;margin-top:2px">${escapeHtml(settings.mandalNameEn || '')}</div>
            <div style="font-size:12.5px;color:#7a6a5c;margin-top:4px">${escapeHtml(settings.address || '')}</div>
            <div style="font-size:12.5px;color:#7a6a5c">📞 ${escapeHtml(settings.contact || '')}</div>
          </div>
        </div>

        <div style="text-align:center;margin:16px 0 4px">
          <span style="display:inline-block;background:#ffe9b8;color:#6b4a00;font-weight:800;
                       padding:6px 24px;border-radius:999px;font-size:16px;letter-spacing:.5px">देणगी पावती</span>
        </div>

        <div style="display:flex;justify-content:space-between;font-size:14px;margin:14px 2px 4px">
          <div><b>पावती क्र.:</b> <span style="color:#c1121f;font-weight:700">${escapeHtml(donation.receiptNo)}</span></div>
          <div><b>दिनांक:</b> ${fmtDate(donation.date)}</div>
        </div>

        <table style="width:100%;border-collapse:collapse;font-size:14.5px;margin-top:10px">
          <tbody>
            ${row('देणगीदाराचे नाव', escapeHtml(donation.name))}
            ${donation.mobile ? row('मोबाईल', escapeHtml(donation.mobile)) : ''}
            ${row('पेमेंट पद्धत', PAY_MR[donation.paymentMethod] || escapeHtml(donation.paymentMethod))}
            ${donation.transactionId ? row('व्यवहार क्र.', escapeHtml(donation.transactionId)) : ''}
            ${donation.notes ? row('टीप', escapeHtml(donation.notes)) : ''}
          </tbody>
        </table>

        <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:10px;margin-top:16px">
          <div style="background:#fff8ee;border:1.5px solid #f0e2cf;border-radius:12px;padding:12px;text-align:center">
            <div style="font-size:12px;color:#7a6a5c;font-weight:600">एकूण रक्कम (Total)</div>
            <div style="font-weight:800;font-size:19px;color:#2b1a10;margin-top:3px">${inr(total)}</div>
          </div>
          <div style="background:linear-gradient(180deg,#fff8ee,#ffe9b8);border:1.5px solid #f4b400;border-radius:12px;padding:12px;text-align:center">
            <div style="font-size:12px;color:#6b4a00;font-weight:700">भरलेली रक्कम (Paid)</div>
            <div style="font-weight:800;font-size:22px;color:#c1121f;margin-top:3px">${inr(paid)}</div>
          </div>
          <div style="background:#fff8ee;border:1.5px solid #f0e2cf;border-radius:12px;padding:12px;text-align:center">
            <div style="font-size:12px;color:#7a6a5c;font-weight:600">बाकी रक्कम (Balance)</div>
            <div style="font-weight:800;font-size:19px;color:${balance > 0 ? '#c1121f' : '#256d2a'};margin-top:3px">${inr(balance)}</div>
          </div>
        </div>
        <div style="display:flex;align-items:center;justify-content:space-between;margin-top:10px;font-size:13px">
          <div style="color:#5a4a3c"><b>अक्षरी (भरलेली):</b> ${amountInMarathiWords(paid)} रुपये फक्त /-</div>
          <div><b>स्थिती:</b> <span style="background:${st.bg};color:${st.c};font-weight:700;padding:3px 12px;border-radius:999px">${st.t}</span></div>
        </div>

        <div style="background:#fff8ee;border-left:4px solid #ff7a00;border-radius:8px;
                    padding:12px 16px;margin-top:18px;font-size:13.5px;color:#4a3a2c;line-height:1.6">
          ${escapeHtml(settings.thankYou || '')}
        </div>

        <div style="display:flex;justify-content:space-between;align-items:flex-end;margin-top:34px">
          <div style="font-size:11.5px;color:#9a8a7c">ही संगणकीय पावती आहे.<br/>Computer-generated receipt.</div>
          <div style="text-align:center">
            <div style="border-top:1.5px solid #2b1a10;padding-top:6px;min-width:170px;font-weight:700;font-size:13.5px">
              ${escapeHtml(settings.signatory || '')}
            </div>
            <div style="font-size:11.5px;color:#7a6a5c">अधिकृत स्वाक्षरी</div>
          </div>
        </div>
      </div>
      <div style="height:8px;background:linear-gradient(90deg,#c1121f,#f4b400,#ff7a00)"></div>
    </div>`;
  return el;
}

function row(k, v) {
  return `<tr>
    <td style="padding:7px 0;color:#7a6a5c;width:38%;vertical-align:top">${k}</td>
    <td style="padding:7px 0;font-weight:600">: ${v}</td>
  </tr>`;
}

function escapeHtml(s) {
  return String(s == null ? '' : s)
    .replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;');
}

// Renders one receipt to a canvas (browser shapes Devanagari correctly).
async function renderReceiptCanvas(donation, settings) {
  const node = buildReceiptNode(donation, settings);
  document.body.appendChild(node);
  try {
    // Wait for the logo image (if any) to load before capture.
    await Promise.all(
      Array.from(node.querySelectorAll('img')).map(
        (img) => img.complete ? Promise.resolve() : new Promise((r) => { img.onload = img.onerror = r; })
      )
    );
    return await html2canvas(node.firstElementChild, {
      scale: 2, backgroundColor: '#ffffff', useCORS: true, logging: false,
    });
  } finally {
    node.remove();
  }
}

// Places a receipt canvas onto the current A5 PDF page (centered).
function placeCanvas(pdf, canvas) {
  const img = canvas.toDataURL('image/jpeg', 0.95);
  const pw = pdf.internal.pageSize.getWidth();
  const ph = pdf.internal.pageSize.getHeight();
  const margin = 8;
  const w = pw - margin * 2;
  const h = (canvas.height / canvas.width) * w;
  const y = h < ph - margin * 2 ? (ph - h) / 2 : margin;
  pdf.addImage(img, 'JPEG', margin, y, w, h);
}

// Generates + auto-downloads a single receipt as a JPG image. Returns the filename.
export async function generateReceiptImage(donation, settings) {
  const canvas = await renderReceiptCanvas(donation, settings);
  const dataUrl = canvas.toDataURL('image/jpeg', 0.95);
  const filename = `Pavti-${donation.receiptNo}.jpg`;
  const a = document.createElement('a');
  a.href = dataUrl;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  return filename;
}

// Generates + auto-downloads ONE PDF containing every receipt (a page each).
export async function generateAllReceiptsPDF(donations, settings) {
  if (!donations || donations.length === 0) return null;
  const pdf = new jsPDF({ unit: 'mm', format: 'a5', orientation: 'portrait' });
  for (let i = 0; i < donations.length; i++) {
    if (i > 0) pdf.addPage('a5', 'portrait');
    const canvas = await renderReceiptCanvas(donations[i], settings);
    placeCanvas(pdf, canvas);
  }
  const stamp = new Date().toISOString().slice(0, 10);
  const filename = `All-Receipts-${stamp}.pdf`;
  pdf.save(filename);
  return filename;
}

// Builds a WhatsApp share URL with a Marathi message.
export function whatsappShareURL(donation, settings) {
  const num = String(donation.whatsapp || donation.mobile || '').replace(/\D/g, '');
  const phone = num ? (num.length === 10 ? '91' + num : num) : '';
  const total = Number(donation.totalAmount ?? donation.amount) || 0;
  const paid = Number(donation.paidAmount ?? total) || 0;
  const balance = Number(donation.balance ?? Math.max(0, total - paid)) || 0;
  const inr = (n) => '₹' + Number(n || 0).toLocaleString('en-IN');
  const balanceLine = balance > 0
    ? `एकूण: ${inr(total)}\nभरलेली: ${inr(paid)}\nबाकी: *${inr(balance)}*\n`
    : `भरलेली रक्कम: ${inr(paid)}\n`;
  const msg =
    `🙏 *${settings.mandalName}* 🙏\n\n` +
    `प्रिय ${donation.name},\n` +
    `आपल्या देणगीबद्दल मनःपूर्वक आभार! 🌺\n\n` +
    `पावती क्र.: *${donation.receiptNo}*\n` +
    `दिनांक: ${fmtDate(donation.date)}\n` +
    balanceLine +
    `\n${settings.thankYou || ''}\n\n` +
    `गणपती बाप्पा मोरया! 🎊`;
  const base = phone ? `https://wa.me/${phone}` : `https://wa.me/`;
  return `${base}?text=${encodeURIComponent(msg)}`;
}

import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';
import fontkit from '@pdf-lib/fontkit';
import fs from 'fs';
import * as XLSX from 'xlsx';
import { Document, Packer, Paragraph, HeadingLevel } from 'docx';
import { chromium } from 'playwright';

export const runtime = 'nodejs';

type ExportFormat = 'csv' | 'json' | 'pdf' | 'xlsx' | 'docx';
type ExportType = 'actions' | 'summary' | 'profile';

function toCsv(rows: Record<string, unknown>[]): string {
  if (rows.length === 0) return '';
  const headers = Object.keys(rows[0]);
  const escape = (value: unknown) => {
    const str = String(value ?? '');
    if (str.includes('"') || str.includes(',') || str.includes('\n')) {
      return `"${str.replace(/"/g, '""')}"`;
    }
    return str;
  };
  const lines = [
    headers.join(','),
    ...rows.map((row) => headers.map((h) => escape(row[h])).join(',')),
  ];
  return lines.join('\n');
}

type ProfileSnapshot = {
  telegram_id: number | null;
  tg_username: string | null;
  tg_first_name: string | null;
  tg_last_name: string | null;
  phone_number: string | null;
  tg_language_code: string | null;
  tg_is_premium: boolean | null;
  tg_is_bot: boolean | null;
  tg_is_fake: boolean | null;
  tg_is_scam: boolean | null;
  tg_photo_id: string | null;
  first_action_time: string | null;
  last_action_time: string | null;
  total_actions: number | null;
  unique_sessions: number | null;
  avg_response_time_ms: number | null;
  error_count: number | null;
};

type ProfileCharts = {
  daily: Array<{ activity_date: string; actions_count: number }>;
  hourly: Array<{ activity_hour: number; actions_count: number }>;
};

const formatTimestamp = (value: unknown) => {
  if (!value) return '';
  const date = new Date(String(value));
  if (Number.isNaN(date.getTime())) return String(value);
  return `${date.toISOString().slice(0, 10)} ${date.toISOString().slice(11, 19)}`;
};

const truncate = (value: string, max: number) => (
  value.length > max ? `${value.slice(0, max - 3)}...` : value
);

async function renderProfileScreenshot(profile: ProfileSnapshot): Promise<Uint8Array | null> {
  const username = profile.tg_username ? `@${profile.tg_username}` : '—';
  const fullName =
    profile.tg_first_name || profile.tg_last_name
      ? `${profile.tg_first_name || ''} ${profile.tg_last_name || ''}`.trim()
      : '—';

  const html = `
  <html>
    <head>
      <meta charset="utf-8" />
      <style>
        * { box-sizing: border-box; font-family: Arial, Helvetica, sans-serif; }
        body { margin: 0; padding: 24px; background: #f8fafc; }
        .card { background: #ffffff; border: 1px solid #e2e8f0; border-radius: 12px; padding: 16px; }
        .title { font-size: 18px; font-weight: 600; margin-bottom: 8px; color: #0f172a; }
        .subtitle { font-size: 12px; color: #475569; margin-bottom: 16px; }
        .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
        .label { font-size: 11px; color: #64748b; margin-bottom: 4px; }
        .value { font-size: 13px; color: #0f172a; }
      </style>
    </head>
    <body>
      <div class="card" style="max-width: 900px;">
        <div class="title">Профиль пользователя: ${profile.telegram_id ?? '—'}</div>
        <div class="subtitle">Официальная сводка (формируется на уровне БД)</div>
        <div class="grid">
          <div><div class="label">Telegram ID</div><div class="value">${profile.telegram_id ?? '—'}</div></div>
          <div><div class="label">Username</div><div class="value">${username}</div></div>
          <div><div class="label">Имя / Фамилия</div><div class="value">${fullName}</div></div>
          <div><div class="label">Телефон</div><div class="value">${profile.phone_number ?? '—'}</div></div>
          <div><div class="label">Язык</div><div class="value">${profile.tg_language_code ?? '—'}</div></div>
          <div><div class="label">Premium</div><div class="value">${profile.tg_is_premium ? 'Да' : 'Нет'}</div></div>
          <div><div class="label">Флаги</div><div class="value">${profile.tg_is_bot ? 'bot ' : ''}${profile.tg_is_fake ? 'fake ' : ''}${profile.tg_is_scam ? 'scam ' : ''}${!profile.tg_is_bot && !profile.tg_is_fake && !profile.tg_is_scam ? '—' : ''}</div></div>
          <div><div class="label">Photo ID</div><div class="value">${profile.tg_photo_id ?? '—'}</div></div>
          <div><div class="label">Первое взаимодействие</div><div class="value">${formatTimestamp(profile.first_action_time)}</div></div>
          <div><div class="label">Последняя активность</div><div class="value">${formatTimestamp(profile.last_action_time)}</div></div>
          <div><div class="label">Всего действий</div><div class="value">${profile.total_actions ?? 0}</div></div>
          <div><div class="label">Уникальных сессий</div><div class="value">${profile.unique_sessions ?? 0}</div></div>
          <div><div class="label">Среднее время ответа</div><div class="value">${profile.avg_response_time_ms ? Math.round(profile.avg_response_time_ms) + ' ms' : '—'}</div></div>
          <div><div class="label">Ошибки</div><div class="value">${profile.error_count ?? 0}</div></div>
        </div>
      </div>
    </body>
  </html>`;

  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 980, height: 720 } });
  await page.setContent(html, { waitUntil: 'networkidle' });
  const screenshot = await page.screenshot({ fullPage: false, type: 'png' });
  await browser.close();
  return new Uint8Array(screenshot);
}

async function buildPdf(
  title: string,
  rows: Record<string, unknown>[],
  exportType: ExportType,
  profileSnapshot?: ProfileSnapshot | null,
  profileCharts?: ProfileCharts | null,
  profileActions?: Record<string, unknown>[]
): Promise<Uint8Array> {
  const pdfDoc = await PDFDocument.create();
  pdfDoc.registerFontkit(fontkit);
  let font = await pdfDoc.embedFont(StandardFonts.Helvetica);
  let fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
  let fontSupportsCyrillic = false;

  const tryFontPaths = [
    'C:\\\\Windows\\\\Fonts\\\\arial.ttf',
    'C:\\\\Windows\\\\Fonts\\\\arialbd.ttf',
  ];

  for (const fontPath of tryFontPaths) {
    try {
      if (fs.existsSync(fontPath)) {
        const fontBytes = fs.readFileSync(fontPath);
        font = await pdfDoc.embedFont(fontBytes);
        fontBold = await pdfDoc.embedFont(fontBytes);
        fontSupportsCyrillic = true;
        // #region agent log
        fetch('http://127.0.0.1:7242/ingest/05fe9474-0182-4692-bb90-1ccad795b5bc',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'admin-panel/src/app/api/analytics/export/route.ts:buildPdf',message:'loaded system font',data:{fontPath},timestamp:Date.now(),sessionId:'debug-session',runId:'pre-fix',hypothesisId:'H4'})}).catch(()=>{});
        // #endregion agent log
        break;
      }
    } catch (error) {
      // #region agent log
      fetch('http://127.0.0.1:7242/ingest/05fe9474-0182-4692-bb90-1ccad795b5bc',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'admin-panel/src/app/api/analytics/export/route.ts:buildPdf',message:'font load failed',data:{fontPath,error:String(error)},timestamp:Date.now(),sessionId:'debug-session',runId:'pre-fix',hypothesisId:'H4'})}).catch(()=>{});
      // #endregion agent log
    }
  }

  if (!fontSupportsCyrillic) {
    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/05fe9474-0182-4692-bb90-1ccad795b5bc',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'admin-panel/src/app/api/analytics/export/route.ts:buildPdf',message:'using standard fonts (no cyrillic support)',data:{},timestamp:Date.now(),sessionId:'debug-session',runId:'pre-fix',hypothesisId:'H4'})}).catch(()=>{});
    // #endregion agent log
  }

  const pageMargin = 40;
  const fontSizeTitle = 16;
  const fontSizeBody = 9;
  const lineHeight = 14;
  const headerHeight = 18;

  let page = pdfDoc.addPage();
  let { width, height } = page.getSize();
  let cursorY = height - pageMargin;

  const sanitizeText = (text: string) => {
    if (fontSupportsCyrillic) return text;
    return text.replace(/[^\x00-\x7F]/g, '?');
  };

  const drawLine = (text: string, size: number = fontSizeBody) => {
    if (cursorY < pageMargin + lineHeight) {
      page = pdfDoc.addPage();
      ({ width, height } = page.getSize());
      cursorY = height - pageMargin;
    }
    page.drawText(text, {
      x: pageMargin,
      y: cursorY,
      size,
      font,
      color: rgb(0.1, 0.1, 0.1),
    });
    cursorY -= lineHeight;
  };

  const drawRow = (columns: Array<{ text: string; width: number }>, y: number, isHeader = false) => {
    let x = pageMargin;
    columns.forEach((col) => {
      const raw = col.text.length > 60 ? `${col.text.slice(0, 57)}...` : col.text;
      const text = sanitizeText(raw);
      page.drawText(text, {
        x: x + 4,
        y: y + 4,
        size: fontSizeBody,
        font: isHeader ? fontBold : font,
        color: rgb(0.1, 0.1, 0.1),
      });
      x += col.width;
    });
    page.drawRectangle({
      x: pageMargin,
      y,
      width: width - pageMargin * 2,
      height: isHeader ? headerHeight : lineHeight + 4,
      borderColor: rgb(0.8, 0.8, 0.8),
      borderWidth: 1,
      color: isHeader ? rgb(0.95, 0.95, 0.95) : undefined,
    });
  };

  drawLine(title, fontSizeTitle);
  cursorY -= 6;

  if (exportType === 'profile' && profileSnapshot) {
    try {
      const screenshot = await renderProfileScreenshot(profileSnapshot);
      if (screenshot) {
        const image = await pdfDoc.embedPng(screenshot);
        const imageWidth = width - pageMargin * 2;
        const ratio = imageWidth / image.width;
        const imageHeight = image.height * ratio;

        if (cursorY - imageHeight < pageMargin) {
          page = pdfDoc.addPage();
          ({ width, height } = page.getSize());
          cursorY = height - pageMargin;
        }

        page.drawImage(image, {
          x: pageMargin,
          y: cursorY - imageHeight,
          width: imageWidth,
          height: imageHeight,
        });
        cursorY -= imageHeight + 12;
      }
    } catch (error) {
      // #region agent log
      fetch('http://127.0.0.1:7242/ingest/05fe9474-0182-4692-bb90-1ccad795b5bc',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'admin-panel/src/app/api/analytics/export/route.ts:buildPdf',message:'profile screenshot failed',data:{error:String(error)},timestamp:Date.now(),sessionId:'debug-session',runId:'pre-fix',hypothesisId:'H4'})}).catch(()=>{});
      // #endregion agent log
    }
  }

  if (rows.length === 0 && (!profileActions || profileActions.length === 0)) {
    drawLine('Нет данных');
    return await pdfDoc.save();
  }

  if (exportType === 'profile') {
    const actions = profileActions || [];
    if (profileCharts) {
      const drawChart = (label: string, values: Array<{ x: string; y: number }>) => {
        const chartWidth = width - pageMargin * 2;
        const chartHeight = 110;
        const labelHeight = 18;
        const axisHeight = 18;
        const gapAfter = 24;
        const needed = labelHeight + chartHeight + gapAfter;

        if (cursorY < pageMargin + needed) {
          page = pdfDoc.addPage();
          ({ width, height } = page.getSize());
          cursorY = height - pageMargin;
        }

        // Title
        page.drawText(label, {
          x: pageMargin,
          y: cursorY,
          size: fontSizeBody,
          font: fontBold,
          color: rgb(0.1, 0.1, 0.1),
        });

        const chartTop = cursorY - labelHeight;
        const chartBottom = chartTop - chartHeight;
        const maxValue = Math.max(1, ...values.map((v) => v.y));
        const barWidth = chartWidth / Math.max(1, values.length);

        // Axis line
        page.drawLine({
          start: { x: pageMargin, y: chartBottom },
          end: { x: pageMargin + chartWidth, y: chartBottom },
          color: rgb(0.85, 0.85, 0.85),
          thickness: 1,
        });

        // Y axis label (max)
        page.drawText(String(maxValue), {
          x: pageMargin + chartWidth - 24,
          y: chartTop - 6,
          size: 7,
          font,
          color: rgb(0.35, 0.35, 0.35),
        });

        values.forEach((v, idx) => {
          const barHeight = (v.y / maxValue) * chartHeight;
          page.drawRectangle({
            x: pageMargin + idx * barWidth + 1,
            y: chartBottom,
            width: Math.max(1, barWidth - 2),
            height: barHeight,
            color: rgb(0.2, 0.2, 0.2),
          });
        });

        page.drawRectangle({
          x: pageMargin,
          y: chartBottom,
          width: chartWidth,
          height: chartHeight,
          borderColor: rgb(0.8, 0.8, 0.8),
          borderWidth: 1,
        });

        // #region agent log
        fetch('http://127.0.0.1:7242/ingest/05fe9474-0182-4692-bb90-1ccad795b5bc',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'admin-panel/src/app/api/analytics/export/route.ts:buildPdf',message:'chart rendered',data:{label,points:values.length,maxValue,barWidth,chartBottom,chartTop},timestamp:Date.now(),sessionId:'debug-session',runId:'pre-fix',hypothesisId:'H5'})}).catch(()=>{});
        // #endregion agent log

        // X axis labels (show every N)
        const tickEvery = values.length > 20 ? Math.ceil(values.length / 10) : 1;
        values.forEach((v, idx) => {
          if (idx % tickEvery !== 0) return;
          const labelText = v.x.length > 8 ? v.x.slice(5, 10) : v.x;
          page.drawText(labelText, {
            x: pageMargin + idx * barWidth + 2,
            y: chartBottom - axisHeight + 4,
            size: 7,
            font,
            color: rgb(0.35, 0.35, 0.35),
          });
        });

        cursorY = chartBottom - axisHeight - gapAfter;
      };

      const daily = (profileCharts.daily || [])
        .slice(-30)
        .map((row) => ({ x: row.activity_date, y: row.actions_count }));
      drawChart('Активность по дням (последние 30)', daily);

      const hourly = (profileCharts.hourly || [])
        .sort((a, b) => a.activity_hour - b.activity_hour)
        .map((row) => ({ x: `${String(row.activity_hour).padStart(2, '0')}:00`, y: row.actions_count }));
      drawChart('Активность по часам', hourly);
    }

    if (actions.length > 0) {
      const columns = [
        { key: 'created_at', label: 'Дата/время', width: 120 },
        { key: 'telegram_id', label: 'Telegram ID', width: 85 },
        { key: 'action_type', label: 'Тип', width: 70 },
        { key: 'action_data', label: 'Данные', width: 120 },
        { key: 'menu_id', label: 'Menu ID', width: 90 },
        { key: 'session_id', label: 'Сессия', width: 120 },
        { key: 'error_occurred', label: 'Ошибка', width: 45 },
      ];

      const availableWidth = width - pageMargin * 2;
      const totalWidth = columns.reduce((sum, col) => sum + col.width, 0);
      if (totalWidth > availableWidth) {
        const scale = availableWidth / totalWidth;
        columns.forEach((col) => {
          col.width = Math.floor(col.width * scale);
        });
      }

      if (cursorY < pageMargin + headerHeight + lineHeight) {
        page = pdfDoc.addPage();
        ({ width, height } = page.getSize());
        cursorY = height - pageMargin;
      }

      drawLine('История действий');
      drawRow(columns.map((c) => ({ text: c.label, width: c.width })), cursorY - headerHeight, true);
      cursorY -= headerHeight + 6;

      actions.slice(0, 500).forEach((row) => {
        if (cursorY < pageMargin + lineHeight + 8) {
          page = pdfDoc.addPage();
          ({ width, height } = page.getSize());
          cursorY = height - pageMargin;
          drawRow(columns.map((c) => ({ text: c.label, width: c.width })), cursorY - headerHeight, true);
          cursorY -= headerHeight + 6;
        }

        const cells = columns.map((c) => {
          let value = (row as Record<string, unknown>)[c.key];
          if (c.key === 'created_at') {
            value = formatTimestamp(value);
          }
          if (c.key === 'error_occurred') {
            value = value ? 'да' : 'нет';
          }
          if (c.key === 'action_data') {
            value = truncate(String(value ?? ''), 32);
          }
          if (c.key === 'menu_id') {
            value = truncate(String(value ?? ''), 16);
          }
          if (c.key === 'session_id') {
            value = truncate(String(value ?? ''), 16);
          }
          return { text: String(value ?? ''), width: c.width };
        });
        drawRow(cells, cursorY - (lineHeight + 4), false);
        cursorY -= lineHeight + 6;
      });
    }

    return await pdfDoc.save();
  }

  if (exportType === 'actions') {
    const columns = [
      { key: 'created_at', label: 'Дата/время', width: 120 },
      { key: 'telegram_id', label: 'Telegram ID', width: 85 },
      { key: 'action_type', label: 'Тип', width: 70 },
      { key: 'action_data', label: 'Данные', width: 120 },
      { key: 'menu_id', label: 'Menu ID', width: 90 },
      { key: 'session_id', label: 'Сессия', width: 120 },
      { key: 'error_occurred', label: 'Ошибка', width: 45 },
    ];

    const availableWidth = width - pageMargin * 2;
    const totalWidth = columns.reduce((sum, col) => sum + col.width, 0);
    if (totalWidth > availableWidth) {
      const scale = availableWidth / totalWidth;
      columns.forEach((col) => {
        col.width = Math.floor(col.width * scale);
      });
    }

    if (cursorY < pageMargin + headerHeight + lineHeight) {
      page = pdfDoc.addPage();
      ({ width, height } = page.getSize());
      cursorY = height - pageMargin;
    }

    drawRow(
      columns.map((c) => ({ text: c.label, width: c.width })),
      cursorY - headerHeight,
      true
    );
    cursorY -= headerHeight + 6;

    rows.slice(0, 500).forEach((row) => {
      if (cursorY < pageMargin + lineHeight + 8) {
        page = pdfDoc.addPage();
        ({ width, height } = page.getSize());
        cursorY = height - pageMargin;
        drawRow(
          columns.map((c) => ({ text: c.label, width: c.width })),
          cursorY - headerHeight,
          true
        );
        cursorY -= headerHeight + 6;
      }

      const cells = columns.map((c) => {
        let value = (row as Record<string, unknown>)[c.key];
        if (c.key === 'created_at') {
          value = formatTimestamp(value);
        }
        if (c.key === 'error_occurred') {
          value = value ? 'да' : 'нет';
        }
        if (c.key === 'action_data') {
          value = truncate(String(value ?? ''), 32);
        }
        if (c.key === 'menu_id') {
          value = truncate(String(value ?? ''), 16);
        }
        if (c.key === 'session_id') {
          value = truncate(String(value ?? ''), 16);
        }
        return {
          text: String(value ?? ''),
          width: c.width,
        };
      });
      drawRow(cells, cursorY - (lineHeight + 4), false);
      cursorY -= lineHeight + 6;
    });
  } else {
    rows.slice(0, 500).forEach((row, idx) => {
      drawLine(`#${idx + 1}`);
      Object.entries(row).forEach(([key, value]) => {
        drawLine(`${key}: ${String(value ?? '')}`);
      });
      cursorY -= 4;
    });
  }

  if (rows.length > 500) {
    drawLine('Данные обрезаны до 500 строк для PDF.');
  }

  return await pdfDoc.save();
}

function buildXlsx(rows: Record<string, unknown>[]): Uint8Array {
  const flatRows = rows.map((row) => {
    if ('section' in row && 'data' in row) {
      return { section: row.section, data: JSON.stringify(row.data) };
    }
    return row;
  });
  const sheet = XLSX.utils.json_to_sheet(flatRows);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, sheet, 'export');
  const buffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' }) as Buffer;
  return new Uint8Array(buffer);
}

async function buildDocx(title: string, rows: Record<string, unknown>[]): Promise<Uint8Array> {
  const paragraphs: Paragraph[] = [
    new Paragraph({ text: title, heading: HeadingLevel.HEADING_1 }),
  ];

  if (rows.length === 0) {
    paragraphs.push(new Paragraph({ text: 'Нет данных' }));
  } else {
    rows.slice(0, 500).forEach((row, idx) => {
      paragraphs.push(new Paragraph({ text: `#${idx + 1}` }));
      Object.entries(row).forEach(([key, value]) => {
        paragraphs.push(new Paragraph({ text: `${key}: ${String(value ?? '')}` }));
      });
      paragraphs.push(new Paragraph({ text: '' }));
    });
    if (rows.length > 500) {
      paragraphs.push(new Paragraph({ text: 'Данные обрезаны до 500 строк для DOCX.' }));
    }
  }

  const doc = new Document({
    sections: [{ children: paragraphs }],
  });

  const buffer = await Packer.toBuffer(doc);
  return new Uint8Array(buffer);
}

export async function GET(req: Request) {
  // #region agent log
  fetch('http://127.0.0.1:7242/ingest/05fe9474-0182-4692-bb90-1ccad795b5bc',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'admin-panel/src/app/api/analytics/export/route.ts:GET',message:'export route entry',data:{url:req.url},timestamp:Date.now(),sessionId:'debug-session',runId:'pre-fix',hypothesisId:'H1'})}).catch(()=>{});
  // #endregion agent log
  const supabase = createRouteHandlerClient({ cookies });
  const { data: { session } } = await supabase.auth.getSession();

  if (!session?.user?.email) {
    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/05fe9474-0182-4692-bb90-1ccad795b5bc',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'admin-panel/src/app/api/analytics/export/route.ts:GET',message:'no session',data:{hasSession:false},timestamp:Date.now(),sessionId:'debug-session',runId:'pre-fix',hypothesisId:'H2'})}).catch(()=>{});
    // #endregion agent log
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { data: adminUser, error: adminError } = await supabase
    .from('users')
    .select('id, role')
    .eq('email', session.user.email)
    .single();

  if (adminError || !adminUser || adminUser.role !== 'admin') {
    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/05fe9474-0182-4692-bb90-1ccad795b5bc',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'admin-panel/src/app/api/analytics/export/route.ts:GET',message:'forbidden',data:{adminError:adminError?.message,role:adminUser?.role},timestamp:Date.now(),sessionId:'debug-session',runId:'pre-fix',hypothesisId:'H2'})}).catch(()=>{});
    // #endregion agent log
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const url = new URL(req.url);
  const format = (url.searchParams.get('format') || 'json') as ExportFormat;
  const exportType = (url.searchParams.get('type') || 'actions') as ExportType;
  const telegramId = url.searchParams.get('telegram_id');
  const dateFrom = url.searchParams.get('date_from');
  const dateTo = url.searchParams.get('date_to');
  const actionType = url.searchParams.get('action_type');
  const menuId = url.searchParams.get('menu_id');
  const limit = Number(url.searchParams.get('limit') || 1000);
  // #region agent log
  fetch('http://127.0.0.1:7242/ingest/05fe9474-0182-4692-bb90-1ccad795b5bc',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'admin-panel/src/app/api/analytics/export/route.ts:GET',message:'export params',data:{format,exportType,telegramId,dateFrom,dateTo,actionType,menuId,limit},timestamp:Date.now(),sessionId:'debug-session',runId:'pre-fix',hypothesisId:'H1'})}).catch(()=>{});
  // #endregion agent log

  let rows: Record<string, unknown>[] = [];
  let profileSnapshot: ProfileSnapshot | null = null;
  let profileCharts: ProfileCharts | null = null;
  let profileActions: Record<string, unknown>[] | null = null;

  if (exportType === 'summary') {
    const [metricsRes, totalsRes, retentionRes] = await Promise.all([
      supabase.from('analytics_metrics').select('date, dau, wau, mau').limit(30),
      supabase.from('analytics_totals').select('*').single(),
      supabase.from('retention_summary').select('day_number, retention_rate'),
    ]);

    rows = [
      { section: 'analytics_metrics', data: metricsRes.data || [] },
      { section: 'analytics_totals', data: totalsRes.data || {} },
      { section: 'retention_summary', data: retentionRes.data || [] },
    ];
    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/05fe9474-0182-4692-bb90-1ccad795b5bc',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'admin-panel/src/app/api/analytics/export/route.ts:GET',message:'summary rows ready',data:{rowsLength:rows.length},timestamp:Date.now(),sessionId:'debug-session',runId:'pre-fix',hypothesisId:'H1'})}).catch(()=>{});
    // #endregion agent log
  } else if (exportType === 'profile') {
    if (!telegramId) {
      return NextResponse.json({ error: 'telegram_id is required for profile export' }, { status: 400 });
    }

    const [profileRes, actionsRes, userRes, dailyRes, hourlyRes] = await Promise.all([
      supabase
        .from('user_profiles_summary')
        .select('*')
        .eq('telegram_id', Number(telegramId))
        .single(),
      supabase
        .from('user_actions')
        .select('created_at, action_type, action_data, session_id, menu_id')
        .eq('telegram_id', Number(telegramId))
        .order('created_at', { ascending: false })
        .limit(limit),
      supabase
        .from('users')
        .select('telegram_id, tg_username, tg_first_name, tg_last_name, phone_number, tg_language_code, tg_is_premium, tg_is_bot, tg_is_fake, tg_is_scam, tg_photo_id')
        .eq('telegram_id', Number(telegramId))
        .single(),
      supabase
        .from('user_activity_daily')
        .select('activity_date, actions_count')
        .eq('telegram_id', Number(telegramId))
        .order('activity_date', { ascending: true }),
      supabase
        .from('user_activity_hourly')
        .select('activity_hour, actions_count')
        .eq('telegram_id', Number(telegramId))
        .order('activity_hour', { ascending: true }),
    ]);

    rows = [
      { section: 'profile', data: profileRes.data || {} },
      { section: 'actions', data: actionsRes.data || [] },
    ];

    profileSnapshot = {
      telegram_id: Number(telegramId),
      tg_username: userRes.data?.tg_username || null,
      tg_first_name: userRes.data?.tg_first_name || null,
      tg_last_name: userRes.data?.tg_last_name || null,
      phone_number: userRes.data?.phone_number || null,
      tg_language_code: userRes.data?.tg_language_code || null,
      tg_is_premium: userRes.data?.tg_is_premium ?? null,
      tg_is_bot: userRes.data?.tg_is_bot ?? null,
      tg_is_fake: userRes.data?.tg_is_fake ?? null,
      tg_is_scam: userRes.data?.tg_is_scam ?? null,
      tg_photo_id: userRes.data?.tg_photo_id || null,
      first_action_time: profileRes.data?.first_action_time || null,
      last_action_time: profileRes.data?.last_action_time || null,
      total_actions: profileRes.data?.total_actions ?? null,
      unique_sessions: profileRes.data?.unique_sessions ?? null,
      avg_response_time_ms: profileRes.data?.avg_response_time_ms ?? null,
      error_count: profileRes.data?.error_count ?? null,
    };

    profileCharts = {
      daily: (dailyRes.data || []) as Array<{ activity_date: string; actions_count: number }>,
      hourly: (hourlyRes.data || []) as Array<{ activity_hour: number; actions_count: number }>,
    };

    profileActions = (actionsRes.data || []) as Record<string, unknown>[];
  } else {
    let query = supabase
      .from('user_actions')
      .select('created_at, telegram_id, action_type, action_data, menu_id, session_id, response_time_ms, error_occurred, metadata')
      .order('created_at', { ascending: false })
      .limit(limit);

    if (telegramId) {
      query = query.eq('telegram_id', Number(telegramId));
    }
    if (dateFrom) {
      query = query.gte('created_at', dateFrom);
    }
    if (dateTo) {
      query = query.lte('created_at', `${dateTo}T23:59:59`);
    }
    if (actionType) {
      query = query.eq('action_type', actionType);
    }
    if (menuId) {
      query = query.eq('menu_id', menuId);
    }

    const { data } = await query;
    rows = (data || []) as Record<string, unknown>[];
    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/05fe9474-0182-4692-bb90-1ccad795b5bc',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'admin-panel/src/app/api/analytics/export/route.ts:GET',message:'actions rows ready',data:{rowsLength:rows.length},timestamp:Date.now(),sessionId:'debug-session',runId:'pre-fix',hypothesisId:'H1'})}).catch(()=>{});
    // #endregion agent log
  }

  await supabase.rpc('log_admin_action', {
    p_admin_user_id: adminUser.id,
    p_action_type: 'export_data',
    p_entity_type: exportType,
    p_entity_id: telegramId ?? null,
    p_ip_address: (req.headers.get('x-forwarded-for') || '').split(',')[0] || null,
    p_user_agent: req.headers.get('user-agent'),
    p_request_path: url.pathname,
    p_request_params: Object.fromEntries(url.searchParams.entries()),
  });

  if (format === 'csv') {
    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/05fe9474-0182-4692-bb90-1ccad795b5bc',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'admin-panel/src/app/api/analytics/export/route.ts:GET',message:'csv export',data:{rowsLength:rows.length},timestamp:Date.now(),sessionId:'debug-session',runId:'pre-fix',hypothesisId:'H1'})}).catch(()=>{});
    // #endregion agent log
    const csv = toCsv(rows);
    return new NextResponse(csv, {
      status: 200,
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="analytics-${exportType}.csv"`,
      },
    });
  }

  if (format === 'pdf') {
    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/05fe9474-0182-4692-bb90-1ccad795b5bc',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'admin-panel/src/app/api/analytics/export/route.ts:GET',message:'pdf export',data:{rowsLength:rows.length},timestamp:Date.now(),sessionId:'debug-session',runId:'pre-fix',hypothesisId:'H3'})}).catch(()=>{});
    // #endregion agent log
    const body = await buildPdf(
      `Analytics Export (${exportType})`,
      rows,
      exportType,
      profileSnapshot,
      profileCharts,
      profileActions || undefined
    );
    return new NextResponse(Buffer.from(body), {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="analytics-${exportType}.pdf"`,
      },
    });
  }

  if (format === 'xlsx') {
    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/05fe9474-0182-4692-bb90-1ccad795b5bc',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'admin-panel/src/app/api/analytics/export/route.ts:GET',message:'xlsx export',data:{rowsLength:rows.length},timestamp:Date.now(),sessionId:'debug-session',runId:'pre-fix',hypothesisId:'H1'})}).catch(()=>{});
    // #endregion agent log
    const body = buildXlsx(rows);
    return new NextResponse(Buffer.from(body), {
      status: 200,
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename="analytics-${exportType}.xlsx"`,
      },
    });
  }

  if (format === 'docx') {
    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/05fe9474-0182-4692-bb90-1ccad795b5bc',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'admin-panel/src/app/api/analytics/export/route.ts:GET',message:'docx export',data:{rowsLength:rows.length},timestamp:Date.now(),sessionId:'debug-session',runId:'pre-fix',hypothesisId:'H1'})}).catch(()=>{});
    // #endregion agent log
    const body = await buildDocx(`Analytics Export (${exportType})`, rows);
    return new NextResponse(Buffer.from(body), {
      status: 200,
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'Content-Disposition': `attachment; filename="analytics-${exportType}.docx"`,
      },
    });
  }

  // #region agent log
  fetch('http://127.0.0.1:7242/ingest/05fe9474-0182-4692-bb90-1ccad795b5bc',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'admin-panel/src/app/api/analytics/export/route.ts:GET',message:'json export',data:{rowsLength:rows.length},timestamp:Date.now(),sessionId:'debug-session',runId:'pre-fix',hypothesisId:'H1'})}).catch(()=>{});
  // #endregion agent log
  return NextResponse.json(rows, {
    status: 200,
    headers: {
      'Content-Disposition': `attachment; filename="analytics-${exportType}.json"`,
    },
  });
}

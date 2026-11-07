// A minimal dependency-free .xlsx writer for design spreadsheets: inline strings, formulas with optional cached
// values, a few styles, column widths and a frozen header. Output is deterministic (fixed zip timestamps).
import { crc32, deflateRawSync } from 'node:zlib';

export const STYLE = { none: 0, header: 1, input: 2, title: 3, note: 4, num: 5, int: 6, inputNum: 7, bold: 8, pct: 9 };
export type Value = number | string | boolean;
export type Cell = { v?: Value; f?: string; s?: number } | Value | null | undefined;
export type Sheet = { name: string; rows: Cell[][]; widths?: number[]; freeze?: { row: number; col: number } };

export const colName = (c: number): string => {
  let n = c + 1,
    s = '';
  while (n > 0) {
    const r = (n - 1) % 26;
    s = String.fromCharCode(65 + r) + s;
    n = Math.floor((n - 1) / 26);
  }
  return s;
};
export const addr = (row: number, col: number) => `${colName(col)}${row + 1}`;
const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

function cellXml(ref: string, cell: Cell): string {
  if (cell === null || cell === undefined) return '';
  const c = typeof cell === 'object' ? cell : { v: cell };
  const s = c.s ? ` s="${c.s}"` : '';
  if (c.f !== undefined) {
    const f = `<f>${esc(c.f)}</f>`;
    if (c.v === undefined) return `<c r="${ref}"${s}>${f}</c>`;
    if (typeof c.v === 'number') return `<c r="${ref}"${s}>${f}<v>${c.v}</v></c>`;
    if (typeof c.v === 'boolean') return `<c r="${ref}"${s} t="b">${f}<v>${c.v ? 1 : 0}</v></c>`;
    return `<c r="${ref}"${s} t="str">${f}<v>${esc(c.v)}</v></c>`;
  }
  if (c.v === undefined || c.v === '') return c.s ? `<c r="${ref}"${s}/>` : '';
  if (typeof c.v === 'number') return `<c r="${ref}"${s}><v>${c.v}</v></c>`;
  if (typeof c.v === 'boolean') return `<c r="${ref}"${s} t="b"><v>${c.v ? 1 : 0}</v></c>`;
  return `<c r="${ref}"${s} t="inlineStr"><is><t xml:space="preserve">${esc(c.v)}</t></is></c>`;
}

function sheetXml(sheet: Sheet): string {
  const rows = sheet.rows
    .map((row, r) => {
      const cells = row.map((cell, c) => cellXml(addr(r, c), cell)).join('');
      return cells ? `<row r="${r + 1}">${cells}</row>` : '';
    })
    .join('');
  const cols = sheet.widths?.length
    ? `<cols>${sheet.widths.map((w, i) => `<col min="${i + 1}" max="${i + 1}" width="${w}" customWidth="1"/>`).join('')}</cols>`
    : '';
  const fz = sheet.freeze;
  const pane = fz
    ? `<pane${fz.col ? ` xSplit="${fz.col}"` : ''}${fz.row ? ` ySplit="${fz.row}"` : ''} topLeftCell="${addr(fz.row, fz.col)}" activePane="${fz.row && fz.col ? 'bottomRight' : fz.row ? 'bottomLeft' : 'topRight'}" state="frozen"/>`
    : '';
  return (
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>` +
    `<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">` +
    `<sheetViews><sheetView workbookViewId="0">${pane}</sheetView></sheetViews>` +
    `<sheetFormatPr defaultRowHeight="15"/>${cols}<sheetData>${rows}</sheetData></worksheet>`
  );
}

const STYLES =
  `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>` +
  `<styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">` +
  `<numFmts count="2"><numFmt numFmtId="164" formatCode="0.0"/><numFmt numFmtId="165" formatCode="0%"/></numFmts>` +
  `<fonts count="4"><font><sz val="11"/><name val="Calibri"/></font><font><b/><sz val="11"/><name val="Calibri"/></font>` +
  `<font><b/><sz val="14"/><name val="Calibri"/></font><font><i/><sz val="10"/><color rgb="FF666666"/><name val="Calibri"/></font></fonts>` +
  `<fills count="4"><fill><patternFill patternType="none"/></fill><fill><patternFill patternType="gray125"/></fill>` +
  `<fill><patternFill patternType="solid"><fgColor rgb="FFFFF2CC"/><bgColor indexed="64"/></patternFill></fill>` +
  `<fill><patternFill patternType="solid"><fgColor rgb="FFDDEBF7"/><bgColor indexed="64"/></patternFill></fill></fills>` +
  `<borders count="1"><border><left/><right/><top/><bottom/><diagonal/></border></borders>` +
  `<cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs>` +
  `<cellXfs count="10">` +
  `<xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/>` +
  `<xf numFmtId="0" fontId="1" fillId="3" borderId="0" xfId="0" applyFont="1" applyFill="1"><alignment wrapText="1" vertical="top"/></xf>` +
  `<xf numFmtId="0" fontId="0" fillId="2" borderId="0" xfId="0" applyFill="1"/>` +
  `<xf numFmtId="0" fontId="2" fillId="0" borderId="0" xfId="0" applyFont="1"/>` +
  `<xf numFmtId="0" fontId="3" fillId="0" borderId="0" xfId="0" applyFont="1"/>` +
  `<xf numFmtId="164" fontId="0" fillId="0" borderId="0" xfId="0" applyNumberFormat="1"/>` +
  `<xf numFmtId="1" fontId="0" fillId="0" borderId="0" xfId="0" applyNumberFormat="1"/>` +
  `<xf numFmtId="0" fontId="0" fillId="2" borderId="0" xfId="0" applyFill="1"/>` +
  `<xf numFmtId="164" fontId="1" fillId="0" borderId="0" xfId="0" applyFont="1" applyNumberFormat="1"/>` +
  `<xf numFmtId="165" fontId="0" fillId="0" borderId="0" xfId="0" applyNumberFormat="1"/>` +
  `</cellXfs><cellStyles count="1"><cellStyle name="Normal" xfId="0" builtinId="0"/></cellStyles></styleSheet>`;

function zip(files: { name: string; data: Buffer }[]): Buffer {
  const parts: Buffer[] = [];
  const central: Buffer[] = [];
  let offset = 0;
  const time = 0, // 00:00
    date = ((2026 - 1980) << 9) | (11 << 5) | 6; // 2026-11-06
  for (const file of files) {
    const name = Buffer.from(file.name, 'utf8');
    const body = deflateRawSync(file.data, { level: 9 });
    const crc = crc32(file.data) >>> 0;
    const local = Buffer.alloc(30);
    local.writeUInt32LE(0x04034b50, 0);
    local.writeUInt16LE(20, 4);
    local.writeUInt16LE(0x0800, 6);
    local.writeUInt16LE(8, 8);
    local.writeUInt16LE(time, 10);
    local.writeUInt16LE(date, 12);
    local.writeUInt32LE(crc, 14);
    local.writeUInt32LE(body.length, 18);
    local.writeUInt32LE(file.data.length, 22);
    local.writeUInt16LE(name.length, 26);
    local.writeUInt16LE(0, 28);
    parts.push(local, name, body);
    const dir = Buffer.alloc(46);
    dir.writeUInt32LE(0x02014b50, 0);
    dir.writeUInt16LE(20, 4);
    dir.writeUInt16LE(20, 6);
    dir.writeUInt16LE(0x0800, 8);
    dir.writeUInt16LE(8, 10);
    dir.writeUInt16LE(time, 12);
    dir.writeUInt16LE(date, 14);
    dir.writeUInt32LE(crc, 16);
    dir.writeUInt32LE(body.length, 20);
    dir.writeUInt32LE(file.data.length, 24);
    dir.writeUInt16LE(name.length, 28);
    dir.writeUInt32LE(offset, 42);
    central.push(dir, name);
    offset += 30 + name.length + body.length;
  }
  const dirBuf = Buffer.concat(central);
  const end = Buffer.alloc(22);
  end.writeUInt32LE(0x06054b50, 0);
  end.writeUInt16LE(files.length, 8);
  end.writeUInt16LE(files.length, 10);
  end.writeUInt32LE(dirBuf.length, 12);
  end.writeUInt32LE(offset, 16);
  return Buffer.concat([...parts, dirBuf, end]);
}

/** Excel recalculates every formula on open (fullCalcOnLoad); cached values let viewers that don't recalc still show them. */
export function workbook(sheets: Sheet[]): Buffer {
  const x = (s: string) => Buffer.from(s, 'utf8');
  const head = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>`;
  const files = [
    {
      name: '[Content_Types].xml',
      data: x(
        `${head}<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">` +
          `<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>` +
          `<Default Extension="xml" ContentType="application/xml"/>` +
          `<Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>` +
          `<Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/>` +
          sheets
            .map(
              (_, i) =>
                `<Override PartName="/xl/worksheets/sheet${i + 1}.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>`,
            )
            .join('') +
          `</Types>`,
      ),
    },
    {
      name: '_rels/.rels',
      data: x(
        `${head}<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">` +
          `<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/>` +
          `</Relationships>`,
      ),
    },
    {
      name: 'xl/workbook.xml',
      data: x(
        `${head}<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">` +
          `<sheets>${sheets.map((s, i) => `<sheet name="${esc(s.name)}" sheetId="${i + 1}" r:id="rId${i + 1}"/>`).join('')}</sheets>` +
          `<calcPr calcId="191029" fullCalcOnLoad="1"/></workbook>`,
      ),
    },
    {
      name: 'xl/_rels/workbook.xml.rels',
      data: x(
        `${head}<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">` +
          sheets
            .map(
              (_, i) =>
                `<Relationship Id="rId${i + 1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet${i + 1}.xml"/>`,
            )
            .join('') +
          `<Relationship Id="rId${sheets.length + 1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/>` +
          `</Relationships>`,
      ),
    },
    { name: 'xl/styles.xml', data: x(STYLES) },
    ...sheets.map((s, i) => ({ name: `xl/worksheets/sheet${i + 1}.xml`, data: x(sheetXml(s)) })),
  ];
  return zip(files);
}

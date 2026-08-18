import XLSX from 'xlsx';
import { ClassModelOriginal } from '../../types';

const clean = (value: unknown): string =>
  String(value ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'D')
    .trim();

const normHeader = (value: unknown): string =>
  clean(value)
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, '');

const HEADER_ALIASES: Record<string, string[]> = {
  STT: ['STT'],
  MAMH: ['MAMH', 'MAMON', 'MAMONHOC', 'MAHP', 'MAHOCPHAN'],
  MALOP: ['MALOP', 'MALOPHOC', 'MALHP', 'MALOPMONHOC', 'LOPHOCPHAN'],
  TENMH: ['TENMH', 'TENMON', 'TENMONHOC', 'TENHOCPHAN'],
  MAGV: ['MAGV', 'MAGIANGVIEN', 'MACB'],
  TENGV: ['TENGV', 'TENGIANGVIEN', 'GIANGVIEN', 'CANBOGIANGDAY', 'GVHD', 'GV'],
  SISO: ['SISO', 'SISOTOIDA', 'SLDK'],
  SOTC: ['SOTC', 'SOTINCHI', 'TINCHI', 'STC'],
  THUCHANH: ['THUCHANH', 'SOTCTH', 'TCTH', 'TH'],
  HTGD: ['HTGD', 'HINHTHUCGIANGDAY', 'LOAILOP'],
  THU: ['THU', 'THUHOC', 'THU2'],
  TIET: ['TIET', 'TIETHOC'],
  CACHTUAN: ['CACHTUAN', 'CACHHOCTUAN', 'CHUKYTUAN', 'TUAN'],
  PHONGHOC: ['PHONGHOC', 'PHONG', 'DIADIEM'],
  KHOAHOC: ['KHOAHOC', 'KHOA'],
  HOCKY: ['HOCKY', 'HK'],
  NAMHOC: ['NAMHOC', 'NH'],
  HEDT: ['HEDT', 'HEDAOTAO', 'HE'],
  KHOAQL: ['KHOAQL', 'KHOAQUANLY', 'BOMON'],
  NBD: ['NBD', 'NGAYBATDAU', 'NGAYBD'],
  NKT: ['NKT', 'NGAYKETTHUC', 'NGAYKT'],
  GHICHU: ['GHICHU', 'NOTE'],
  NGONNGU: ['NGONNGU', 'LANG', 'NN'],
  MALOPLT: ['MALOPLT', 'MALOPLYTHUYET', 'LOPLYTHUYET'],
};

const ALIAS_TO_KEY = new Map<string, string>();
for (const [key, aliases] of Object.entries(HEADER_ALIASES)) {
  for (const alias of aliases) ALIAS_TO_KEY.set(alias, key);
}

export function findHeader(rows: any[][], maxScan = 40): { rowIndex: number; indexes: Record<string, number> } | null {
  const limit = Math.min(rows.length, maxScan);

  for (let rowIndex = 0; rowIndex < limit; rowIndex++) {
    const row = rows[rowIndex] ?? [];
    const mapped = row.map((cell) => ALIAS_TO_KEY.get(normHeader(cell)) ?? null);
    const found = new Set(mapped.filter(Boolean));

    // MALOP + MAMH + TENMH là bộ nhận dạng bảng lớp học UIT.
    if (found.has('MALOP') && found.has('MAMH') && found.has('TENMH')) {
      const indexes: Record<string, number> = {};
      mapped.forEach((key, colIndex) => {
        if (key && indexes[key] == null) indexes[key] = colIndex;
      });
      return { rowIndex, indexes };
    }
  }

  return null;
}

export function text(value: unknown): string {
  return String(value ?? '').replace(/\u00a0/g, ' ').trim();
}

export function numberOrNull(value: unknown): number | null {
  if (value == null || text(value) === '') return null;
  const n = Number(String(value).replace(',', '.'));
  return Number.isFinite(n) ? n : null;
}

export function readCell(row: any[], indexes: Record<string, number>, key: string): any {
  const i = indexes[key];
  return i == null ? null : row[i] ?? null;
}

export function cleanTenMH(rawTenMH?: string): string {
  if (!rawTenMH) return '';
  let name = String(rawTenMH).trim();
  if (name.includes('-----')) {
    name = name.split(/\s*-----\s*/)[0].trim();
  }
  name = name.replace(/^[A-Z0-9._-]+\s+/, '');
  name = name.replace(/\s+\d{4,6}(\s+.*)?$/, '');
  return name.trim();
}

export function cleanMaLop(rawMaLop?: string): string {
  if (!rawMaLop) return '';
  let code = String(rawMaLop).trim();
  if (code.includes('-----')) {
    code = code.split(/\s*-----\s*/)[0].trim();
  }
  const token = code.split(/\s+/)[0];
  if (/^[A-Z0-9._-]+$/i.test(token)) {
    return token;
  }
  return code;
}

export function cleanTenGV(rawTenGV?: string): string | undefined {
  if (!rawTenGV) return undefined;
  let gv = String(rawTenGV).trim();
  if (gv.includes('-----')) {
    gv = gv.split(/\s*-----\s*/)[0].trim();
  }
  gv = gv.replace(/^\d{4,6}\s+/, '');
  return gv.trim() || undefined;
}

function parseSheetToClassModels(sheet: XLSX.WorkSheet, _sheetName: string): ClassModelOriginal[] {
  if (!sheet) return [];

  const rows = XLSX.utils.sheet_to_json<any[]>(sheet, {
    header: 1,
    defval: null,
    raw: false,
    blankrows: false,
  });

  const header = findHeader(rows);
  if (!header) return [];

  const out: ClassModelOriginal[] = [];
  for (let i = header.rowIndex + 1; i < rows.length; i++) {
    const row = rows[i] ?? [];

    const rawClassCode = text(readCell(row, header.indexes, 'MALOP'));
    const rawCourseCode = text(readCell(row, header.indexes, 'MAMH')).toUpperCase();
    const rawSubjectName = text(readCell(row, header.indexes, 'TENMH'));

    if (!rawClassCode && !rawCourseCode && !rawSubjectName) continue;
    if (!rawClassCode) continue;

    const classCode = cleanMaLop(rawClassCode);
    const courseCode = rawCourseCode || (classCode.includes('.') ? classCode.split('.')[0] : '');
    const subjectName = cleanTenMH(rawSubjectName);
    const lecturerCode = text(readCell(row, header.indexes, 'MAGV'));
    const lecturerName = cleanTenGV(text(readCell(row, header.indexes, 'TENGV')));
    const capacity = text(readCell(row, header.indexes, 'SISO'));
    const credits = numberOrNull(readCell(row, header.indexes, 'SOTC'));
    const practiceCredits = numberOrNull(readCell(row, header.indexes, 'THUCHANH'));
    const teachingType = text(readCell(row, header.indexes, 'HTGD'));
    const day = text(readCell(row, header.indexes, 'THU'));
    const periods = text(readCell(row, header.indexes, 'TIET'));
    const weekGap = text(readCell(row, header.indexes, 'CACHTUAN'));
    const room = text(readCell(row, header.indexes, 'PHONGHOC'));
    const cohort = text(readCell(row, header.indexes, 'KHOAHOC'));

    const sttVal = numberOrNull(readCell(row, header.indexes, 'STT'));

    out.push({
      STT: sttVal ?? 0,
      MaMH: courseCode,
      MaLop: classCode,
      TenMH: subjectName,
      MaGV: lecturerCode || undefined,
      TenGV: lecturerName,
      SiSo: capacity,
      SoTc: credits ?? 0,
      ThucHanh: practiceCredits ?? 0,
      HTGD: teachingType,
      Thu: day,
      Tiet: periods,
      CachTuan: weekGap,
      PhongHoc: room,
      KhoaHoc: cohort,
      HocKy: text(readCell(row, header.indexes, 'HOCKY')),
      NamHoc: text(readCell(row, header.indexes, 'NAMHOC')),
      HeDT: text(readCell(row, header.indexes, 'HEDT')),
      KhoaQL: text(readCell(row, header.indexes, 'KHOAQL')),
      NBD: text(readCell(row, header.indexes, 'NBD')),
      NKT: text(readCell(row, header.indexes, 'NKT')),
      GhiChu: text(readCell(row, header.indexes, 'GHICHU')),
      NgonNgu: text(readCell(row, header.indexes, 'NGONNGU')),
      MaLopLt: text(readCell(row, header.indexes, 'MALOPLT')),
    });
  }

  return out;
}

export function parseSheetRowsDynamic(sheetRows: any[][]): ClassModelOriginal[] {
  if (!Array.isArray(sheetRows) || sheetRows.length === 0) return [];
  const header = findHeader(sheetRows);
  if (!header) return [];

  const out: ClassModelOriginal[] = [];
  for (let i = header.rowIndex + 1; i < sheetRows.length; i++) {
    const row = sheetRows[i] ?? [];

    const rawClassCode = text(readCell(row, header.indexes, 'MALOP'));
    const rawCourseCode = text(readCell(row, header.indexes, 'MAMH')).toUpperCase();
    const rawSubjectName = text(readCell(row, header.indexes, 'TENMH'));

    if (!rawClassCode && !rawCourseCode && !rawSubjectName) continue;
    if (!rawClassCode) continue;

    const classCode = cleanMaLop(rawClassCode);
    const courseCode = rawCourseCode || (classCode.includes('.') ? classCode.split('.')[0] : '');
    const subjectName = cleanTenMH(rawSubjectName);
    const lecturerCode = text(readCell(row, header.indexes, 'MAGV'));
    const lecturerName = cleanTenGV(text(readCell(row, header.indexes, 'TENGV')));
    const capacity = text(readCell(row, header.indexes, 'SISO'));
    const credits = numberOrNull(readCell(row, header.indexes, 'SOTC'));
    const practiceCredits = numberOrNull(readCell(row, header.indexes, 'THUCHANH'));
    const teachingType = text(readCell(row, header.indexes, 'HTGD'));
    const day = text(readCell(row, header.indexes, 'THU'));
    const periods = text(readCell(row, header.indexes, 'TIET'));
    const weekGap = text(readCell(row, header.indexes, 'CACHTUAN'));
    const room = text(readCell(row, header.indexes, 'PHONGHOC'));
    const cohort = text(readCell(row, header.indexes, 'KHOAHOC'));

    const sttVal = numberOrNull(readCell(row, header.indexes, 'STT'));

    out.push({
      STT: sttVal ?? 0,
      MaMH: courseCode,
      MaLop: classCode,
      TenMH: subjectName,
      MaGV: lecturerCode || undefined,
      TenGV: lecturerName,
      SiSo: capacity,
      SoTc: credits ?? 0,
      ThucHanh: practiceCredits ?? 0,
      HTGD: teachingType,
      Thu: day,
      Tiet: periods,
      CachTuan: weekGap,
      PhongHoc: room,
      KhoaHoc: cohort,
      HocKy: text(readCell(row, header.indexes, 'HOCKY')),
      NamHoc: text(readCell(row, header.indexes, 'NAMHOC')),
      HeDT: text(readCell(row, header.indexes, 'HEDT')),
      KhoaQL: text(readCell(row, header.indexes, 'KHOAQL')),
      NBD: text(readCell(row, header.indexes, 'NBD')),
      NKT: text(readCell(row, header.indexes, 'NKT')),
      GhiChu: text(readCell(row, header.indexes, 'GHICHU')),
      NgonNgu: text(readCell(row, header.indexes, 'NGONNGU')),
      MaLopLt: text(readCell(row, header.indexes, 'MALOPLT')),
    });
  }

  // Post-process SoTc fallback
  const soTcMap = new Map<string, number>();
  out.forEach((item) => {
    if (item.SoTc && item.SoTc > 0) {
      if (item.MaMH) soTcMap.set(item.MaMH.trim().toUpperCase(), item.SoTc);
      if (item.TenMH) soTcMap.set(item.TenMH.trim().toUpperCase(), item.SoTc);
    }
  });

  out.forEach((item) => {
    if (!item.SoTc || item.SoTc === 0) {
      const fallback =
        (item.MaMH && soTcMap.get(item.MaMH.trim().toUpperCase())) ||
        (item.TenMH && soTcMap.get(item.TenMH.trim().toUpperCase()));
      if (fallback) item.SoTc = fallback;
    }
  });

  return out;
}

export async function parseUitScheduleExcel(file: File): Promise<{
  classes: ClassModelOriginal[];
  matchedSheets: string[];
  totalRows: number;
  duplicateRows: number;
}> {
  if (!file) throw new Error('Chưa chọn file Excel.');

  const ext = file.name.toLowerCase().match(/\.([^.]+)$/)?.[1];
  if (!ext || !['xlsx', 'xls', 'xlsm', 'xlsb', 'csv'].includes(ext)) {
    throw new Error('File không đúng định dạng Excel (.xlsx, .xls, .xlsm, .csv).');
  }

  const data = await file.arrayBuffer();
  const workbook = XLSX.read(data, { type: 'array' });

  const imported: ClassModelOriginal[] = [];
  const matchedSheets: string[] = [];

  for (const sheetName of workbook.SheetNames) {
    const sheet = workbook.Sheets[sheetName];
    const rows = parseSheetToClassModels(sheet, sheetName);
    if (rows.length) {
      matchedSheets.push(sheetName);
      imported.push(...rows);
    }
  }

  if (!imported.length) {
    throw new Error('Không tìm thấy bảng lớp học. File cần có các cột MAMH, MALOP và TENMH.');
  }

  // Post-process SoTc fallback
  const soTcMap = new Map<string, number>();
  imported.forEach((item) => {
    if (item.SoTc && item.SoTc > 0) {
      if (item.MaMH) soTcMap.set(item.MaMH.trim().toUpperCase(), item.SoTc);
      if (item.TenMH) soTcMap.set(item.TenMH.trim().toUpperCase(), item.SoTc);
    }
  });

  imported.forEach((item) => {
    if (!item.SoTc || item.SoTc === 0) {
      const fallback =
        (item.MaMH && soTcMap.get(item.MaMH.trim().toUpperCase())) ||
        (item.TenMH && soTcMap.get(item.TenMH.trim().toUpperCase()));
      if (fallback) item.SoTc = fallback;
    }
  });

  // Deduplicate by MaLop
  const byClassCode = new Map<string, ClassModelOriginal>();
  for (const row of imported) {
    if (!byClassCode.has(row.MaLop)) byClassCode.set(row.MaLop, row);
  }

  const classes = [...byClassCode.values()];

  return {
    classes,
    matchedSheets,
    totalRows: imported.length,
    duplicateRows: imported.length - classes.length,
  };
}

export function scheduledClasses(classes: ClassModelOriginal[]): ClassModelOriginal[] {
  return classes.filter((item) => Boolean(item.Thu && item.Tiet));
}

export function arrayToTkbObject(array: any[]): ClassModelOriginal {
  return parseSheetRowsDynamic([array])[0] || ({} as ClassModelOriginal);
}

// from Date object to 'hh:mm dd/MM/yyyy' format
export function toDateTimeString(date: Date) {
  return (
    date.getHours().toString().padStart(2, '0') +
    ':' +
    date.getMinutes().toString().padStart(2, '0') +
    ' ' +
    date.getDate().toString().padStart(2, '0') +
    '/' +
    (date.getMonth() + 1).toString().padStart(2, '0') +
    '/' +
    date.getFullYear()
  );
}

// Format epoch timestamp to 'hh:mm dd/MM/yyyy' format
export function formatTimestampToString(timestamp: number): string {
  return toDateTimeString(new Date(timestamp));
}

// Get formatted lastUpdate string from dataExcel (backward compatible)
export function getLastUpdateString(dataExcel: { lastUpdate?: string; lastUpdateTimestamp?: number } | null): string | undefined {
  if (!dataExcel) return undefined;
  if (dataExcel.lastUpdateTimestamp !== undefined) {
    return formatTimestampToString(dataExcel.lastUpdateTimestamp);
  }
  return dataExcel.lastUpdate;
}

export const sheetJSFT = ['.xlsx', '.xlsb', '.xlsm', '.xls', '.csv'].join(',');

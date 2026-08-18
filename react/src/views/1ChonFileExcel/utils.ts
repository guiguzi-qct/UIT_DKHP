import { ClassModelOriginal } from 'types';

export type ColumnMap = Partial<Record<keyof ClassModelOriginal, number>>;

const HEADER_ALIAS_MAP: Record<keyof ClassModelOriginal, string[]> = {
  STT: ['stt', 'sodanhsach', 'danhsach', 'tt', 'no', 'number'],
  MaMH: ['mamh', 'mamonhoc', 'mamon', 'mahp', 'mahocphan', 'mamonhocphan', 'macocau'],
  MaLop: ['malop', 'malophocphan', 'malhp', 'malopmonhoc', 'lophocphan', 'malopghep', 'macls', 'lop'],
  TenMH: ['tenmh', 'tenmonhoc', 'tenmon', 'tenlhp', 'tenhocphan', 'tenmonhocphan', 'hocphan'],
  MaGV: ['magv', 'magiangvien', 'macb', 'macanbo'],
  TenGV: ['tengv', 'tengiangvien', 'tentrogiang', 'giangvien', 'canbogiangday', 'gvhd', 'gv'],
  SiSo: ['siso', 'sldk', 'soluong', 'sl', 'cl'],
  SoTc: ['sotc', 'totc', 'sotinchi', 'stc', 'tc', 'tinchi'],
  ThucHanh: ['thuchanh', 'th', 'sotcth'],
  HTGD: ['htgd', 'hinhthucgiangday', 'hinhthuc', 'ht', 'loaivaotrong', 'loaimon', 'loailop'],
  Thu: ['thu', 'thuhoc', 'thutrongtuan', 'ngayhoc', 'thu2'],
  Tiet: ['tiet', 'tiethoc', 'danhsachtiet', 'tiethocphan', 'tietbd'],
  CachTuan: ['cachtuan', 'tuanhoc', 'tuan'],
  PhongHoc: ['phonghoc', 'phong', 'phonglt', 'phongth', 'diadiem'],
  KhoaHoc: ['khoahoc', 'khoa', 'khoaql'],
  HocKy: ['hocky', 'hk'],
  NamHoc: ['namhoc', 'nh'],
  HeDT: ['hedt', 'hedaotao', 'he'],
  KhoaQL: ['khoaql', 'khoaquanly', 'bm', 'bomon'],
  NBD: ['nbd', 'ngaybatdau', 'ngaybd', 'bd', 'tungay'],
  NKT: ['nkt', 'ngayketthuc', 'ngaykt', 'kt', 'denngay'],
  GhiChu: ['ghichu', 'note', 'ghichu2'],
  NgonNgu: ['ngonngu', 'lang', 'nn'],
};

const normalizeTextKey = (text: unknown): string => {
  if (text == null) return '';
  return String(text)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'D')
    .replace(/[^a-zA-Z0-9]/g, '')
    .toLowerCase();
};

export function detectHeaderColumns(row: any[]): ColumnMap {
  const map: ColumnMap = {};
  if (!Array.isArray(row)) return map;

  row.forEach((cell, colIdx) => {
    const norm = normalizeTextKey(cell);
    if (!norm) return;

    (Object.keys(HEADER_ALIAS_MAP) as (keyof ClassModelOriginal)[]).forEach((field) => {
      if (map[field] === undefined) {
        const aliases = HEADER_ALIAS_MAP[field];
        if (aliases.includes(norm)) {
          map[field] = colIdx;
        }
      }
    });
  });

  return map;
}

export function arrayToTkbObjectDynamic(
  row: any[],
  getVal: (field: keyof ClassModelOriginal, defaultIdx: number) => any,
): ClassModelOriginal {
  const stringOrEmpty = (value: unknown): string => (value == null ? '' : String(value).trim());

  function convertExcelDateToStringDate(excelDate: unknown): string {
    if (typeof excelDate === 'number' && !isNaN(excelDate)) {
      // @ts-ignore
      const offsetOfBases = new Date(0) - new Date(1899, 11, 31);
      const jsDate = new Date(excelDate * 24 * 60 * 60 * 1000 - offsetOfBases);
      if (!isNaN(jsDate.getTime())) {
        return (
          jsDate.getFullYear() +
          '-' +
          (jsDate.getMonth() + 1).toString().padStart(2, '0') +
          '-' +
          jsDate.getDate().toString().padStart(2, '0')
        );
      }
    }
    return stringOrEmpty(excelDate);
  }

  const sttRaw = getVal('STT', 0);
  const sttNum = parseInt(String(sttRaw ?? ''), 10);

  const nbdRaw = getVal('NBD', 19);
  const nktRaw = getVal('NKT', 20);

  return {
    STT: isNaN(sttNum) ? 0 : sttNum,
    MaMH: stringOrEmpty(getVal('MaMH', 1)),
    MaLop: stringOrEmpty(getVal('MaLop', 2)),
    TenMH: stringOrEmpty(getVal('TenMH', 3)),
    MaGV: stringOrEmpty(getVal('MaGV', 4)),
    TenGV: stringOrEmpty(getVal('TenGV', 5)),
    SiSo: stringOrEmpty(getVal('SiSo', 6)),
    SoTc: parseInt(String(getVal('SoTc', 7) ?? '0'), 10) || 0,
    ThucHanh: parseInt(String(getVal('ThucHanh', 8) ?? '0'), 10) || 0,
    HTGD: stringOrEmpty(getVal('HTGD', 9)),
    Thu: stringOrEmpty(getVal('Thu', 10)),
    Tiet: stringOrEmpty(getVal('Tiet', 11)),
    CachTuan: stringOrEmpty(getVal('CachTuan', 12)),
    PhongHoc: stringOrEmpty(getVal('PhongHoc', 13)),
    KhoaHoc: stringOrEmpty(getVal('KhoaHoc', 14)),
    HocKy: stringOrEmpty(getVal('HocKy', 15)),
    NamHoc: stringOrEmpty(getVal('NamHoc', 16)),
    HeDT: stringOrEmpty(getVal('HeDT', 17)),
    KhoaQL: stringOrEmpty(getVal('KhoaQL', 18)),
    NBD: typeof nbdRaw === 'number' ? convertExcelDateToStringDate(nbdRaw) : stringOrEmpty(nbdRaw),
    NKT: typeof nktRaw === 'number' ? convertExcelDateToStringDate(nktRaw) : stringOrEmpty(nktRaw),
    GhiChu: stringOrEmpty(getVal('GhiChu', 21)),
    NgonNgu: stringOrEmpty(getVal('NgonNgu', 22)),
  };
}

export function parseSheetRowsDynamic(sheetRows: any[][]): ClassModelOriginal[] {
  if (!Array.isArray(sheetRows) || sheetRows.length === 0) return [];

  let bestMap: ColumnMap = {};
  let bestHeaderIdx = -1;
  let maxMatched = 0;

  const maxScanRows = Math.min(sheetRows.length, 25);
  for (let r = 0; r < maxScanRows; r++) {
    const colMap = detectHeaderColumns(sheetRows[r]);
    const matchedCount = Object.keys(colMap).length;
    if (matchedCount > maxMatched && matchedCount >= 2) {
      maxMatched = matchedCount;
      bestMap = colMap;
      bestHeaderIdx = r;
    }
  }

  const getCol = (row: any[], field: keyof ClassModelOriginal, defaultIdx: number): any => {
    const idx = bestMap[field] ?? defaultIdx;
    return row[idx];
  };

  const startRow = bestHeaderIdx >= 0 ? bestHeaderIdx + 1 : 0;
  const results: ClassModelOriginal[] = [];
  let prevClass: ClassModelOriginal | null = null;

  for (let r = startRow; r < sheetRows.length; r++) {
    const row = sheetRows[r];
    if (!Array.isArray(row) || row.length === 0) continue;

    let maLopRaw = getCol(row, 'MaLop', 2);
    let maMhRaw = getCol(row, 'MaMH', 1);
    let tenMhRaw = getCol(row, 'TenMH', 3);
    const thuRaw = getCol(row, 'Thu', 10);
    const tietRaw = getCol(row, 'Tiet', 11);

    let maLopStr = String(maLopRaw ?? '').trim();
    let maMhStr = String(maMhRaw ?? '').trim();
    let tenMhStr = String(tenMhRaw ?? '').trim();
    const thuStr = String(thuRaw ?? '').trim();
    const tietStr = String(tietRaw ?? '').trim();

    // Carry over class code info for multi-schedule rows in Excel
    if (!maLopStr && !maMhStr && !tenMhStr && prevClass && (thuStr || tietStr)) {
      maLopStr = prevClass.MaLop;
      maMhStr = prevClass.MaMH;
      tenMhStr = prevClass.TenMH;
    }

    if (!maLopStr && !maMhStr && !tenMhStr) continue;

    const normCombined = `${maLopStr} ${maMhStr} ${tenMhStr}`.toLowerCase();
    if (normCombined.includes('mã lớp') || normCombined.includes('mã môn') || normCombined.includes('tên môn')) continue;

    const parsedRow = arrayToTkbObjectDynamic(row, (field, defIdx) => getCol(row, field, defIdx));
    if (!parsedRow.MaLop && maLopStr) parsedRow.MaLop = maLopStr;
    if (!parsedRow.MaMH && maMhStr) parsedRow.MaMH = maMhStr;
    if (!parsedRow.TenMH && tenMhStr) parsedRow.TenMH = tenMhStr;

    // Handle merged class rows containing '-----' (e.g. IE104.R12.1 ... ----- IE104.R12.2 ...)
    if (maLopStr.includes('-----')) {
      const segments = maLopStr.split(/\s*-----\s*/).filter(Boolean);
      segments.forEach((segment) => {
        const segTrim = segment.trim();
        const codeToken = segTrim.split(/\s+/)[0];
        const cleanCode = /^[A-Z0-9.]+$/i.test(codeToken) ? codeToken : segTrim;

        const subRow: ClassModelOriginal = {
          ...parsedRow,
          MaLop: cleanCode,
        };

        if (cleanCode.includes('.')) {
          const maMh = cleanCode.split('.')[0];
          if (!subRow.MaMH) subRow.MaMH = maMh;
        }

        results.push(subRow);
      });
      prevClass = parsedRow;
      continue;
    }

    // Clean MaLop if it contains extra appended text (e.g. "IE104.R12.1 Internet...")
    if (parsedRow.MaLop && parsedRow.MaLop.includes(' ')) {
      const codeToken = parsedRow.MaLop.trim().split(/\s+/)[0];
      if (/^[A-Z0-9.]+$/i.test(codeToken)) {
        parsedRow.MaLop = codeToken;
      }
    }

    results.push(parsedRow);
    prevClass = parsedRow;
  }

  // Post-process: Populate missing SoTc by matching MaMH or TenMH across the parsed results
  const soTcMap = new Map<string, number>();
  results.forEach((item) => {
    if (item.SoTc && item.SoTc > 0) {
      if (item.MaMH) soTcMap.set(item.MaMH.trim().toUpperCase(), item.SoTc);
      if (item.TenMH) soTcMap.set(item.TenMH.trim().toUpperCase(), item.SoTc);
    }
  });

  results.forEach((item) => {
    if (!item.SoTc || item.SoTc === 0) {
      const fallback =
        (item.MaMH && soTcMap.get(item.MaMH.trim().toUpperCase())) ||
        (item.TenMH && soTcMap.get(item.TenMH.trim().toUpperCase()));
      if (fallback) item.SoTc = fallback;
    }
  });

  return results;
}

export function arrayToTkbObject(array: any[]): ClassModelOriginal {
  return arrayToTkbObjectDynamic(array, (field, defIdx) => array[defIdx]);
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

// copied from: https://github.com/SheetJS/sheetjs/blob/master/demos/react/sheetjs.jsx#L134-L136
export const sheetJSFT = [
  '.xlsx',
  '.xlsb',
  '.xlsm',
  '.xls',
  // '.xml',
  '.csv',
  // '.txt',
  // '.ods',
  // '.fods',
  // '.uos',
  // '.sylk',
  // '.dif',
  // '.dbf',
  // '.prn',
  // '.qpw',
  // '.123',
  // '.wb*',
  // '.wq*',
  // '.html',
  // '.htm',
].join(',');

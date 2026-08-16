import { ClassModelOriginal } from 'types';

export function arrayToTkbObject(array: any[]): ClassModelOriginal {
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

  const sttNum = parseInt(String(array[0] ?? ''), 10);

  return {
    STT: isNaN(sttNum) ? array[0] : sttNum,
    MaMH: stringOrEmpty(array[1]),
    MaLop: stringOrEmpty(array[2]),
    TenMH: stringOrEmpty(array[3]),
    MaGV: stringOrEmpty(array[4]),
    TenGV: stringOrEmpty(array[5]),
    SiSo: stringOrEmpty(array[6]),
    SoTc: parseInt(String(array[7] ?? '0'), 10) || 0,
    ThucHanh: parseInt(String(array[8] ?? '0'), 10) || 0,
    HTGD: stringOrEmpty(array[9]),
    // Lớp chưa được trường xếp lịch có thể để trống THỨ/TIẾT.
    Thu: stringOrEmpty(array[10]),
    Tiet: stringOrEmpty(array[11]),
    CachTuan: stringOrEmpty(array[12]),
    PhongHoc: stringOrEmpty(array[13]),
    KhoaHoc: stringOrEmpty(array[14]),
    HocKy: stringOrEmpty(array[15]),
    NamHoc: stringOrEmpty(array[16]),
    HeDT: stringOrEmpty(array[17]),
    KhoaQL: stringOrEmpty(array[18]),
    NBD: typeof array[19] === 'number' ? convertExcelDateToStringDate(array[19]) : stringOrEmpty(array[19]),
    NKT: typeof array[20] === 'number' ? convertExcelDateToStringDate(array[20]) : stringOrEmpty(array[20]),
    GhiChu: stringOrEmpty(array[21]),
    NgonNgu: stringOrEmpty(array[22]),
  };
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

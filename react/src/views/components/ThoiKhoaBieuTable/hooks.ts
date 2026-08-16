import constate from 'constate';
import html2canvas from 'html2canvas';
import React from 'react';
import { enqueueSnackbar } from 'notistack';
import { ClassModel } from '../../../types';
import { findOverlapedClasses, getDanhSachTiet, hasTimetableSlot } from '../../../utils';
import { selectPhanLoaiHocTrenTruong, useTkbStore } from '../../../zus';
import { downloadFromCanvas, getTietIndex } from './utils';

/* // Uncomment to see how rowData can be conducted:
const rowDataExample = [
  { Thu2: {  }, Thu3: {  }, Thu4: {  }, Thu5: null, Thu6: null, Thu7: null }, // tiet 1
  { Thu2: 'xx', Thu3: 'xx', Thu4: 'xx', Thu5: null, Thu6: {  }, Thu7: null }, // tiet 2
  { Thu2: 'xx', Thu3: 'xx', Thu4: 'xx', Thu5: null, Thu6: 'xx', Thu7: null }, // tiet 3
  { Thu2: {  }, Thu3: 'xx', Thu4: 'xx', Thu5: null, Thu6: 'xx', Thu7: null }, // tiet 4
  { Thu2: 'xx', Thu3: 'xx', Thu4: null, Thu5: null, Thu6: 'xx', Thu7: null }, // tiet 5
  { Thu2: {  }, Thu3: null, Thu4: {  }, Thu5: {  }, Thu6: null, Thu7: null }, // tiet 6
  { Thu2: 'xx', Thu3: null, Thu4: 'xx', Thu5: 'xx', Thu6: null, Thu7: null }, // tiet 7
  { Thu2: 'xx', Thu3: null, Thu4: 'xx', Thu5: 'xx', Thu6: null, Thu7: null }, // tiet 8
  { Thu2: 'xx', Thu3: null, Thu4: 'xx', Thu5: null, Thu6: null, Thu7: null }, // tiet 9
  { Thu2: 'xx', Thu3: null, Thu4: 'xx', Thu5: null, Thu6: null, Thu7: null }, // tiet 10
];
*/

export const CELL = {
  /** không có lớp học vào thời điểm này */
  NO_CLASS: null,
  /** có lớp học vào thời điểm này, nhưng sẽ được render đè bởi cell khác (lớp có tiết 12345 thì chỉ tiết 1 là phải render) */
  OCCUPIED: 'xx',
} as const;

type CellData = typeof CELL.NO_CLASS | typeof CELL.OCCUPIED | ClassModel;
export type RowData = {
  Thu2: CellData;
  Thu3: CellData;
  Thu4: CellData;
  Thu5: CellData;
  Thu6: CellData;
  Thu7: CellData;
};
type TableData = RowData[];

const initTableData = () => {
  const tableData: TableData = [];
  for (let i = 0; i < 14; i++) {
    tableData.push({
      Thu2: CELL.NO_CLASS,
      Thu3: CELL.NO_CLASS,
      Thu4: CELL.NO_CLASS,
      Thu5: CELL.NO_CLASS,
      Thu6: CELL.NO_CLASS,
      Thu7: CELL.NO_CLASS,
    });
  }
  return tableData;
};

const initTableDataDiff = () => {
  const tableData: any[] = [];
  for (let i = 0; i < 14; i++) {
    const row: any = {};
    for (let thu = 2; thu <= 7; thu++) {
      row[`Thu${thu}_A`] = CELL.NO_CLASS;
      row[`Thu${thu}_B`] = CELL.NO_CLASS;
    }
    tableData.push(row);
  }
  return tableData;
};

// Phân loại data thành các lớp học trên trường & các lớp HT2
// Đồng thời tái cấu trúc CTDL nhằm tiện vẽ TKB hơn
const usePhanLoaiHocTrenTruong = () => {
  const [khongHocTrenTruong, hocTrenTruong] = useTkbStore(selectPhanLoaiHocTrenTruong);
  const diffComparePlanId = useTkbStore((s) => s.diffComparePlanId);

  const { keptA, keptB, redundant } = React.useMemo(() => {
    if (diffComparePlanId) {
      // @ts-ignore
      const planAClasses = hocTrenTruong.filter((c) => c.diffTag === 'MATCHED' || c.diffTag === 'PLAN_A');
      // @ts-ignore
      const planBClasses = hocTrenTruong.filter((c) => c.diffTag === 'PLAN_B');

      const resA = findOverlapedClasses(planAClasses);
      const resB = findOverlapedClasses(planBClasses);

      return {
        keptA: resA.kept,
        keptB: resB.kept,
        redundant: [...resA.redundant, ...resB.redundant],
      };
    }
    const res = findOverlapedClasses(hocTrenTruong);
    return { keptA: res.kept, keptB: [], redundant: res.redundant };
  }, [hocTrenTruong, diffComparePlanId]);

  const rowDataHocTrenTruong = React.useMemo(() => {
    if (diffComparePlanId) {
      const tableData = initTableDataDiff();

      // Populate Plan A classes (including MATCHED)
      for (const lop of keptA) {
        if (!hasTimetableSlot(lop)) continue;
        const listTiet = getDanhSachTiet(lop.Tiet);
        const tietBatDauIndex = getTietIndex(listTiet[0]);
        if (!tableData[tietBatDauIndex]) continue;

        // @ts-ignore
        const isMatched = lop.diffTag === 'MATCHED';
        const colKeyA = `Thu${lop.Thu}_A`;
        const colKeyB = `Thu${lop.Thu}_B`;

        if (isMatched) {
          tableData[tietBatDauIndex][colKeyA] = lop;
          tableData[tietBatDauIndex][colKeyB] = CELL.OCCUPIED;

          for (let i = 1; i < listTiet.length; i++) {
            const tietIndex = getTietIndex(listTiet[i]);
            if (tableData[tietIndex]) {
              tableData[tietIndex][colKeyA] = CELL.OCCUPIED;
              tableData[tietIndex][colKeyB] = CELL.OCCUPIED;
            }
          }
        } else {
          tableData[tietBatDauIndex][colKeyA] = lop;
          for (let i = 1; i < listTiet.length; i++) {
            const tietIndex = getTietIndex(listTiet[i]);
            if (tableData[tietIndex]) {
              tableData[tietIndex][colKeyA] = CELL.OCCUPIED;
            }
          }
        }
      }

      // Populate Plan B classes
      for (const lop of keptB) {
        if (!hasTimetableSlot(lop)) continue;
        const listTiet = getDanhSachTiet(lop.Tiet);
        const tietBatDauIndex = getTietIndex(listTiet[0]);
        if (!tableData[tietBatDauIndex]) continue;

        const colKeyB = `Thu${lop.Thu}_B`;
        tableData[tietBatDauIndex][colKeyB] = lop;

        for (let i = 1; i < listTiet.length; i++) {
          const tietIndex = getTietIndex(listTiet[i]);
          if (tableData[tietIndex]) {
            tableData[tietIndex][colKeyB] = CELL.OCCUPIED;
          }
        }
      }

      return tableData;
    }

    const tableData = initTableData();
    for (const lop of keptA) {
      if (!hasTimetableSlot(lop)) continue;
      const listTiet = getDanhSachTiet(lop.Tiet);
      const tietBatDauIndex = getTietIndex(listTiet[0]);
      if (!tableData[tietBatDauIndex]) continue;

      tableData[tietBatDauIndex]['Thu' + lop.Thu] = lop;
      for (let i = 1; i < listTiet.length; i++) {
        const tietIndex = getTietIndex(listTiet[i]);
        if (tableData[tietIndex]) {
          tableData[tietIndex]['Thu' + lop.Thu] = CELL.OCCUPIED;
        }
      }
    }

    return tableData;
  }, [keptA, keptB, diffComparePlanId]);

  return {
    redundant,
    khongHocTrenTruong,
    rowDataHocTrenTruong,
  };
};

export const [PhanLoaiHocTrenTruongContext, usePhanLoaiHocTrenTruongContext] = constate(usePhanLoaiHocTrenTruong);

export const useProcessImageTkb = () => {
  const tkbTableRef = React.useRef<HTMLTableElement>(null);

  const renderTimetableCanvas = React.useCallback(async () => {
    if (!tkbTableRef.current) throw new Error('Không tìm thấy bảng thời khóa biểu');

    return html2canvas(tkbTableRef.current, {
      backgroundColor: '#ffffff',
      logging: false,
      scale: Math.min(window.devicePixelRatio || 1, 2),
      useCORS: true,
      onclone: (clonedDocument) => {
        const clonedTable = clonedDocument.querySelector<HTMLTableElement>('#thoi-khoa-bieu table');
        clonedTable?.querySelectorAll<HTMLElement>('thead th, .cell-tiet').forEach((element) => {
          element.style.position = 'static';
          element.style.left = 'auto';
          element.style.top = 'auto';
        });
        clonedTable
          ?.querySelectorAll<HTMLElement>('.remove-class-btn, .cell-picker-hint, .empty-slot-action')
          .forEach((element) => {
            element.style.display = 'none';
          });
      },
    });
  }, []);

  const canvasToPngBlob = React.useCallback(
    (canvas: HTMLCanvasElement) =>
      new Promise<Blob>((resolve, reject) => {
        canvas.toBlob((blob) => {
          if (blob) resolve(blob);
          else reject(new Error('Không thể tạo ảnh PNG'));
        }, 'image/png');
      }),
    [],
  );

  const saveTkbImageToComputer = React.useCallback(async () => {
    try {
      const canvas = await renderTimetableCanvas();
      downloadFromCanvas(canvas, 'thoikhoabieu.png');
      enqueueSnackbar('Đã tải ảnh thời khóa biểu.', { variant: 'success' });
    } catch (error) {
      console.error(error);
      enqueueSnackbar('Không thể tạo ảnh thời khóa biểu, vui lòng thử lại.', { variant: 'error' });
    }
  }, [renderTimetableCanvas]);

  const copyTkbImageToClipboard = React.useCallback(async () => {
    let canvas: HTMLCanvasElement | null = null;

    try {
      canvas = await renderTimetableCanvas();
      const blob = await canvasToPngBlob(canvas);
      if (!navigator.clipboard?.write || typeof window.ClipboardItem !== 'function') {
        downloadFromCanvas(canvas, 'thoikhoabieu.png');
        enqueueSnackbar('Trình duyệt không hỗ trợ sao chép ảnh; ảnh đã được tải xuống.', { variant: 'info' });
        return;
      }

      await navigator.clipboard.write([new window.ClipboardItem({ 'image/png': blob })]);
      enqueueSnackbar('Sao chép vào clipboard thành công.', { variant: 'success' });
    } catch (error) {
      console.error(error);
      if (canvas) {
        downloadFromCanvas(canvas, 'thoikhoabieu.png');
        enqueueSnackbar('Không thể ghi ảnh vào clipboard; ảnh đã được tải xuống.', { variant: 'warning' });
        return;
      }
      enqueueSnackbar('Không thể tạo ảnh thời khóa biểu, vui lòng thử lại.', { variant: 'error' });
    }
  }, [canvasToPngBlob, renderTimetableCanvas]);

  return {
    tkbTableRef,
    saveTkbImageToComputer,
    copyTkbImageToClipboard,
  };
};

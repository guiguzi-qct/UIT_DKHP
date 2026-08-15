import uniqBy from 'lodash/uniqBy';
import { Buoi, ClassModel } from 'types';

export type TTrungTkb = { existing: ClassModel; new: ClassModel[] };

export function uniqMaLop(classes: ClassModel[]): ClassModel[] {
  return uniqBy(classes, 'MaLop'); // Có nhiều lớp học nhiều buổi 1 tuần, xuất hiện nhiều lần, nhưng chỉ nên cộng 1 lần
}

export function calcTongSoTC(classes: ClassModel[]) {
  const { kept } = findOverlapedClasses(classes);
  const unique = uniqMaLop(kept);
  return unique.reduce((acc, cur) => acc + cur.SoTc, 0);
}

export function getTongSoTcJudgement(tongSoTC: number) {
  const text =
    tongSoTC < 14
      ? 'Chưa đạt số TC quy định: 14'
      : tongSoTC > 24
      ? 'Vượt quá số TC quy định: 24'
      : 'Thỏa mãn số TC quy định 14-24';
  const isOk = tongSoTC >= 14 && tongSoTC <= 24;
  return {
    isOk,
    text,
  };
}

export function extractListMaLop(classes: ClassModel[]) {
  const unique = uniqMaLop(classes);
  return unique.map((it) => it.MaLop);
}

/** Chuẩn hoá chuỗi mã lớp được nhập/dán hoặc nhận từ liên kết chia sẻ. */
export function parseListMaLop(value: unknown): string[] {
  const tokens = String(value ?? '')
    .toUpperCase()
    .split(/[\s,+;]+/)
    .map((item) => item.trim())
    .filter(Boolean);

  return [...new Set(tokens)];
}

export const getBuoiFromTiet = (tiet: ClassModel['Tiet']): Buoi => {
  const normalizedTiet = normalizeScheduleValue(tiet);
  if (normalizedTiet.includes('11')) return Buoi.Toi;
  if (/1|2|3|4|5/g.test(normalizedTiet)) return Buoi.Sang;
  if (/6|7|8|9|0/g.test(normalizedTiet)) return Buoi.Chieu;
  return Buoi.N_A;
};

export const getDanhSachTiet = (tiet: ClassModel['Tiet']): string[] => {
  const normalizedTiet = normalizeScheduleValue(tiet);
  if (!normalizedTiet) return [];
  if (normalizedTiet.includes(','))
    return normalizedTiet
      .split(',')
      .map((it) => it.trim())
      .filter(Boolean);
  if (normalizedTiet === '*') return ['*'];
  return normalizedTiet.split('');
};

const INVALID_SCHEDULE_VALUES = new Set(['undefined', 'null', 'nan']);

const normalizeScheduleValue = (value: unknown): string => {
  if (value == null) return '';
  const normalized = String(value).trim();
  return INVALID_SCHEDULE_VALUES.has(normalized.toLowerCase()) ? '' : normalized;
};

const isValidTiet = (tiet: string): boolean => {
  if (tiet === '*') return true;
  const tietNumber = Number(tiet === '0' ? 10 : tiet);
  return Number.isInteger(tietNumber) && tietNumber >= 1 && tietNumber <= 14;
};

/** Có đủ dữ liệu để đặt lớp vào một ô cụ thể trên lưới thời khóa biểu. */
export const hasTimetableSlot = ({ Thu, Tiet }: Pick<ClassModel, 'Thu' | 'Tiet'>): boolean => {
  const normalizedThu = normalizeScheduleValue(Thu);
  const listTiet = getDanhSachTiet(Tiet);
  return /^[2-7]$/.test(normalizedThu) && listTiet.length > 0 && listTiet.every(isValidTiet);
};

/**
 * "*": Không lên trường
 * 2-1, 2-2, 2-3: Thứ 2, tiết 1,2,3
 * 7-11, 7-12, 7-13: Thứ 7, tiết 11,12,13
 */
type ValidTimeSlot = `${string}-${string}`;
type TimeSlots = '*' | ValidTimeSlot[];
const getTimeSlots = ({ Thu, Tiet }: ClassModel): TimeSlots => {
  if (Thu === '*') return '*';
  if (!hasTimetableSlot({ Thu, Tiet })) return [];
  return getDanhSachTiet(Tiet).map((tiet): ValidTimeSlot => `${Thu}-${tiet}`);
};

const isTimeSlotsOverlap = (timeSlotsA: TimeSlots, timeSlotsB: TimeSlots) => {
  if (timeSlotsA === '*' || timeSlotsB === '*') return false;
  return timeSlotsA.some((slotA) => timeSlotsB.includes(slotA));
};

export const hasOverlapSchedule = (classAs: ClassModel[], classB: ClassModel) => {
  const classBTimeSlots = getTimeSlots(classB);
  return classAs.some((classA) => {
    if (isSameAgGridRowId(classA, classB)) return false;
    const classATimeSlots = getTimeSlots(classA);
    return isTimeSlotsOverlap(classATimeSlots, classBTimeSlots);
  });
};

// Thường thì MaLop alone is enough because most of the classes only appear once a week or once every 2 weeks, nhưng mà có thể có môn Anh Văn học 1 tuần tới 2 buổi, nên cần có thêm Thu và Tiet
// TODO: maybe use STT?
export const getAgGridRowId = (classModel: ClassModel): string => {
  return classModel.MaLop + classModel.Thu + classModel.Tiet;
};

export const isSameAgGridRowId = (class1: ClassModel, class2: ClassModel) => {
  return getAgGridRowId(class1) === getAgGridRowId(class2);
};

export const findOverlapedClasses = (
  /** the first elements in the array will have higher priority, it's OK to have duplicated classes */
  classes: ClassModel[],
): { kept: ClassModel[]; redundant: TTrungTkb[] } => {
  const kept: ClassModel[] = [];
  const redundant: TTrungTkb[] = [];

  const findExistingOverlap = (newClass: ClassModel) => {
    const newClassTimeSlots = getTimeSlots(newClass);
    return kept.find((existingClass) => {
      const existingClassTimeSlots = getTimeSlots(existingClass);
      return isTimeSlotsOverlap(existingClassTimeSlots, newClassTimeSlots);
    });
  };

  const processedAgGridRowIds = new Set<string>();
  classes.forEach((addingClass) => {
    const agGridRowId = getAgGridRowId(addingClass);
    if (processedAgGridRowIds.has(agGridRowId)) return;

    processedAgGridRowIds.add(agGridRowId);
    const existingClassOverlapped = findExistingOverlap(addingClass);
    // TODO: refactor the mess below
    const existingRedundant =
      existingClassOverlapped && redundant.find((it) => isSameAgGridRowId(it.existing, existingClassOverlapped));
    if (existingRedundant) {
      existingRedundant.new.push(addingClass);
    } else if (existingClassOverlapped) {
      redundant.push({
        existing: existingClassOverlapped,
        new: [addingClass],
      });
    } else {
      kept.push(addingClass);
    }
  });

  return { kept, redundant };
};

export const log = (...args: any[]) => {
  (window.__DEBUG__ || process.env.NODE_ENV !== 'production') && console.log(...args);
};

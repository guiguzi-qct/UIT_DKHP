import { ClassModel } from '../../types';
import {
  applyCandidateBatch,
  getCompatibleCandidates,
  getDraftConflictReason,
  groupCandidatesByCourseName,
} from './CoursePickerDialog';

const makeClass = (overrides: Partial<ClassModel>): ClassModel =>
  ({
    STT: 1,
    MaMH: 'TEST',
    MaLop: 'TEST.1',
    TenMH: 'Môn kiểm thử',
    TenGV: 'Giảng viên',
    MaGV: 'GV',
    SiSo: '40',
    PhongHoc: 'A1',
    SoTc: 3,
    ThucHanh: 0,
    HTGD: 'LT',
    Thu: '2',
    Tiet: '123',
    CachTuan: '',
    KhoaHoc: '',
    HocKy: '',
    NamHoc: '',
    HeDT: '',
    KhoaQL: '',
    NBD: '',
    NKT: '',
    GhiChu: '',
    NgonNgu: 'TV',
    ...overrides,
  } as ClassModel);

describe('getCompatibleCandidates', () => {
  it('chỉ hiện lớp nằm trọn trong vùng trống được click', () => {
    const matching = makeClass({ MaLop: 'MATCH', Thu: '3', Tiet: '678' });
    const otherSlot = makeClass({ MaLop: 'OTHER', Thu: '4', Tiet: '678' });
    const crossesBoundary = makeClass({ MaLop: 'CROSS', Thu: '3', Tiet: '567' });

    const result = getCompatibleCandidates([matching, otherSlot, crossesBoundary], [], {
      kind: 'slot',
      thu: 3,
      tiets: ['6', '7', '8', '9', '0'],
      label: 'Buổi chiều · Tiết 6–10',
    });

    expect(result).toEqual([matching]);
  });

  it('không đưa lớp tiết 11–13 vào bộ chọn môn', () => {
    const regular = makeClass({ MaLop: 'REGULAR', Thu: '3', Tiet: '678' });
    const outsideHours = makeClass({ MaLop: 'OUTSIDE', Thu: '3', Tiet: '11,12,13' });

    expect(getCompatibleCandidates([regular, outsideHours], [], { kind: 'all' })).toEqual([regular]);
  });

  it('cho phép đổi lớp cùng môn nhưng loại phương án trùng phần lịch còn lại', () => {
    const current = makeClass({ MaMH: 'AI001', MaLop: 'AI001.R1', Thu: '2', Tiet: '123' });
    const otherCourse = makeClass({ MaMH: 'IT001', MaLop: 'IT001.R1', Thu: '4', Tiet: '678' });
    const fittingAlternative = makeClass({ MaMH: 'AI001', MaLop: 'AI001.R2', Thu: '5', Tiet: '123' });
    const conflictingAlternative = makeClass({ MaMH: 'AI001', MaLop: 'AI001.R3', Thu: '4', Tiet: '678' });

    const result = getCompatibleCandidates(
      [current, otherCourse, fittingAlternative, conflictingAlternative],
      [current, otherCourse],
      { kind: 'replace', existing: current },
    );

    expect(result).toEqual([fittingAlternative]);
  });

  it('đánh dấu đúng lý do làm mờ sau khi chọn nháp', () => {
    const draft = makeClass({ MaMH: 'AI001', MaLop: 'AI001.R1', Thu: '2', Tiet: '123' });
    const sameCoursePart = makeClass({ MaMH: 'AI001', MaLop: 'AI001.R2', Thu: '3', Tiet: '123' });
    const timeConflict = makeClass({ MaMH: 'IT001', MaLop: 'IT001.R1', Thu: '2', Tiet: '345' });
    const stillFits = makeClass({ MaMH: 'MA001', MaLop: 'MA001.R1', Thu: '4', Tiet: '678' });

    expect(getDraftConflictReason(sameCoursePart, [], [draft])).toBe('Đã chọn lớp khác cùng phần môn');
    expect(getDraftConflictReason(timeConflict, [], [draft])).toBe('Trùng giờ với lớp đang chọn');
    expect(getDraftConflictReason(stillFits, [], [draft])).toBeNull();
  });

  it('chỉ thay phần môn tương ứng khi xác nhận nhiều lớp', () => {
    const current = makeClass({ MaMH: 'AI001', MaLop: 'AI001.R1' });
    const untouched = makeClass({ MaMH: 'IT001', MaLop: 'IT001.R1' });
    const replacement = makeClass({ MaMH: 'AI001', MaLop: 'AI001.R2' });
    const added = makeClass({ MaMH: 'MA001', MaLop: 'MA001.R1' });

    expect(applyCandidateBatch([current, untouched], [replacement, added])).toEqual([untouched, replacement, added]);
  });

  it('gom đầy đủ các lớp cùng tên vào một nhóm môn', () => {
    const classA = makeClass({ MaMH: 'AI001', MaLop: 'AI001.R1', TenMH: 'Trí tuệ nhân tạo' });
    const classB = makeClass({ MaMH: 'AI001', MaLop: 'AI001.R2', TenMH: 'Trí tuệ nhân tạo' });
    const classC = makeClass({ MaMH: 'IT001', MaLop: 'IT001.R1', TenMH: 'Nhập môn lập trình' });

    const groups = groupCandidatesByCourseName([classA, classB, classC]);

    expect(groups).toHaveLength(2);
    expect(groups.find((group) => group.name === 'Trí tuệ nhân tạo')?.candidates).toEqual([classA, classB]);
    expect(groups.flatMap((group) => group.candidates)).toHaveLength(3);
  });
});

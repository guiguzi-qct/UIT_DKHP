import { ClassModel } from '../../types';
import { getCompatibleCandidates } from './CoursePickerDialog';

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
  it('chỉ hiện lớp đi qua đúng ô trống được click', () => {
    const matching = makeClass({ MaLop: 'MATCH', Thu: '3', Tiet: '678' });
    const otherSlot = makeClass({ MaLop: 'OTHER', Thu: '4', Tiet: '678' });

    const result = getCompatibleCandidates([matching, otherSlot], [], { kind: 'slot', thu: 3, tiet: '7' });

    expect(result).toEqual([matching]);
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
});

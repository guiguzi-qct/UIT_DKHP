import { ClassModel } from './types';
import { getDanhSachTiet, hasOverlapSchedule, hasTimetableSlot, parseListMaLop } from './utils';

const makeClass = (overrides: Partial<ClassModel> = {}): ClassModel =>
  ({
    STT: 1,
    MaMH: 'AI505',
    MaLop: 'AI505.R11',
    TenMH: 'Khoá luận tốt nghiệp',
    MaGV: undefined,
    TenGV: undefined,
    SiSo: '50(0)',
    PhongHoc: undefined,
    SoTc: 10,
    ThucHanh: 0,
    HTGD: 'KLTN',
    Thu: '',
    Tiet: '',
    CachTuan: '1',
    KhoaHoc: '0',
    HocKy: '1',
    NamHoc: '2026',
    HeDT: 'CQUI',
    KhoaQL: 'KHMT',
    NBD: '2026-09-07',
    NKT: '2026-12-26',
    GhiChu: '',
    NgonNgu: 'VN',
    ...overrides,
  } as ClassModel);

describe('lớp chưa có lịch', () => {
  it('không tạo danh sách tiết và không được xếp vào lưới', () => {
    expect(getDanhSachTiet('')).toEqual([]);
    expect(getDanhSachTiet('undefined')).toEqual([]);
    expect(hasTimetableSlot(makeClass())).toBe(false);
  });

  it('không bị xem là trùng với lớp đã có lịch', () => {
    const scheduled = makeClass({ MaLop: 'AI002.R11', Thu: '2', Tiet: '678' });
    expect(hasOverlapSchedule([scheduled], makeClass())).toBe(false);
  });

  it('vẫn nhận diện lịch hợp lệ', () => {
    expect(hasTimetableSlot(makeClass({ Thu: '4', Tiet: '12345' }))).toBe(true);
    expect(hasTimetableSlot(makeClass({ Thu: '3', Tiet: '*' }))).toBe(true);
  });
});

describe('danh sách mã lớp chia sẻ', () => {
  it('nhận dấu phẩy, khoảng trắng, dấu cộng, dấu chấm phẩy và loại mã trùng', () => {
    expect(parseListMaLop('ie105.r11, IE104.R11\nie105.r11 + ie221.r11; IE221.R11.2')).toEqual([
      'IE105.R11',
      'IE104.R11',
      'IE221.R11',
      'IE221.R11.2',
    ]);
  });
});

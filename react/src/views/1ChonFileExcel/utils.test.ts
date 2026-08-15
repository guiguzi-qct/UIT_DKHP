import { arrayToTkbObject } from './utils';

describe('arrayToTkbObject', () => {
  it('giữ THỨ và TIẾT trống thay vì tạo chuỗi "undefined"', () => {
    const row = [1, 'AI505', 'AI505.R11', 'Khoá luận tốt nghiệp'];

    const result = arrayToTkbObject(row);

    expect(result.Thu).toBe('');
    expect(result.Tiet).toBe('');
  });
});

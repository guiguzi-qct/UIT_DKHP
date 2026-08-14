# guiguzi

`guiguzi` là ứng dụng web hỗ trợ đọc file Excel thời khóa biểu, lọc lớp, kiểm tra trùng lịch và tạo bản xem thời khóa biểu.

## Chức năng

- Tải file Excel gồm danh sách lớp lý thuyết và thực hành.
- Tìm kiếm, lọc, nhóm và chọn lớp.
- Cảnh báo các lớp trùng thời gian.
- Tính tổng số tín chỉ đã chọn.
- Xem, tải ảnh, sao chép ảnh và chia sẻ thời khóa biểu.
- Lớp chưa có `THỨ` hoặc `TIẾT` vẫn được giữ trong danh sách nhưng không bị ép xếp vào lưới.

Ứng dụng chỉ xử lý dữ liệu ngay trên trình duyệt và không thu thập dữ liệu sử dụng.

## Chạy dự án

```bash
cd react
npm ci
npm start
```

Build production:

```bash
npm run build
```

Nếu sử dụng tính năng AG Grid Enterprise, cấu hình khóa riêng trong `react/.env`:

```env
REACT_APP_AG_GRID_LICENSE_KEY=
```

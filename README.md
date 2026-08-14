# guiguzi

`guiguzi` là ứng dụng web hỗ trợ đọc file Excel thời khóa biểu, lọc lớp, kiểm tra trùng lịch và tạo bản xem thời khóa biểu.

## Chức năng

- Tải file Excel gồm danh sách lớp lý thuyết và thực hành.
- Luồng 3 bước rõ ràng, thích ứng cho cả desktop và điện thoại.
- Click trực tiếp vào ô trống để tìm lớp vừa lịch, hoặc click lớp đã xếp để đổi lớp.
- Ô trống được gom theo buổi sáng (tiết 1–5) và buổi chiều (tiết 6–10); không hiển thị hoặc đề xuất lớp tiết 11–13.
- Popup cho phép chọn nháp nhiều lớp rồi xác nhận một lần; phương án xung đột vẫn hiện nhưng được làm mờ, khóa chọn và ghi rõ lý do.
- Danh sách chọn môn hiển thị đầy đủ và gom toàn bộ lớp cùng tên vào dropdown riêng.
- Cảnh báo các lớp trùng thời gian.
- Tính tổng số tín chỉ đã chọn.
- Xem, tải ảnh, sao chép ảnh và chia sẻ thời khóa biểu.
- Tiêu đề xếp lớp, thống kê, Chọn môn và Hoàn tất nằm trong thanh cố định phía dưới; điều hướng 3 bước vẫn ở header.
- Popup có kích thước cố định, chỉ cuộn danh sách môn và dùng animation nhẹ có hỗ trợ giảm chuyển động.
- Toàn bộ giao diện dùng một thang chữ thống nhất với các độ đậm 400/600/700/800.
- Bảng lịch cuộn ngang, có cột tiết cố định trên màn hình nhỏ.
- Lớp chưa có `THỨ` hoặc `TIẾT` vẫn được giữ trong danh sách nhưng không bị ép xếp vào lưới.
- Giao diện dùng font Be Vietnam Pro và hạn chế icon trang trí không cần thiết.

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

## Deploy lên Vercel

Import thư mục `guiguzi` vào Vercel và để trống **Root Directory**. File
`vercel.json` ở thư mục gốc sẽ tự cài dependency trong `react`, build ứng dụng
và chuyển các route như `/1`, `/2`, `/3` về `index.html`.

Nếu đã đặt **Root Directory** là `react`, dự án cũng có sẵn
`react/vercel.json` để build và xử lý các route SPA theo cùng cách.

Dự án sử dụng Node.js 20.x khi build trên Vercel.

Trong **Project Settings → Build and Deployment**, hãy xóa Install Command
tùy chỉnh nếu đang đặt là `npm audit fix --force`. Dự án đã dùng `npm ci`
qua `vercel.json`; chạy `audit fix --force` trong lúc deploy có thể tự đổi
dependency so với lockfile và làm kết quả build không ổn định.

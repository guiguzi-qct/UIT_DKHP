import Alert from '@mui/material/Alert';
import Paper from '@mui/material/Paper';
import Typography from '@mui/material/Typography';
import { useMemo } from 'react';
import ThoiKhoaBieuTable from '../components/ThoiKhoaBieuTable';
import PlanSelectorBar from '../components/PlanSelectorBar';
import { selectIsChiVeTkb, selectSelectedClassesBuoc3, selectTongSoTcBuoc3, useTkbStore } from '../../zus';
import DanhSachLopInput from './DanhSachLopInput';

function Index() {
  const isManualMode = useTkbStore(selectIsChiVeTkb);
  const classes = useTkbStore(selectSelectedClassesBuoc3);
  const credits = useTkbStore(selectTongSoTcBuoc3);

  const uniqueDaysCount = useMemo(() => {
    const days = new Set(classes.map((c) => c.Thu).filter(Boolean));
    return days.size;
  }, [classes]);

  return (
    <section className="page-wrap wide result-page">
      <header className="page-heading result-heading">
        <div>
          <h1>Thời khóa biểu của bạn</h1>
          <p>Kiểm tra lần cuối, tải ảnh để lưu, hoặc chia sẻ mã lớp cho bạn bè.</p>
        </div>
        <div className="result-dashboard-summary">
          <div className="stat-pill-card">
            <span className="stat-pill-value">{classes.length}</span>
            <span className="stat-pill-label">Lớp học phần</span>
          </div>
          <div className="stat-pill-card">
            <span className="stat-pill-value">{credits}</span>
            <span className="stat-pill-label">Tổng tín chỉ</span>
          </div>
          <div className="stat-pill-card">
            <span className="stat-pill-value">{uniqueDaysCount}</span>
            <span className="stat-pill-label">Ngày học / tuần</span>
          </div>
        </div>
      </header>

      <PlanSelectorBar />

      <Paper className="surface-card class-source-card">
        <div className="class-source-copy">
          <div>
            <Typography fontWeight={800}>Danh sách lớp dùng để xếp lịch</Typography>
            <Typography variant="body2" color="text.secondary">
              {isManualMode ? 'Đang dùng danh sách mã lớp nhập thủ công hoặc từ bạn bè chia sẻ.' : 'Đang dùng các lớp bạn đã chọn ở bước 2. Bấm "Chia sẻ mã lớp" để gửi cho bạn bè.'}
            </Typography>
          </div>
        </div>
        <DanhSachLopInput />
      </Paper>

      {classes.length ? (
        <Paper className="surface-card timetable-card">
          <div className="timetable-card-header">
            <div className="timetable-card-title">
              <strong>Bảng thời khóa biểu tuần</strong>
              <span>Hiển thị tất cả các tiết học trong tuần</span>
            </div>
          </div>
          <ThoiKhoaBieuTable />
        </Paper>
      ) : (
        <Alert severity="warning" className="empty-result-alert">
          Chưa có mã lớp nào khớp dữ liệu. Hãy chọn lớp ở bước 2 hoặc nhập lại mã lớp thủ công.
        </Alert>
      )}
    </section>
  );
}

export default Index;

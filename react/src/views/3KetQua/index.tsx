import AutoAwesomeOutlinedIcon from '@mui/icons-material/AutoAwesomeOutlined';
import Alert from '@mui/material/Alert';
import Chip from '@mui/material/Chip';
import Paper from '@mui/material/Paper';
import Typography from '@mui/material/Typography';
import ThoiKhoaBieuTable from '../components/ThoiKhoaBieuTable';
import { selectIsChiVeTkb, selectSelectedClassesBuoc3, selectTongSoTcBuoc3, useTkbStore } from '../../zus';
import DanhSachLopInput from './DanhSachLopInput';

function Index() {
  const isManualMode = useTkbStore(selectIsChiVeTkb);
  const classes = useTkbStore(selectSelectedClassesBuoc3);
  const credits = useTkbStore(selectTongSoTcBuoc3);

  return (
    <section className="page-wrap wide result-page">
      <header className="page-heading result-heading">
        <div>
          <h1>Thời khóa biểu của bạn</h1>
          <p>Kiểm tra lần cuối, sau đó tải ảnh hoặc sao chép để lưu và chia sẻ.</p>
        </div>
        <div className="result-stats">
          <Chip label={`${classes.length} lớp`} color="primary" />
          <Chip label={`${credits} tín chỉ`} variant="outlined" />
        </div>
      </header>

      <Paper className="surface-card class-source-card">
        <div className="class-source-copy">
          <AutoAwesomeOutlinedIcon color="primary" />
          <div>
            <Typography fontWeight={800}>Danh sách lớp dùng để xếp lịch</Typography>
            <Typography variant="body2" color="text.secondary">
              {isManualMode ? 'Đang dùng danh sách mã lớp nhập thủ công.' : 'Đang dùng các lớp bạn đã chọn ở bước 2.'}
            </Typography>
          </div>
        </div>
        <DanhSachLopInput />
      </Paper>

      {classes.length ? (
        <Paper className="surface-card timetable-card">
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

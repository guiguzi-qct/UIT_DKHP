import Alert from '@mui/material/Alert';
import Paper from '@mui/material/Paper';
import Typography from '@mui/material/Typography';
import ThoiKhoaBieuTable from '../components/ThoiKhoaBieuTable';
import PlanSelectorBar from '../components/PlanSelectorBar';
import { selectIsChiVeTkb, selectSelectedClassesBuoc3, useTkbStore } from '../../zus';
import DanhSachLopInput from './DanhSachLopInput';

function Index() {
  const isManualMode = useTkbStore(selectIsChiVeTkb);
  const classes = useTkbStore(selectSelectedClassesBuoc3);

  return (
    <section className="page-wrap wide result-page">
      <PlanSelectorBar />

      <Paper className="surface-card class-source-card">
        <DanhSachLopInput
          header={
            <div className="class-source-copy">
              <Typography fontWeight={800}>Danh sách lớp dùng để xếp lịch</Typography>
              <Typography variant="body2" color="text.secondary">
                {isManualMode
                  ? 'Đang dùng danh sách mã lớp nhập thủ công hoặc từ bạn bè chia sẻ.'
                  : 'Đang dùng các lớp bạn đã chọn ở bước 2. Bấm "Chia sẻ mã lớp" để gửi cho bạn bè.'}
              </Typography>
            </div>
          }
        />
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

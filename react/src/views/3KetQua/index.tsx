import Alert from '@mui/material/Alert';
import Paper from '@mui/material/Paper';
import Typography from '@mui/material/Typography';
import ThoiKhoaBieuTable from '../components/ThoiKhoaBieuTable';
import PlanSelectorBar from '../components/PlanSelectorBar';
import { selectSelectedClassesBuoc3, useTkbStore } from '../../zus';
import { calcTongSoTC } from '../../utils';
import DanhSachLopInput from './DanhSachLopInput';

function Index() {
  const classes = useTkbStore(selectSelectedClassesBuoc3);
  const classCount = classes.length;
  const tcCount = calcTongSoTC(classes);

  return (
    <section className="page-wrap wide result-page">
      <PlanSelectorBar />

      <Paper className="surface-card class-source-card">
        <DanhSachLopInput
          header={
            <div className="class-source-header-left">
              <Typography fontWeight={800} style={{ fontSize: '22px', color: '#0E2128', letterSpacing: '-0.02em' }}>
                Danh sách mã lớp
              </Typography>
              <div className="stat-pill-group">
                <div className="stat-pill stat-pill-solid">
                  <strong className="stat-pill-num">{classCount}</strong>
                  <span className="stat-pill-txt">lớp</span>
                </div>
                <div className="stat-pill stat-pill-solid">
                  <strong className="stat-pill-num">{tcCount}</strong>
                  <span className="stat-pill-txt">tín chỉ</span>
                </div>
              </div>
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

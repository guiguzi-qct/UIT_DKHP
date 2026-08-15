import ArrowForwardIcon from '@mui/icons-material/ArrowForward';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Chip from '@mui/material/Chip';
import Paper from '@mui/material/Paper';
import Typography from '@mui/material/Typography';
import { useHistory } from 'react-router-dom';
import { ROUTES } from '../../constants';
import { hasTimetableSlot } from '../../utils';
import { selectDataExcel, useTkbStore } from '../../zus';
import SelectExcelButton from './SelectExcelButton';

function Index() {
  const history = useHistory();
  const dataExcel = useTkbStore(selectDataExcel);
  const setIsChiVeTkb = useTkbStore((s) => s.setIsChiVeTkb);
  const totalClasses = dataExcel?.data.length ?? 0;
  const unscheduledClasses = dataExcel?.data.filter((item) => !hasTimetableSlot(item)).length ?? 0;

  return (
    <section className="page-wrap upload-page">
      <SelectExcelButton />

      {dataExcel && (
        <Paper className="surface-card import-summary">
          <Box>
            <Typography variant="overline" style={{ color: '#0E2128', fontWeight: 800, fontSize: '13px', letterSpacing: '0.05em' }}>Dữ liệu sẵn sàng</Typography>
            <Typography variant="h6">{dataExcel.fileName}</Typography>
            <Box className="summary-chips">
              <Chip label={`${totalClasses} lớp học phần`} color="primary" variant="outlined" />
              {unscheduledClasses > 0 && <Chip label={`${unscheduledClasses} lớp chưa có lịch`} color="warning" variant="outlined" />}
            </Box>
          </Box>
          <Button variant="contained" size="large" endIcon={<ArrowForwardIcon />} onClick={() => history.push(ROUTES._2XepLop.path)}>
            Tiếp tục chọn lớp
          </Button>
        </Paper>
      )}

      <div className="manual-entry-shortcut">
        <span>Hoặc dán mã lớp có sẵn từ bạn bè?</span>
        <Button
          variant="text"
          color="primary"
          endIcon={<ArrowForwardIcon fontSize="small" />}
          onClick={() => {
            setIsChiVeTkb(true);
            history.push(ROUTES._3KetQua.path);
          }}
        >
          Dán mã lớp ngay
        </Button>
      </div>
    </section>
  );
}

export default Index;

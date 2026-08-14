import ArrowForwardIcon from '@mui/icons-material/ArrowForward';
import LockOutlinedIcon from '@mui/icons-material/LockOutlined';
import Alert from '@mui/material/Alert';
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
  const totalClasses = dataExcel?.data.length ?? 0;
  const unscheduledClasses = dataExcel?.data.filter((item) => !hasTimetableSlot(item)).length ?? 0;

  return (
    <section className="page-wrap upload-page">
      <header className="page-heading">
        <h1>Bắt đầu với file thời khóa biểu</h1>
        <p>guiguzi đọc file ngay trên trình duyệt, sau đó giúp bạn tìm lớp, tránh trùng lịch và xem kết quả trực quan.</p>
      </header>

      <SelectExcelButton />

      {dataExcel && (
        <Paper className="surface-card import-summary">
          <Box>
            <Typography variant="overline" color="text.secondary">Dữ liệu sẵn sàng</Typography>
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

      <Alert className="privacy-alert" icon={<LockOutlinedIcon />} severity="info">
        File và danh sách lớp chỉ được xử lý, lưu trên trình duyệt của bạn. Lớp chưa có THỨ hoặc TIẾT vẫn chọn được nhưng không đưa vào lưới lịch.
      </Alert>
    </section>
  );
}

export default Index;

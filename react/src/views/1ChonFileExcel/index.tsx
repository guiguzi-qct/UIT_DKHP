import ArrowForwardIcon from '@mui/icons-material/ArrowForward';
import EditOutlinedIcon from '@mui/icons-material/EditOutlined';
import LockOutlinedIcon from '@mui/icons-material/LockOutlined';
import UploadFileOutlinedIcon from '@mui/icons-material/UploadFileOutlined';
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
  const setIsChiVeTkb = useTkbStore((s) => s.setIsChiVeTkb);
  const totalClasses = dataExcel?.data.length ?? 0;
  const unscheduledClasses = dataExcel?.data.filter((item) => !hasTimetableSlot(item)).length ?? 0;

  return (
    <section className="page-wrap upload-page">
      <header className="page-heading">
        <h1>Bắt đầu với thời khóa biểu UIT</h1>
        <p>UIT no Jikan xử lý dữ liệu trực tiếp trên trình duyệt, giúp bạn tìm lớp, xếp lịch không lo trùng và chia sẻ mã lớp dễ dàng.</p>
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

      <div className="step1-guide-grid">
        <Paper className="surface-card guide-card">
          <div className="guide-card-header">
            <span className="guide-card-badge primary">Cách 1</span>
            <UploadFileOutlinedIcon color="primary" />
          </div>
          <Typography fontWeight={700} variant="h6">Tải file Excel từ trường (ĐKHP UIT)</Typography>
          <Typography variant="body2" color="text.secondary">
            Tải file <strong>.xlsx</strong> thời khóa biểu từ trang ĐKHP của trường UIT. Tất cả lớp học phần sẽ được đọc để bạn chọn và xem trực quan ở Bước 2.
          </Typography>
        </Paper>

        <Paper className="surface-card guide-card">
          <div className="guide-card-header">
            <span className="guide-card-badge secondary">Cách 2</span>
            <EditOutlinedIcon color="action" />
          </div>
          <Typography fontWeight={700} variant="h6">Tự nhập / Dán mã lớp từ bạn bè</Typography>
          <Typography variant="body2" color="text.secondary">
            Phù hợp khi tạo lịch mới bằng danh sách mã lớp có sẵn hoặc bạn bè gửi cho. Bạn có thể dán danh sách mã lớp và chỉnh sửa bất kỳ lúc nào.
          </Typography>
          <Button
            variant="outlined"
            size="small"
            startIcon={<EditOutlinedIcon />}
            onClick={() => {
              setIsChiVeTkb(true);
              history.push(ROUTES._3KetQua.path);
            }}
            className="guide-card-action"
          >
            Dán / Nhập mã lớp ngay
          </Button>
        </Paper>
      </div>

      <Alert className="privacy-alert" icon={<LockOutlinedIcon />} severity="info">
        File và danh sách lớp chỉ được xử lý, lưu trên trình duyệt của bạn. Lớp chưa có THỨ hoặc TIẾT vẫn chọn được nhưng không đưa vào lưới lịch.
      </Alert>
    </section>
  );
}

export default Index;

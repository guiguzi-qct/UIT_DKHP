import UploadFileOutlinedIcon from '@mui/icons-material/UploadFileOutlined';
import Button from '@mui/material/Button';
import Paper from '@mui/material/Paper';
import Typography from '@mui/material/Typography';
import { Link, useLocation } from 'react-router-dom';
import { ROUTES } from '../../constants';

function NeedStep1Warning() {
  const location = useLocation();

  return (
    <Paper className="surface-card need-file-card">
      <span className="need-file-icon"><UploadFileOutlinedIcon /></span>
      <Typography variant="h5">Bạn chưa chọn file thời khóa biểu</Typography>
      <Typography color="text.secondary">Hãy nhập dữ liệu ở bước đầu tiên trước khi chọn lớp hoặc xem kết quả.</Typography>
      <Button component={Link} variant="contained" to={ROUTES._1ChonFileExcel.path + location.search}>
        Chọn file Excel
      </Button>
    </Paper>
  );
}

export default NeedStep1Warning;

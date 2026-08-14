import { Alert, AlertProps } from '@mui/material';
import { selectDataExcel, useTkbStore } from '../../zus';
import SelectExcelButton from './SelectExcelButton';
import { getLastUpdateString } from './utils';

function MyAlert({ children, color, ...otherProps }: AlertProps) {
  const dataExcel = useTkbStore(selectDataExcel);
  const lastUpdateString = getLastUpdateString(dataExcel);
  const finalColor = color ?? (lastUpdateString ? 'success' : 'info');
  return (
    <Alert
      severity="info"
      color={finalColor}
      style={{ fontWeight: 'bold', padding: '5px 10px', marginBottom: 12 }}
      variant="outlined"
      {...otherProps}
    >
      {children}
    </Alert>
  );
}

function Index() {
  return (
    <div style={{ maxWidth: 1500 }}>
      <SelectExcelButton />
      <MyAlert className="animated flash">
        Chọn file Excel thời khóa biểu, sau đó sang bước 2 để lọc và chọn lớp.
      </MyAlert>
      <MyAlert>
        Lớp chưa có THỨ hoặc TIẾT vẫn được giữ trong danh sách nhưng sẽ không được xếp vào lưới thời khóa biểu.
      </MyAlert>
    </div>
  );
}

export default Index;

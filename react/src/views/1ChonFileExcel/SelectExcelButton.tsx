import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline';
import CloudUploadOutlinedIcon from '@mui/icons-material/CloudUploadOutlined';
import InsertDriveFileOutlinedIcon from '@mui/icons-material/InsertDriveFileOutlined';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Paper from '@mui/material/Paper';
import Typography from '@mui/material/Typography';
import { enqueueSnackbar } from 'notistack';
import React, { ChangeEventHandler } from 'react';
import XLSX from 'xlsx';
import { selectDataExcel, useTkbStore } from '../../zus';
import { arrayToTkbObject, sheetJSFT, toDateTimeString } from './utils';

function SelectExcelButton() {
  const dataExcel = useTkbStore(selectDataExcel);
  const setDataExcel = useTkbStore((s) => s.setDataExcel);
  const inputRef = React.useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = React.useState(false);

  const readFile = React.useCallback(
    (file: File) => {
      const reader = new FileReader();
      const readAsBinary = !!reader.readAsBinaryString;

      reader.onerror = () => enqueueSnackbar('Không thể đọc file. Vui lòng thử lại.', { variant: 'error' });
      reader.onload = (event) => {
        try {
          const isNumericSTT = (val: unknown): boolean => {
            if (val == null) return false;
            const str = String(val).trim();
            return str !== '' && !isNaN(Number(str)) && Number(str) > 0;
          };

          const workbook = XLSX.read(event?.target?.result, { type: readAsBinary ? 'binary' : 'array' });
          const dataInArray = workbook.SheetNames.slice(0, 2)
            .flatMap((sheetName) => XLSX.utils.sheet_to_json<any[][]>(workbook.Sheets[sheetName], { header: 1 }))
            .filter((row) => Array.isArray(row) && row.length > 2 && isNumericSTT(row[0]) && Boolean(row[1] || row[2]));

          if (!dataInArray.length) throw new Error('invalid-format');

          const now = new Date();
          setDataExcel({
            data: dataInArray.map((row) => arrayToTkbObject(row)),
            fileName: file.name,
            lastUpdateTimestamp: now.getTime(),
            lastUpdate: toDateTimeString(now),
          });
          enqueueSnackbar(`Đã đọc ${dataInArray.length} lớp từ ${file.name}`, { variant: 'success' });
        } catch {
          enqueueSnackbar('File chưa đúng định dạng thời khóa biểu của trường.', { variant: 'error' });
        }
      };

      if (readAsBinary) reader.readAsBinaryString(file);
      else reader.readAsArrayBuffer(file);
    },
    [setDataExcel],
  );

  const handleUpload: ChangeEventHandler<HTMLInputElement> = (event) => {
    const file = event.target.files?.[0];
    if (file) readFile(file);
    event.target.value = '';
  };

  return (
    <Paper
      className={`surface-card upload-dropzone ${isDragging ? 'dragging' : ''}`}
      onDragEnter={(event) => { event.preventDefault(); setIsDragging(true); }}
      onDragOver={(event) => event.preventDefault()}
      onDragLeave={(event) => { event.preventDefault(); setIsDragging(false); }}
      onDrop={(event) => {
        event.preventDefault();
        setIsDragging(false);
        const file = event.dataTransfer.files?.[0];
        if (file) readFile(file);
      }}
    >
      <Box className="upload-icon"><CloudUploadOutlinedIcon /></Box>
      <Typography variant="h5" style={{ color: '#0E2128', fontWeight: 800 }}>Kéo thả file vào đây</Typography>
      <Typography style={{ color: '#0E2128', fontWeight: 700 }}>Hoặc chọn file Excel thời khóa biểu từ máy của bạn</Typography>
      <Button variant="contained" size="large" onClick={() => inputRef.current?.click()} startIcon={<InsertDriveFileOutlinedIcon />}>
        {dataExcel ? 'Chọn file khác' : 'Chọn file Excel'}
      </Button>
      <input ref={inputRef} type="file" hidden accept={sheetJSFT} onChange={handleUpload} />
      <Typography className="upload-format" variant="caption" style={{ color: '#0E2128', fontWeight: 800 }}>Hỗ trợ .xlsx, .xls và .csv</Typography>
      {dataExcel && (
        <Box className="current-file">
          <CheckCircleOutlineIcon color="success" />
          <span><strong>{dataExcel.fileName}</strong><small>Đã tải thành công</small></span>
        </Box>
      )}
    </Paper>
  );
}

export default SelectExcelButton;

import ShareOutlinedIcon from '@mui/icons-material/ShareOutlined';
import EditOutlinedIcon from '@mui/icons-material/EditOutlined';
import SaveOutlinedIcon from '@mui/icons-material/SaveOutlined';
import Button from '@mui/material/Button';
import TextField from '@mui/material/TextField';
import { enqueueSnackbar } from 'notistack';
import { useMemo, useState } from 'react';
import { useHistory } from 'react-router-dom';
import { ROUTES } from '../../constants';
import { extractListMaLop, parseListMaLop } from '../../utils';
import {
  selectFinalDataTkb,
  selectIsChiVeTkb,
  selectPhanLoaiHocTrenTruong,
  selectTextareaChiVeTkb,
  useTkbStore,
} from '../../zus';

const copyText = async (value: string) => {
  if (navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(value);
    return;
  }

  const textarea = document.createElement('textarea');
  textarea.value = value;
  textarea.style.position = 'fixed';
  textarea.style.opacity = '0';
  document.body.appendChild(textarea);
  textarea.select();
  const copied = document.execCommand('copy');
  textarea.remove();
  if (!copied) throw new Error('Không thể sao chép mã lớp');
};

export default function DanhSachLopInput() {
  const history = useHistory();
  const [isEditing, setIsEditing] = useState(false);
  const [draft, setDraft] = useState('');
  const setIsChiVeTkb = useTkbStore((state) => state.setIsChiVeTkb);
  const setTextareChiVeTkb = useTkbStore((s) => s.setTextareChiVeTkb);
  const cacLop = useTkbStore(selectPhanLoaiHocTrenTruong);
  const finalDataTkb = useTkbStore(selectFinalDataTkb);
  const listMaLop = useMemo(() => extractListMaLop(cacLop.flat()), [cacLop]);
  const isChiVeTkb = useTkbStore(selectIsChiVeTkb);
  const textareaChiVeTkb = useTkbStore(selectTextareaChiVeTkb);

  const handlePaste = (event: React.ClipboardEvent<HTMLDivElement>) => {
    if (!isEditing) {
      const pastedText = event.clipboardData.getData('text').toUpperCase();
      if (pastedText.trim()) {
        setDraft(pastedText);
        setIsEditing(true);
        event.preventDefault();
      }
    }
  };

  const storedValue = isChiVeTkb ? textareaChiVeTkb : listMaLop.join(',');
  const value = isEditing ? draft : storedValue;

  const draftCodes = useMemo(() => parseListMaLop(draft), [draft]);
  const availableCodes = useMemo(
    () => new Set(finalDataTkb.map((item) => String(item.MaLop).toUpperCase())),
    [finalDataTkb],
  );
  const invalidCodes = isEditing ? draftCodes.filter((code) => !availableCodes.has(code)) : [];

  const startEditing = () => {
    setDraft(storedValue);
    setIsEditing(true);
  };

  const cancelEditing = () => {
    setDraft('');
    setIsEditing(false);
  };

  const applyCodes = () => {
    const normalizedValue = draftCodes.join(',');
    setTextareChiVeTkb(normalizedValue);
    setIsChiVeTkb(true);
    if (window.location.search.includes('self_selected')) history.replace(ROUTES._3KetQua.path);
    setIsEditing(false);

    if (invalidCodes.length) {
      enqueueSnackbar(`Đã áp dụng; không tìm thấy ${invalidCodes.length} mã lớp.`, { variant: 'warning' });
    } else {
      enqueueSnackbar(`Đã áp dụng ${draftCodes.length} mã lớp.`, { variant: 'success' });
    }
  };

  const copyCodes = async () => {
    const codes = parseListMaLop(isEditing ? draft : storedValue);
    if (!codes.length) {
      enqueueSnackbar('Chưa có mã lớp để sao chép.', { variant: 'warning' });
      return;
    }

    try {
      await copyText(codes.join(','));
      enqueueSnackbar(`Đã sao chép ${codes.length} mã lớp.`, { variant: 'success' });
    } catch (error) {
      console.error(error);
      enqueueSnackbar('Không thể sao chép tự động. Hãy chọn và sao chép nội dung trong ô.', { variant: 'error' });
    }
  };

  return (
    <div className="class-code-editor">
      <div className="class-code-actions">
        {isEditing ? (
          <>
            <Button color="inherit" onClick={cancelEditing}>
              Hủy
            </Button>
            <Button variant="contained" startIcon={<SaveOutlinedIcon />} onClick={applyCodes}>
              Áp dụng
            </Button>
          </>
        ) : (
          <Button variant="outlined" startIcon={<EditOutlinedIcon />} onClick={startEditing}>
            Chỉnh sửa
          </Button>
        )}
        <Button variant="outlined" startIcon={<ShareOutlinedIcon />} onClick={copyCodes}>
          Chia sẻ mã lớp
        </Button>
      </div>
      <TextField
        label="Danh sách mã lớp"
        fullWidth
        size="small"
        multiline
        inputProps={{ readOnly: !isEditing, style: { resize: 'vertical' } }}
        rows={2}
        variant="outlined"
        placeholder="Dán danh sách mã lớp, ví dụ: IT001.M11, CS112.L21"
        onChange={(event) => setDraft(event.target.value.toUpperCase())}
        onPaste={handlePaste}
        value={value}
        error={invalidCodes.length > 0}
        helperText={
          isEditing
            ? invalidCodes.length
              ? `Không tìm thấy các mã lớp: ${invalidCodes.join(', ')}`
              : 'Dán mã lớp và nhấn Áp dụng. Các mã có thể cách nhau bằng dấu phẩy, khoảng trắng hoặc xuống dòng.'
            : `${listMaLop.length} mã lớp đang được dùng. Bạn có thể dán danh sách mới hoặc bấm Chỉnh sửa để thay đổi.`
        }
      />
    </div>
  );
}

import ContentCopyOutlinedIcon from '@mui/icons-material/ContentCopyOutlined';
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

export default function DanhSachLopInput({ header }: { header?: React.ReactNode }) {
  const history = useHistory();
  const [isEditing, setIsEditing] = useState(false);
  const [draft, setDraft] = useState('');
  const setIsChiVeTkb = useTkbStore((state) => state.setIsChiVeTkb);
  const setTextareChiVeTkb = useTkbStore((s) => s.setTextareChiVeTkb);
  const setSelectedClasses = useTkbStore((s) => s.setSelectedClasses);
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
    const draftSet = new Set(draftCodes);
    const matchedClasses = finalDataTkb.filter((it) => draftSet.has(String(it.MaLop).toUpperCase()));
    setSelectedClasses(matchedClasses);
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

  const copyScript = async () => {
    const codes = parseListMaLop(isEditing ? draft : storedValue);
    if (!codes.length) {
      enqueueSnackbar('Chưa có mã lớp để tạo script.', { variant: 'warning' });
      return;
    }

    const scriptText = `(() => {
  const t0 = performance.now();

  const RAW_CODES = \\\`
${codes.join('\n')}
  \\\`;

  const norm = (s) =>
    String(s ?? "")
      .replace(/[\\\\s\\\\u00A0]+/g, " ")
      .trim()
      .toUpperCase();

  const targets = new Set(
    RAW_CODES.split(/[\\\\s,;]+/)
      .map(norm)
      .filter(Boolean)
  );

  if (!targets.size) {
    console.log("Không có mã lớp.");
    return;
  }

  let table;
  let colIdx = -1;
  let startRow = 0;

  outer:
  for (const t of document.querySelectorAll("table")) {
    for (let r = 0; r < Math.min(t.rows.length, 5); r++) {
      for (let c = 0; c < t.rows[r].cells.length; c++) {
        const text = norm(t.rows[r].cells[c].textContent);

        if (text === "MÃ LỚP" || text === "MA LOP") {
          table = t;
          colIdx = c;
          startRow = r + 1;
          break outer;
        }
      }
    }
  }

  if (!table) {
    console.log('Không tìm thấy cột "Mã lớp".');
    return;
  }

  const found = new Set();
  const unavailableCodes = [];

  let selected = 0;

  for (let i = startRow; i < table.rows.length; i++) {
    const row = table.rows[i];

    if (row.cells.length <= colIdx) continue;

    const code = norm(row.cells[colIdx].textContent);

    if (!targets.has(code)) continue;

    found.add(code);

    const cb = row.querySelector('input[type="checkbox"]');

    if (!cb || cb.disabled) {
      unavailableCodes.push(code);
    } else if (!cb.checked) {
      cb.click();
      selected++;
    }

    if (found.size === targets.size) break;
  }

  const missingCodes = [...targets].filter(
    (code) => !found.has(code)
  );

  const ms = (performance.now() - t0).toFixed(2);

  const ok =
    unavailableCodes.length === 0 &&
    missingCodes.length === 0;

  console.log(
    \\\`%c\\\${ok ? "HOÀN TẤT" : "CÓ VẤN ĐỀ"} %c• \\\${ms}ms\\\`,
    \\\`color:\\\${ok ? "#16a34a" : "#d97706"};font-weight:700;font-size:13px\\\`,
    "color:#64748b;font-weight:400"
  );

  console.log(\\\`\\\\nĐã chọn          \\\${selected}\\\`);

  if (unavailableCodes.length) {
    console.log(
      \\\`\\\\nKhông đăng ký được\\\\n\\\${unavailableCodes.join("\\\\n")}\\\`
    );
  }

  if (missingCodes.length) {
    console.log(
      \\\`\\\\nKhông tìm thấy\\\\n\\\${missingCodes.join("\\\\n")}\\\`
    );
  }
})();`;

    try {
      await copyText(scriptText);
      enqueueSnackbar(`Đã sao chép Script ĐKHP cho ${codes.length} mã lớp. Dán vào Console F12 để chạy!`, {
        variant: 'success',
      });
    } catch (error) {
      console.error(error);
      enqueueSnackbar('Không thể sao chép Script.', { variant: 'error' });
    }
  };

  return (
    <div className="class-code-editor">
      <div className="class-source-header">
        {header}
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
          <Button
            variant="contained"
            className="copy-script-btn"
            startIcon={<ContentCopyOutlinedIcon />}
            onClick={copyScript}
          >
            Copy Tất Cả Mã Lớp
          </Button>
        </div>
      </div>
      <TextField
        label="Danh sách mã lớp"
        InputLabelProps={{ shrink: true }}
        fullWidth
        size="small"
        multiline
        minRows={1}
        maxRows={4}
        inputProps={{ readOnly: !isEditing, style: { resize: 'vertical' } }}
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

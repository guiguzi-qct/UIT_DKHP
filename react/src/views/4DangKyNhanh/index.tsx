import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import CheckIcon from '@mui/icons-material/Check';
import FlashOnIcon from '@mui/icons-material/FlashOn';
import CodeIcon from '@mui/icons-material/Code';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import FormatListBulletedIcon from '@mui/icons-material/FormatListBulleted';
import HelpOutlineIcon from '@mui/icons-material/HelpOutline';
import SwapHorizIcon from '@mui/icons-material/SwapHoriz';
import RotateLeftIcon from '@mui/icons-material/RotateLeft';
import KeyboardArrowDownIcon from '@mui/icons-material/KeyboardArrowDown';
import KeyboardArrowUpIcon from '@mui/icons-material/KeyboardArrowUp';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Card from '@mui/material/Card';
import Chip from '@mui/material/Chip';
import MenuItem from '@mui/material/MenuItem';
import Select from '@mui/material/Select';
import Tooltip from '@mui/material/Tooltip';
import Typography from '@mui/material/Typography';
import FormControlLabel from '@mui/material/FormControlLabel';
import Switch from '@mui/material/Switch';
import { useSnackbar } from 'notistack';
import React, { useEffect, useMemo, useState } from 'react';
import { ClassModel } from '../../types';
import { calcTongSoTC, getDanhSachTiet, hasOverlapSchedule, hasTimetableSlot, isSameAgGridRowId } from '../../utils';
import { selectActivePlanId, selectFinalDataTkb, selectPlans, useTkbStore } from '../../zus';
import './index.css';

const formatTiet = (tiet: string) =>
  getDanhSachTiet(tiet)
    .map((value) => (value === '0' ? '10' : value))
    .join(', ');

const formatSchedule = (candidate: ClassModel) => {
  if (!hasTimetableSlot(candidate)) return 'Chưa có lịch cố định';
  return `Thứ ${candidate.Thu}, tiết ${formatTiet(candidate.Tiet)}`;
};

export default function DangKyNhanh() {
  const { enqueueSnackbar } = useSnackbar();
  const allData = useTkbStore(selectFinalDataTkb);
  const plans = useTkbStore(selectPlans);
  const activePlanId = useTkbStore(selectActivePlanId);
  const setActivePlanId = useTkbStore((s) => s.setActivePlanId);
  const setSelectedClasses = useTkbStore((s) => s.setSelectedClasses);

  const [copiedCode, setCopiedCode] = useState<string | null>(null);
  const [copiedScript, setCopiedScript] = useState(false);
  const [copiedAllCodes, setCopiedAllCodes] = useState(false);
  const [showScriptPreview, setShowScriptPreview] = useState(false);
  const [autoSubmit, setAutoSubmit] = useState<boolean>(false);
  const [selectedFullClassCode, setSelectedFullClassCode] = useState<string>('');
  const [checkedClassCodes, setCheckedClassCodes] = useState<Record<string, boolean>>({});

  const currentPlan = useMemo(() => {
    return plans.find((p) => p.id === activePlanId) || plans[0];
  }, [plans, activePlanId]);

  const selectedClasses = useMemo(() => {
    return currentPlan?.selectedClasses || [];
  }, [currentPlan]);
  const classCount = selectedClasses.length;
  const totalTc = useMemo(() => calcTongSoTC(selectedClasses), [selectedClasses]);

  const checkedCount = useMemo(() => {
    return selectedClasses.filter((c) => Boolean(checkedClassCodes[c.MaLop?.trim() || ''])).length;
  }, [selectedClasses, checkedClassCodes]);

  const sortedClasses = useMemo(() => {
    return [...selectedClasses].sort((a, b) => {
      const codeA = a.MaLop?.trim() || '';
      const codeB = b.MaLop?.trim() || '';
      const isCheckedA = Boolean(checkedClassCodes[codeA]);
      const isCheckedB = Boolean(checkedClassCodes[codeB]);
      return Number(isCheckedA) - Number(isCheckedB);
    });
  }, [selectedClasses, checkedClassCodes]);

  const rawCodesString = useMemo(() => {
    return selectedClasses.map((c) => c.MaLop?.trim()).filter(Boolean).join('\n');
  }, [selectedClasses]);

  const scriptCode = useMemo(() => {
    const codesIndent = selectedClasses
      .map((c) => c.MaLop?.trim())
      .filter(Boolean)
      .join('\n');
    const bt = '`';

    const autoSubmitSnippet = autoSubmit
      ? `  // Có ít nhất 1 mã tìm thấy -> bấm nút đăng ký
  if (remaining.size < targets.size) {
    const registerBtn = [...document.querySelectorAll("button, input[type='button'], input[type='submit']")]
      .find(btn => {
        if (btn.disabled) return false;
        const txt = norm(btn.textContent || btn.value || "");
        return (
          /^ĐĂNG KÝ\\s+\\d+\\s+LỚP/i.test(txt) ||
          txt.includes("ĐĂNG KÝ") ||
          txt.includes("DANG KY")
        );
      });

    registerBtn?.click();
  }`
      : `  // Tự động bấm Đăng ký đang TẮT`;

    return `(() => {
  const RAW_CODES = ${bt}
${codesIndent}
  ${bt};

  const norm = s =>
    String(s ?? "")
      .replace(/[\\s\\u00A0]+/g, " ")
      .trim()
      .toUpperCase();

  const targets = new Set(
    RAW_CODES.split(/[\\s,;]+/).map(norm).filter(Boolean)
  );

  if (!targets.size) return;

  let table;
  let colIdx = -1;
  let startRow = 0;

  outer:
  for (const t of document.querySelectorAll("table")) {
    const rows = t.rows;

    for (let r = 0, n = Math.min(rows.length, 5); r < n; r++) {
      const cells = rows[r].cells;

      for (let c = 0; c < cells.length; c++) {
        const text = norm(cells[c].textContent);

        if (text === "MÃ LỚP" || text === "MA LOP" || text.includes("MÃ LỚP") || text.includes("MA LOP") || text.includes("MÃ LHP")) {
          table = t;
          colIdx = c;
          startRow = r + 1;
          break outer;
        }
      }
    }
  }

  if (!table) return;

  const remaining = new Set(targets);
  const success = [];
  const failed = [];

  const rows = table.rows;

  for (let i = startRow, n = rows.length; i < n && remaining.size; i++) {
    const row = rows[i];
    const cells = row.cells;

    if (cells.length <= colIdx) continue;

    const cellText = norm(cells[colIdx].textContent);
    const code = cellText.split(/[\\s\\u00A0]+/)[0];

    let matchedTarget = null;

    if (remaining.has(code)) {
      matchedTarget = code;
    } else {
      for (const target of remaining) {
        if (cellText === target || cellText.startsWith(target) || code === target) {
          matchedTarget = target;
          break;
        }
      }
    }

    if (!matchedTarget) continue;

    remaining.delete(matchedTarget);

    const cb = row.querySelector('input[type="checkbox"]');

    if (!cb || cb.disabled) {
      failed.push(matchedTarget);
      continue;
    }

    if (!cb.checked) {
      cb.click();
    }

    success.push(matchedTarget);
  }

  // Mã không có trong bảng
  failed.push(...remaining);

${autoSubmitSnippet}

  // Log từng lớp
  for (const code of success) {
    console.log(
      "%c+ Đã đăng ký: " + code,
      "color:#22c55e;font-weight:700"
    );
  }

  for (const code of failed) {
    console.log(
      "%c!!! Ko đăng ký: " + code,
      "color:#ef4444;font-weight:700"
    );
  }
})();`;
  }, [selectedClasses, autoSubmit]);

  const scriptLines = useMemo(() => scriptCode.split('\n'), [scriptCode]);

  const [copiedUnregisterScript, setCopiedUnregisterScript] = useState(false);
  const [showUnregisterPreview, setShowUnregisterPreview] = useState(false);
  const [deleteKeptCodes, setDeleteKeptCodes] = useState<Record<string, boolean>>({});

  useEffect(() => {
    const initial: Record<string, boolean> = {};
    selectedClasses.forEach((c) => {
      const code = c.MaLop?.trim() || '';
      if (code) initial[code] = true;
    });
    setDeleteKeptCodes(initial);
  }, [selectedClasses]);

  const keptCount = useMemo(() => {
    return selectedClasses.filter((c) => Boolean(deleteKeptCodes[c.MaLop?.trim() || ''])).length;
  }, [selectedClasses, deleteKeptCodes]);

  const handleToggleKeptCode = (code: string) => {
    setDeleteKeptCodes((prev) => ({
      ...prev,
      [code]: !prev[code],
    }));
  };

  const handleSelectAllKept = () => {
    const next: Record<string, boolean> = {};
    selectedClasses.forEach((c) => {
      const code = c.MaLop?.trim() || '';
      if (code) next[code] = true;
    });
    setDeleteKeptCodes(next);
  };

  const handleUnselectAllKept = () => {
    setDeleteKeptCodes({});
  };

  const unregisterScriptCode = useMemo(() => {
    const keptList = selectedClasses
      .filter((c) => Boolean(deleteKeptCodes[c.MaLop?.trim() || '']))
      .map((c) => c.MaLop?.trim())
      .filter(Boolean);

    const keepCodesIndent = keptList.length > 0 ? keptList.join('\n  ') : '';
    const bt = '`';

    return `(async () => {
  // ĐỂ TRỐNG = XÓA TOÀN BỘ
  // Nếu nhập mã = GIỮ LẠI các lớp này
  const KEEP_CODES = ${bt}
  ${keepCodesIndent}
  ${bt};

  /*
  Ví dụ giữ lại:

  const KEEP_CODES = ${bt}
  IE104.R11.CNVN
  IE104.R11.CNVN.2
  SE113.R12
  ${bt};
  */

  const norm = s =>
    String(s ?? "")
      .replace(/[\\s\\u00A0]+/g, " ")
      .trim()
      .toUpperCase();

  const keep = new Set(
    KEEP_CODES
      .split(/[\\s,;]+/)
      .map(norm)
      .filter(Boolean)
  );

  const nextFrame = () =>
    new Promise(resolve => requestAnimationFrame(resolve));

  // Nhận diện nút dấu "-"
  const isMinusButton = btn => {
    if (btn.disabled) return false;

    const rect = btn.querySelector("svg rect");
    if (!rect) return false;

    return (
      rect.getAttribute("width") === "20" &&
      rect.getAttribute("height") === "4"
    );
  };

  const getMinusButtons = () =>
    [...document.querySelectorAll('button[type="button"]')]
      .filter(isMinusButton);

  // Tìm mã lớp gần button nhất
  const getCode = btn => {
    let el = btn.parentElement;

    // Đi ngược lên tối đa vài cấp để tìm container của 1 dòng
    for (let depth = 0; el && depth < 8; depth++, el = el.parentElement) {
      const text = norm(el.innerText);

      // Mã lớp dạng IE104.R11.CNVN / IE104.R11.CNVN.2 / SE113.R12...
      const matches = text.match(/\\b[A-Z]{2,}\\d{3}(?:\\.[A-Z0-9]+)+\\b/g);

      if (matches?.length === 1) {
        return matches[0];
      }
    }

    return null;
  };

  // Chụp danh sách lớp hiện tại
  const items = getMinusButtons().map((btn, index) => ({
    index,
    code: getCode(btn)
  }));

  if (!items.length) {
    console.log("Không có lớp để xóa.");
    return;
  }

  /*
   * KEEP_CODES rỗng:
   *   -> xóa tất cả
   *
   * KEEP_CODES có dữ liệu:
   *   -> xóa những lớp KHÔNG nằm trong KEEP_CODES
   */
  const deleteItems = keep.size
    ? items.filter(item => item.code && !keep.has(item.code))
    : items;

  if (!deleteItems.length) {
    console.log("Không có lớp cần xóa.");
    return;
  }

  let selected = 0;
  const failed = [];

  for (const item of deleteItems) {
    // Query lại DOM sau mỗi click để không giữ reference cũ
    const buttons = getMinusButtons();

    let btn;

    if (item.code) {
      btn = buttons.find(b => getCode(b) === item.code);
    } else if (!keep.size) {
      // Chế độ xóa ALL: không cần biết mã lớp
      btn = buttons[item.index];
    }

    if (!btn) {
      failed.push(item.code ?? \`Lớp #\${item.index + 1}\`);
      continue;
    }

    btn.click();
    selected++;

    // Cho React cập nhật state
    await nextFrame();
  }

  // Chờ UI cập nhật nút XÓA
  await nextFrame();
  await nextFrame();

  const deleteBtn = [...document.querySelectorAll("button")]
    .find(btn =>
      !btn.disabled &&
      /^X[ÓO]A\\s+\\d+\\s+LỚP/i.test(norm(btn.textContent))
    );

  if (deleteBtn) {
    deleteBtn.click();
  } else {
    console.log(\`Đã chọn \${selected} lớp nhưng không tìm thấy nút XÓA.\`);
  }

  if (failed.length) {
    console.log(
      \`Không chọn xóa được\\n\${failed.join("\\n")}\`
    );
  }
})();`;
  }, [selectedClasses, deleteKeptCodes]);

  const unregisterScriptLines = useMemo(() => unregisterScriptCode.split('\n'), [unregisterScriptCode]);

  // Target full class selected by student
  const targetFullClass = useMemo(() => {
    if (!selectedFullClassCode) return null;
    return selectedClasses.find((c) => c.MaLop === selectedFullClassCode) || null;
  }, [selectedClasses, selectedFullClassCode]);

  // Candidate replacement classes for targetFullClass
  const replacementCandidates = useMemo(() => {
    if (!targetFullClass) return [];
    const remainingClassesInPlan = selectedClasses.filter((c) => !isSameAgGridRowId(c, targetFullClass));

    // Find classes of same MaMH (and same ThucHanh type) from allData
    const candidates = allData.filter((c) => {
      if (c.MaMH !== targetFullClass.MaMH) return false;
      if (isSameAgGridRowId(c, targetFullClass)) return false;
      return Boolean(c.ThucHanh) === Boolean(targetFullClass.ThucHanh);
    });

    return candidates.map((candidate) => {
      const isOverlap = hasOverlapSchedule(remainingClassesInPlan, candidate);
      const overlapClass = isOverlap
        ? remainingClassesInPlan.find((c) => hasOverlapSchedule([c], candidate)) || null
        : null;
      return { candidate, isOverlap, overlapClass };
    }).sort((a, b) => Number(a.isOverlap) - Number(b.isOverlap));
  }, [allData, selectedClasses, targetFullClass]);

  const uncheckedClasses = useMemo(() => {
    return selectedClasses.filter((c) => !checkedClassCodes[c.MaLop?.trim() || '']);
  }, [selectedClasses, checkedClassCodes]);

  const toggleCheckClassCode = (code: string) => {
    setCheckedClassCodes((prev) => {
      const nextState = { ...prev, [code]: !prev[code] };
      // If code is being checked, reset selectedFullClassCode if it matches
      if (nextState[code] && selectedFullClassCode === code) {
        setSelectedFullClassCode('');
      }
      return nextState;
    });
  };

  const handleResetChecklist = () => {
    setCheckedClassCodes({});
    enqueueSnackbar('Đã Reset trạng thái checklist!', { variant: 'info' });
  };

  const handleSwapClass = (oldClass: ClassModel, newClass: ClassModel) => {
    const updated = selectedClasses.map((c) => (isSameAgGridRowId(c, oldClass) ? newClass : c));
    setSelectedClasses(updated);
    setSelectedFullClassCode(newClass.MaLop);
    enqueueSnackbar(`Đã đổi thành công lớp ${oldClass.MaLop} ➔ ${newClass.MaLop}!`, { variant: 'success' });
  };

  const copyToClipboard = (text: string, onSuccess: () => void) => {
    navigator.clipboard.writeText(text).then(() => {
      onSuccess();
    }).catch(() => {
      enqueueSnackbar('Không thể sao chép tự động. Hãy chọn thủ công!', { variant: 'error' });
    });
  };

  const handleCopySingleCode = (code: string) => {
    copyToClipboard(code, () => {
      setCopiedCode(code);
      enqueueSnackbar(`Đã sao chép mã lớp ${code}`, { variant: 'success' });
      setTimeout(() => setCopiedCode(null), 2000);
    });
  };

  const handleCopyAllCodes = () => {
    if (!rawCodesString) return;
    copyToClipboard(rawCodesString, () => {
      setCopiedAllCodes(true);
      enqueueSnackbar(`Đã sao chép toàn bộ ${classCount} mã lớp!`, { variant: 'success' });
      setTimeout(() => setCopiedAllCodes(false), 2000);
    });
  };

  const handleCopyScript = () => {
    if (!scriptCode) return;
    copyToClipboard(scriptCode, () => {
      setCopiedScript(true);
      enqueueSnackbar('Đã sao chép Script Auto-Tick vào bộ nhớ tạm!', { variant: 'success' });
      setTimeout(() => setCopiedScript(false), 2000);
    });
  };

  const handleCopyUnregisterScript = () => {
    if (!unregisterScriptCode) return;
    copyToClipboard(unregisterScriptCode, () => {
      setCopiedUnregisterScript(true);
      enqueueSnackbar('Đã sao chép Script HỦY / XÓA LỚP vào bộ nhớ tạm!', { variant: 'success' });
      setTimeout(() => setCopiedUnregisterScript(false), 2000);
    });
  };

  return (
    <Box className="dang-ky-nhanh-root">
      {/* Main Content Grid */}
      <Box className="dkn-content-grid">
        {/* SECTION 1 (TOP): Single Class Codes Checklist & 1-Click Copy */}
        <Card className="dkn-section-card" elevation={0}>
          <Box className="dkn-section-header">
            <Box className="dkn-section-title-wrap">
              <FormatListBulletedIcon className="dkn-section-icon" />
              <Typography className="dkn-section-title">Checklist mã lớp</Typography>

              <Box className="dkn-plan-switcher">
                <Typography className="dkn-plan-label">Đang chọn Plan:</Typography>
                <Select
                  size="small"
                  value={activePlanId}
                  onChange={(e) => {
                    setActivePlanId(e.target.value);
                    setSelectedFullClassCode('');
                    setCheckedClassCodes({});
                  }}
                  className="dkn-plan-select"
                >
                  {plans.map((p) => (
                    <MenuItem key={p.id} value={p.id}>
                      {p.name} ({p.selectedClasses.length} lớp)
                    </MenuItem>
                  ))}
                </Select>

                <Box className="dkn-stat-pills">
                  <span className="dkn-stat-pill">
                    Đã ĐKMH: <strong>{checkedCount}/{classCount}</strong> lớp
                  </span>
                  <span className="dkn-stat-pill">
                    <strong>{totalTc}</strong> tín chỉ
                  </span>
                </Box>
              </Box>
            </Box>

            <Box className="dkn-section-actions">
              {checkedCount > 0 && (
                <Button
                  variant="outlined"
                  size="small"
                  startIcon={<RotateLeftIcon />}
                  onClick={handleResetChecklist}
                  className="dkn-reset-checklist-btn"
                >
                  Reset
                </Button>
              )}
              <Button
                variant="contained"
                size="small"
                className="dkn-copy-all-btn"
                startIcon={copiedAllCodes ? <CheckIcon /> : <ContentCopyIcon />}
                onClick={handleCopyAllCodes}
                disabled={classCount === 0}
              >
                {copiedAllCodes ? 'Đã sao chép tất cả!' : 'Copy'}
              </Button>
            </Box>
          </Box>

          {classCount === 0 ? (
            <Box className="dkn-empty-state">
              <Typography color="text.secondary">
                Chưa có lớp nào trong <strong>{currentPlan?.name}</strong>. Hãy qua bước <strong>2. Chọn lớp</strong> để xếp thời khóa biểu trước!
              </Typography>
            </Box>
          ) : (
            <Box className="dkn-codes-grid">
              {sortedClasses.map((item) => {
                const code = item.MaLop?.trim() || '';
                const isCopied = copiedCode === code;
                const isChecked = Boolean(checkedClassCodes[code]);

                return (
                  <Box
                    className={`dkn-code-card ${isChecked ? 'is-checked' : ''}`}
                    key={`${code}-${item.Thu}-${item.Tiet}`}
                  >
                    <Box className="dkn-code-info">
                      <Typography className="dkn-code-title">{code}</Typography>
                      <Typography className="dkn-code-sub">{item.TenMH}</Typography>
                      <Box className="dkn-code-chips">
                        <Chip size="small" variant="outlined" label={`${item.SoTc} tín chỉ`} />
                        <Chip
                          size="small"
                          className={item.ThucHanh ? 'chip-thuc-hanh' : 'chip-ly-thuyet'}
                          label={item.ThucHanh ? 'Thực hành' : 'Lý thuyết'}
                        />
                      </Box>
                    </Box>

                    <Box className="dkn-card-actions-right">
                      <Tooltip title={isCopied ? 'Đã copy!' : 'Sao chép mã lớp'}>
                        <Button
                          size="small"
                          variant={isCopied ? 'contained' : 'outlined'}
                          color={isCopied ? 'success' : 'primary'}
                          className="dkn-copy-single-btn"
                          startIcon={isCopied ? <CheckIcon /> : <ContentCopyIcon />}
                          onClick={() => handleCopySingleCode(code)}
                        >
                          {isCopied ? 'Đã chép' : 'Sao chép'}
                        </Button>
                      </Tooltip>

                      <Button
                        size="small"
                        variant={isChecked ? 'contained' : 'outlined'}
                        className={`dkn-toggle-check-btn ${isChecked ? 'is-checked-btn' : ''}`}
                        startIcon={isChecked ? <CheckIcon /> : null}
                        onClick={() => toggleCheckClassCode(code)}
                      >
                        {isChecked ? 'Đã xong' : 'Đã xong'}
                      </Button>
                    </Box>
                  </Box>
                );
              })}
            </Box>
          )}
        </Card>

        {/* SECTION 2 (MIDDLE): Slot Full Backup Class Suggester */}
        <Card className="dkn-section-card" elevation={0}>
          <Box className="dkn-section-header">
            <Box className="dkn-section-title-wrap">
              <SwapHorizIcon className="dkn-section-icon" />
              <Typography className="dkn-section-title">Hỗ trợ xử lý hết slot</Typography>
            </Box>
          </Box>

          <Box className="dkn-full-slot-picker-wrap">
            <Typography className="dkn-full-slot-label">
              Nếu một lớp trong Plan bị hết chỗ (hết slot) khi đăng ký trên web trường, hãy chọn lớp đó dưới đây để hệ thống gợi ý lớp thay thế:
            </Typography>

            <Select
              fullWidth
              size="small"
              value={selectedFullClassCode}
              onChange={(e) => setSelectedFullClassCode(e.target.value)}
              className="dkn-full-class-select"
              displayEmpty
            >
              <MenuItem value="" disabled>
                {uncheckedClasses.length === 0
                  ? `Tất cả các lớp trong ${currentPlan?.name} đã được chọn xong!`
                  : `-- Chọn lớp trong ${currentPlan?.name} bị hết slot --`}
              </MenuItem>
              {uncheckedClasses.map((item) => (
                <MenuItem key={`${item.MaLop}-${item.Thu}-${item.Tiet}`} value={item.MaLop}>
                  {item.MaLop} - {item.TenMH} ({item.ThucHanh ? 'Thực hành' : 'Lý thuyết'})
                </MenuItem>
              ))}
            </Select>
          </Box>

          {selectedFullClassCode && (
            <Box className="dkn-replacements-list">
              <Typography className="dkn-replacements-title">
                Lớp thay thế khả thi cho môn <strong>{targetFullClass?.TenMH}</strong> ({targetFullClass?.MaMH}):
              </Typography>

              {replacementCandidates.length === 0 ? (
                <Box className="dkn-empty-state">
                  <Typography color="text.secondary">
                    Không tìm thấy lớp nào khác cho môn <strong>{targetFullClass?.TenMH}</strong> trong dữ liệu Excel.
                  </Typography>
                </Box>
              ) : (
                <Box className="dkn-replacement-cards-grid">
                  {replacementCandidates.map(({ candidate, isOverlap, overlapClass }) => (
                    <Box
                      key={`${candidate.MaLop}-${candidate.Thu}-${candidate.Tiet}`}
                      className={`dkn-replacement-card ${isOverlap ? 'is-overlap' : 'is-feasible'}`}
                    >
                      <Box className="dkn-rep-main">
                        <Box className="dkn-rep-header">
                          <strong>{candidate.MaLop}</strong>
                          <Chip
                            size="small"
                            className={isOverlap ? 'dkn-chip-overlap' : 'dkn-chip-feasible'}
                            label={isOverlap ? `Trùng lịch (${overlapClass?.MaLop})` : 'Khả thi (Không trùng)'}
                          />
                        </Box>
                        <Typography className="dkn-rep-sub">
                          {candidate.TenGV || 'Chưa có giảng viên'} · {formatSchedule(candidate)}
                        </Typography>
                        <Box className="dkn-rep-chips">
                          <Chip size="small" variant="outlined" label={`${candidate.SoTc} tín chỉ`} />
                          {candidate.PhongHoc && <Chip size="small" variant="outlined" label={candidate.PhongHoc} />}
                        </Box>
                      </Box>

                      <Button
                        variant={isOverlap ? 'outlined' : 'contained'}
                        color={isOverlap ? 'inherit' : 'primary'}
                        size="small"
                        disabled={isOverlap}
                        onClick={() => handleSwapClass(targetFullClass!, candidate)}
                        className="dkn-swap-btn"
                      >
                        {isOverlap ? 'Bị trùng lịch' : 'Đổi sang lớp này'}
                      </Button>
                    </Box>
                  ))}
                </Box>
              )}
            </Box>
          )}
        </Card>

        {/* SECTION 3 (BOTTOM): Auto-Tick Console Script */}
        <Card className="dkn-section-card" elevation={0}>
          <Box className="dkn-section-header">
            <Box className="dkn-section-title-wrap">
              <CodeIcon className="dkn-section-icon" />
              <Typography className="dkn-section-title">Script hỗ trợ nhanh</Typography>
            </Box>

            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, flexWrap: 'wrap' }}>
              <FormControlLabel
                control={
                  <Switch
                    checked={autoSubmit}
                    onChange={(e) => setAutoSubmit(e.target.checked)}
                    size="small"
                    sx={{
                      '& .MuiSwitch-switchBase.Mui-checked': {
                        color: '#0E2128',
                      },
                      '& .MuiSwitch-switchBase.Mui-checked + .MuiSwitch-track': {
                        backgroundColor: '#0E2128',
                        opacity: 0.8,
                      },
                    }}
                  />
                }
                label={
                  <Typography variant="body2" sx={{ fontWeight: 700, fontSize: '0.85rem', color: '#0E2128' }}>
                    Auto ĐKy: <strong>{autoSubmit ? 'BẬT' : 'TẮT'}</strong>
                  </Typography>
                }
                sx={{
                  margin: 0,
                  userSelect: 'none',
                  background: '#ffffff',
                  px: 1.75,
                  py: 0.5,
                  borderRadius: '12px',
                  border: '1.5px solid #0E2128',
                  boxShadow: '0 2px 6px rgba(14, 33, 40, 0.04)',
                  transition: 'all 0.2s ease-in-out',
                }}
              />

              <Button
                variant="contained"
                color="primary"
                size="medium"
                className="dkn-copy-script-btn"
                startIcon={copiedScript ? <CheckIcon /> : <FlashOnIcon />}
                onClick={handleCopyScript}
                disabled={classCount === 0}
              >
                {copiedScript ? 'Đã sao chép Script!' : 'Sao chép Script'}
              </Button>
            </Box>
          </Box>

          {/* User Guide Card */}
          <Box className="dkn-guide-box">
            <Typography className="dkn-guide-header">
              <HelpOutlineIcon className="dkn-guide-icon" /> Hướng dẫn sử dụng 3 bước siêu nhanh:
            </Typography>
            <Box className="dkn-guide-steps-grid">
              <Box className="dkn-guide-step-card">
                <span className="dkn-step-badge">1</span>
                <Box className="dkn-step-body">
                  <strong>Sao chép Script</strong>
                  <span>Bấm nút <code>Sao chép Script</code> ở góc trên.</span>
                </Box>
              </Box>

              <Box className="dkn-guide-step-card">
                <span className="dkn-step-badge">2</span>
                <Box className="dkn-step-body">
                  <strong>Mở F12 Console</strong>
                  <span>Mở trang ĐKMH UIT ➔ Nhấn <code>F12</code> ➔ Chọn tab <strong>Console</strong>.</span>
                </Box>
              </Box>

              <Box className="dkn-guide-step-card">
                <span className="dkn-step-badge">3</span>
                <Box className="dkn-step-body">
                  <strong>Dán &amp; Chạy</strong>
                  <span>Nhấn <code>Ctrl + V</code> ➔ Bấm <code>Enter</code>. Tự động tick <strong>{currentPlan?.name}</strong> trong 0.1s!</span>
                </Box>
              </Box>
            </Box>
          </Box>

          {/* Expandable Script Code Preview */}
          <Box className="dkn-script-toggle-wrap">
            <Button
              variant="outlined"
              size="small"
              onClick={() => setShowScriptPreview(!showScriptPreview)}
              endIcon={showScriptPreview ? <KeyboardArrowUpIcon /> : <KeyboardArrowDownIcon />}
              className="dkn-toggle-code-btn"
            >
              {showScriptPreview ? 'Thu gọn mã Script' : 'Xem chi tiết mã Script'}
            </Button>
          </Box>

          {showScriptPreview && (
            <Box className="dkn-script-preview-container">
              <pre className="dkn-script-preview-code">
                <code>
                  {scriptLines.map((line, idx) => (
                    <div key={`line-${idx}`} className="dkn-code-line">
                      <span className="dkn-line-number">{idx + 1}</span>
                      <span className="dkn-line-content">{line}</span>
                    </div>
                  ))}
                </code>
              </pre>
            </Box>
          )}
        </Card>

        {/* SECTION 4 (BOTTOM-MOST): Bulk Unregister / Delete Classes Console Script */}
        <Card className="dkn-section-card" elevation={0}>
          <Box className="dkn-section-header">
            <Box className="dkn-section-title-wrap">
              <DeleteOutlineIcon className="dkn-section-icon" style={{ color: '#ef4444' }} />
              <Typography className="dkn-section-title">Script hỗ trợ HỦY / XÓA LỚP nhanh</Typography>

              <Box className="dkn-stat-pills" style={{ marginLeft: 16 }}>
                <span className="dkn-stat-pill" style={{ borderColor: '#22c55e', color: '#15803d' }}>
                  Giữ lại: <strong>{keptCount}/{classCount}</strong> lớp
                </span>
                <span className="dkn-stat-pill" style={{ borderColor: '#ef4444', color: '#b91c1c' }}>
                  Xóa trên web: <strong>{classCount - keptCount}</strong> lớp
                </span>
              </Box>
            </Box>

            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, flexWrap: 'wrap' }}>
              <Button
                variant="outlined"
                size="small"
                onClick={handleSelectAllKept}
                style={{ borderColor: '#cbd5e1', color: '#334155' }}
              >
                Giữ tất cả
              </Button>
              <Button
                variant="outlined"
                color="error"
                size="small"
                onClick={handleUnselectAllKept}
              >
                Xóa tất cả (All)
              </Button>

              <Button
                variant="contained"
                color="error"
                size="medium"
                className="dkn-copy-script-btn"
                startIcon={copiedUnregisterScript ? <CheckIcon /> : <FlashOnIcon />}
                onClick={handleCopyUnregisterScript}
                disabled={classCount === 0}
              >
                {copiedUnregisterScript ? 'Đã sao chép Script Hủy Lớp!' : 'Sao chép Script Hủy Lớp'}
              </Button>
            </Box>
          </Box>

          {/* Checklist of classes to KEEP vs DELETE */}
          <Box className="dkn-full-slot-picker-wrap" style={{ marginTop: 12 }}>
            <Typography className="dkn-full-slot-label" style={{ fontSize: '0.9rem', marginBottom: 8 }}>
              Chọn các lớp bạn muốn <strong>GIỮ LẠI</strong> (Các lớp <strong>BỎ TICK</strong> sẽ tự động bị HỦY/XÓA trên web trường):
            </Typography>

            {classCount === 0 ? (
              <Box className="dkn-empty-state">
                <Typography color="text.secondary">
                  Chưa có lớp nào trong <strong>{currentPlan?.name}</strong>.
                </Typography>
              </Box>
            ) : (
              <Box className="dkn-codes-grid">
                {selectedClasses.map((item) => {
                  const code = item.MaLop?.trim() || '';
                  const isKept = Boolean(deleteKeptCodes[code]);

                  return (
                    <Box
                      className={`dkn-code-card ${isKept ? 'is-checked' : 'is-conflict'}`}
                      key={`unreg-card-${code}-${item.Thu}-${item.Tiet}`}
                      onClick={() => handleToggleKeptCode(code)}
                      style={{
                        cursor: 'pointer',
                        borderColor: isKept ? '#22c55e' : '#fca5a5',
                        background: isKept ? '#f0fdf4' : '#fff5f5',
                      }}
                    >
                      <Box className="dkn-card-checkbox">
                        <input
                          type="checkbox"
                          checked={isKept}
                          onChange={() => handleToggleKeptCode(code)}
                          onClick={(e) => e.stopPropagation()}
                        />
                      </Box>
                      <Box className="dkn-card-content">
                        <strong className="dkn-card-code" style={{ color: isKept ? '#15803d' : '#991b1b' }}>
                          {code}
                        </strong>
                        <span className="dkn-card-name" style={{ color: isKept ? '#166534' : '#7f1d1d' }}>
                          {item.TenMH}
                        </span>
                      </Box>
                      <Chip
                        size="small"
                        label={isKept ? 'GIỮ LẠI' : 'XÓA TRÊN WEB'}
                        style={{
                          fontSize: '11px',
                          fontWeight: 800,
                          backgroundColor: isKept ? '#dcfce7' : '#fee2e2',
                          color: isKept ? '#15803d' : '#b91c1c',
                        }}
                      />
                    </Box>
                  );
                })}
              </Box>
            )}
          </Box>

          {/* User Guide Card */}
          <Box className="dkn-guide-box" style={{ background: '#fef2f2', borderColor: '#fca5a5', marginTop: 16 }}>
            <Typography className="dkn-guide-header" style={{ color: '#991b1b' }}>
              <HelpOutlineIcon className="dkn-guide-icon" style={{ color: '#dc2626' }} /> Hướng dẫn hủy / xóa lớp siêu tốc:
            </Typography>
            <Box className="dkn-guide-steps-grid">
              <Box className="dkn-guide-step-card">
                <span className="dkn-step-badge" style={{ background: '#ef4444', color: '#fff' }}>1</span>
                <Box className="dkn-step-body">
                  <strong>Sao chép Script Hủy Lớp</strong>
                  <span>Bấm nút <code>Sao chép Script Hủy Lớp</code> ở góc trên.</span>
                </Box>
              </Box>

              <Box className="dkn-guide-step-card">
                <span className="dkn-step-badge" style={{ background: '#ef4444', color: '#fff' }}>2</span>
                <Box className="dkn-step-body">
                  <strong>Mở F12 Console</strong>
                  <span>Mở trang ĐKMH UIT ➔ Nhấn <code>F12</code> ➔ Chọn tab <strong>Console</strong>.</span>
                </Box>
              </Box>

              <Box className="dkn-guide-step-card">
                <span className="dkn-step-badge" style={{ background: '#ef4444', color: '#fff' }}>3</span>
                <Box className="dkn-step-body">
                  <strong>Dán &amp; Chạy</strong>
                  <span>Nhấn <code>Ctrl + V</code> ➔ Bấm <code>Enter</code>. Tự động bấm dấu <code>-</code> và xác nhận nút <strong>XÓA LỚP</strong>!</span>
                </Box>
              </Box>
            </Box>
          </Box>

          {/* Expandable Script Code Preview */}
          <Box className="dkn-script-toggle-wrap">
            <Button
              variant="outlined"
              size="small"
              onClick={() => setShowUnregisterPreview(!showUnregisterPreview)}
              endIcon={showUnregisterPreview ? <KeyboardArrowUpIcon /> : <KeyboardArrowDownIcon />}
              className="dkn-toggle-code-btn"
            >
              {showUnregisterPreview ? 'Thu gọn mã Script Hủy Lớp' : 'Xem chi tiết mã Script Hủy Lớp'}
            </Button>
          </Box>

          {showUnregisterPreview && (
            <Box className="dkn-script-preview-container">
              <pre className="dkn-script-preview-code">
                <code>
                  {unregisterScriptLines.map((line, idx) => (
                    <div key={`unreg-line-${idx}`} className="dkn-code-line">
                      <span className="dkn-line-number">{idx + 1}</span>
                      <span className="dkn-line-content">{line}</span>
                    </div>
                  ))}
                </code>
              </pre>
            </Box>
          )}
        </Card>
      </Box>
    </Box>
  );
}

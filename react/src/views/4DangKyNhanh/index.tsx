import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import CheckIcon from '@mui/icons-material/Check';
import FlashOnIcon from '@mui/icons-material/FlashOn';
import CodeIcon from '@mui/icons-material/Code';
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
import { useSnackbar } from 'notistack';
import React, { useMemo, useState } from 'react';
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

    return `(() => {
  const t0 = performance.now();

  const RAW_CODES = \`
${codesIndent}
  \`;

  const norm = s =>
    String(s ?? "")
      .replace(/[\\s\\u00A0]+/g, " ")
      .trim()
      .toUpperCase();

  const targets = new Set(
    RAW_CODES.split(/[\\s,;]+/).map(norm).filter(Boolean)
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

  let selected = 0;
  let already = 0;
  let disabled = 0;
  let noCheckbox = 0;

  for (let i = startRow; i < table.rows.length; i++) {
    const row = table.rows[i];

    if (row.cells.length <= colIdx) continue;

    const code = norm(row.cells[colIdx].textContent);

    if (!targets.has(code)) continue;

    found.add(code);

    const cb = row.querySelector('input[type="checkbox"]');

    if (!cb) {
      noCheckbox++;
    } else if (cb.disabled) {
      disabled++;
    } else if (cb.checked) {
      already++;
    } else {
      cb.click();
      selected++;
    }

    if (found.size === targets.size) break;
  }

  const missing = targets.size - found.size;
  const ms = (performance.now() - t0).toFixed(2);

  console.log(
    \`Yêu cầu: \${targets.size} | Tick mới: \${selected} | Đã có: \${already} | Bị khóa: \${disabled} | Không tìm thấy: \${missing} | Không checkbox: \${noCheckbox} | \${ms}ms\`
  );
})();`;
  }, [selectedClasses]);

  const scriptLines = useMemo(() => scriptCode.split('\n'), [scriptCode]);

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
                {copiedAllCodes ? 'Đã sao chép tất cả!' : 'Copy Tất Cả Mã Lớp'}
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
                          color={item.ThucHanh ? 'secondary' : 'primary'}
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
      </Box>
    </Box>
  );
}

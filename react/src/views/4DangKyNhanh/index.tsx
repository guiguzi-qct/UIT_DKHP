import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import CheckIcon from '@mui/icons-material/Check';
import FlashOnIcon from '@mui/icons-material/FlashOn';
import CodeIcon from '@mui/icons-material/Code';
import FormatListBulletedIcon from '@mui/icons-material/FormatListBulleted';
import HelpOutlineIcon from '@mui/icons-material/HelpOutline';
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
import { calcTongSoTC } from '../../utils';
import { selectActivePlanId, selectPlans, useTkbStore } from '../../zus';
import './index.css';

export default function DangKyNhanh() {
  const { enqueueSnackbar } = useSnackbar();
  const plans = useTkbStore(selectPlans);
  const activePlanId = useTkbStore(selectActivePlanId);
  const setActivePlanId = useTkbStore((s) => s.setActivePlanId);

  const [copiedCode, setCopiedCode] = useState<string | null>(null);
  const [copiedScript, setCopiedScript] = useState(false);
  const [copiedAllCodes, setCopiedAllCodes] = useState(false);

  const currentPlan = useMemo(() => {
    return plans.find((p) => p.id === activePlanId) || plans[0];
  }, [plans, activePlanId]);

  const selectedClasses = useMemo(() => {
    return currentPlan?.selectedClasses || [];
  }, [currentPlan]);
  const classCount = selectedClasses.length;
  const totalTc = useMemo(() => calcTongSoTC(selectedClasses), [selectedClasses]);

  const rawCodesString = useMemo(() => {
    return selectedClasses.map((c) => c.MaLop?.trim()).filter(Boolean).join('\n');
  }, [selectedClasses]);

  const scriptCode = useMemo(() => {
    const planName = currentPlan?.name || 'Plan';
    const codesIndent = selectedClasses
      .map((c) => c.MaLop?.trim())
      .filter(Boolean)
      .join('\n');

    return `(() => {
  const START = performance.now();

  // =========================
  // DANH SÁCH MÃ LỚP (${planName})
  // =========================
  const RAW_CODES = \`
${codesIndent}
  \`;

  const normalize = (s) =>
    String(s ?? "")
      .replace(/\\s+/g, " ")
      .trim()
      .toUpperCase();

  // Nhận xuống dòng, dấu phẩy, dấu ; hoặc khoảng trắng
  const wanted = new Set(
    RAW_CODES
      .split(/[\\s,;]+/)
      .map(normalize)
      .filter(Boolean)
  );

  if (!wanted.size) {
    console.error("Guiguzi: Không có mã lớp.");
    return;
  }

  // =========================
  // TÌM ĐÚNG TABLE + CỘT MÃ LỚP
  // =========================
  function detectTable() {
    const tables = [...document.querySelectorAll("table")];

    for (const table of tables) {
      const rows = [...table.rows];

      for (let r = 0; r < Math.min(rows.length, 5); r++) {
        const cells = [...rows[r].cells];

        const codeColumn = cells.findIndex((cell) => {
          const text = normalize(cell.textContent);
          return text === "MÃ LỚP" || text === "MA LOP";
        });

        if (codeColumn !== -1) {
          return {
            table,
            codeColumn,
            headerRowIndex: r,
          };
        }
      }
    }

    return null;
  }

  const detected = detectTable();

  if (!detected) {
    console.error(
      'Guiguzi: Không tìm thấy bảng có cột "Mã lớp". Dừng để tránh chọn nhầm.'
    );
    return;
  }

  const { table, codeColumn, headerRowIndex } = detected;

  // =========================
  // QUÉT + TICK
  // =========================
  const found = new Set();

  const selected = [];
  const already = [];
  const disabled = [];
  const noCheckbox = [];

  const rows = [...table.rows];

  for (let i = headerRowIndex + 1; i < rows.length; i++) {
    const row = rows[i];

    if (!row.cells || row.cells.length <= codeColumn) continue;

    const code = normalize(row.cells[codeColumn].textContent);

    if (!wanted.has(code)) continue;

    found.add(code);

    const checkbox = row.querySelector('input[type="checkbox"]');

    if (!checkbox) {
      noCheckbox.push(code);
      continue;
    }

    if (checkbox.disabled) {
      disabled.push(code);
      continue;
    }

    // Quan trọng: không click lại checkbox đã tick
    if (checkbox.checked) {
      already.push(code);
      continue;
    }

    checkbox.click();
    selected.push(code);

    // Tìm đủ toàn bộ mã thì dừng quét ngay
    if (found.size === wanted.size) break;
  }

  const missing = [...wanted].filter((code) => !found.has(code));

  // =========================
  // KẾT QUẢ
  // =========================
  const result = [];

  selected.forEach((code) =>
    result.push({
      "Mã lớp": code,
      "Trạng thái": "✓ Đã tick",
    })
  );

  already.forEach((code) =>
    result.push({
      "Mã lớp": code,
      "Trạng thái": "○ Đã chọn trước",
    })
  );

  disabled.forEach((code) =>
    result.push({
      "Mã lớp": code,
      "Trạng thái": "⚠ Bị khóa",
    })
  );

  noCheckbox.forEach((code) =>
    result.push({
      "Mã lớp": code,
      "Trạng thái": "⚠ Không có checkbox",
    })
  );

  missing.forEach((code) =>
    result.push({
      "Mã lớp": code,
      "Trạng thái": "✕ Không tìm thấy",
    })
  );

  const elapsed = performance.now() - START;

  console.log(
    \`%c⚡ Guiguzi Quick Select\`,
    "font-weight:bold;font-size:15px"
  );

  console.table(result);

  console.log(
    [
      \`Yêu cầu: \${wanted.size}\`,
      \`Tick mới: \${selected.length}\`,
      \`Đã có: \${already.length}\`,
      \`Bị khóa: \${disabled.length}\`,
      \`Không thấy: \${missing.length}\`,
      \`Thời gian: \${elapsed.toFixed(2)} ms\`,
    ].join(" | ")
  );

  if (missing.length) {
    console.warn("Mã không tìm thấy:", missing.join(", "));
  }

  console.log(
    "Guiguzi chỉ tick checkbox. Hãy kiểm tra lại trước khi bấm Đăng ký."
  );
})();`;
  }, [currentPlan, selectedClasses]);

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
      {/* Header Toolbar */}
      <Card className="dkn-header-card" elevation={0}>
        <Box className="dkn-header-left">
          <Typography className="dkn-header-title">Đăng ký nhanh & Xuất Script</Typography>
          <Typography className="dkn-header-desc">
            Xuất danh sách mã lớp độc lập để copy-paste thủ công hoặc tạo Script Auto-Tick cho trang ĐKMH UIT.
          </Typography>
        </Box>

        <Box className="dkn-plan-switcher">
          <Typography className="dkn-plan-label">Đang chọn Plan:</Typography>
          <Select
            size="small"
            value={activePlanId}
            onChange={(e) => setActivePlanId(e.target.value)}
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
              <strong>{classCount}</strong> lớp
            </span>
            <span className="dkn-stat-pill">
              <strong>{totalTc}</strong> tín chỉ
            </span>
          </Box>
        </Box>
      </Card>

      {/* Main Content Grid */}
      <Box className="dkn-content-grid">
        {/* Section 1: Single Class Codes (Copy 1-Click) */}
        <Card className="dkn-section-card" elevation={0}>
          <Box className="dkn-section-header">
            <Box className="dkn-section-title-wrap">
              <FormatListBulletedIcon className="dkn-section-icon" />
              <Typography className="dkn-section-title">Danh sách mã lớp độc lập</Typography>
            </Box>
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

          {classCount === 0 ? (
            <Box className="dkn-empty-state">
              <Typography color="text.secondary">
                Chưa có lớp nào trong <strong>{currentPlan?.name}</strong>. Hãy qua bước <strong>2. Chọn lớp</strong> để xếp thời khóa biểu trước!
              </Typography>
            </Box>
          ) : (
            <Box className="dkn-codes-grid">
              {selectedClasses.map((item) => {
                const code = item.MaLop?.trim() || '';
                const isCopied = copiedCode === code;
                return (
                  <Box className="dkn-code-card" key={`${code}-${item.Thu}-${item.Tiet}`}>
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
                  </Box>
                );
              })}
            </Box>
          )}
        </Card>

        {/* Section 2: Auto-Tick Console Script Generator */}
        <Card className="dkn-section-card" elevation={0}>
          <Box className="dkn-section-header">
            <Box className="dkn-section-title-wrap">
              <CodeIcon className="dkn-section-icon" />
              <Typography className="dkn-section-title">Script Auto-Tick Checkbox (Guiguzi Quick Select)</Typography>
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
              {copiedScript ? 'Đã Sao Chép Script!' : 'Copy Script Auto-Tick (1-Click)'}
            </Button>
          </Box>

          {/* User Guide Card */}
          <Box className="dkn-guide-box">
            <Typography className="dkn-guide-header">
              <HelpOutlineIcon className="dkn-guide-icon" /> Hướng dẫn sử dụng Script 3 bước siêu nhanh:
            </Typography>
            <ol className="dkn-guide-list">
              <li>
                Bấm nút <strong>"Copy Script Auto-Tick"</strong> ở trên.
              </li>
              <li>
                Mở trang Đăng ký môn học của trường (UIT Portal) ➔ Nhấn phím <code>F12</code> (hoặc Chuột phải ➔ <i>Kiểm tra / Inspect</i>) ➔ Chọn tab <strong>Console</strong>.
              </li>
              <li>
                Nhấn <code>Ctrl + V</code> dán đoạn script vào rồi bấm <code>Enter</code>. Hệ thống sẽ tự động tìm bảng và tick chọn toàn bộ các lớp của <strong>{currentPlan?.name}</strong> trong <strong>0.1 giây</strong>!
              </li>
            </ol>
          </Box>

          {/* Script Code Preview */}
          <Box className="dkn-script-preview-container">
            <Box className="dkn-script-preview-header">
              <span>script-auto-tick.js ({currentPlan?.name})</span>
              <button type="button" onClick={handleCopyScript} disabled={classCount === 0}>
                {copiedScript ? '✓ Đã sao chép' : 'Sao chép mã'}
              </button>
            </Box>
            <pre className="dkn-script-preview-code">
              <code>{scriptCode}</code>
            </pre>
          </Box>
        </Card>
      </Box>
    </Box>
  );
}

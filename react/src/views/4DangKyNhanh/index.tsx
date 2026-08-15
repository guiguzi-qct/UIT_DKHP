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
  const t0 = performance.now();

  // DANH SÁCH MÃ LỚP (${planName})
  const RAW_CODES = \`
${codesIndent}
  \`;

  const norm = (s) => String(s ?? "").replace(/[\\s\\u00A0]+/g, " ").trim().toUpperCase();
  const targets = new Set(RAW_CODES.split(/[\\s,;]+/).map(norm).filter(Boolean));

  if (!targets.size) return console.error("[Guiguzi] Không có mã lớp.");

  let table = null, colIdx = -1, startRow = 0;
  for (const t of document.querySelectorAll("table")) {
    for (let r = 0; r < Math.min(t.rows.length, 5); r++) {
      const idx = [...t.rows[r].cells].findIndex(c => ["MÃ LỚP", "MA LOP"].includes(norm(c.textContent)));
      if (idx !== -1) { table = t; colIdx = idx; startRow = r + 1; break; }
    }
    if (table) break;
  }

  if (!table) return console.error('[Guiguzi] Không tìm thấy cột "Mã lớp".');

  const res = [];
  const found = new Set();

  for (let i = startRow; i < table.rows.length; i++) {
    const row = table.rows[i];
    if (!row.cells || row.cells.length <= colIdx) continue;

    const code = norm(row.cells[colIdx].textContent);
    if (!targets.has(code)) continue;

    found.add(code);
    const cb = row.querySelector('input[type="checkbox"]');

    if (!cb) {
      res.push({ "Mã lớp": code, "Trạng thái": "⚠ Không có checkbox" });
    } else if (cb.disabled) {
      res.push({ "Mã lớp": code, "Trạng thái": "⚠ Bị khóa" });
    } else if (cb.checked) {
      res.push({ "Mã lớp": code, "Trạng thái": "○ Đã chọn trước" });
    } else {
      cb.click();
      cb.dispatchEvent(new Event("change", { bubbles: true }));
      row.style.background = "#e6fffa";
      res.push({ "Mã lớp": code, "Trạng thái": "✓ Đã tick mới" });
    }

    if (found.size === targets.size) break;
  }

  [...targets].forEach(code => {
    if (!found.has(code)) res.push({ "Mã lớp": code, "Trạng thái": "✕ Không tìm thấy" });
  });

  const ms = (performance.now() - t0).toFixed(2);
  console.log("%c⚡ Guiguzi Quick Select", "font-weight:bold;font-size:14px;color:#0e2128");
  console.table(res);

  const newlyTicked = res.filter(r => r["Trạng thái"] === "✓ Đã tick mới").length;
  console.log(\`Yêu cầu: \${targets.size} | Tick mới: \${newlyTicked} | Thời gian: \${ms}ms\`);

  // Hiển thị Banner kết quả trực quan trên trang Web UIT
  const toast = document.createElement("div");
  toast.style.cssText = "position:fixed;bottom:24px;right:24px;z-index:999999;background:#0e2128;color:#fff;padding:12px 20px;border-radius:12px;font-family:sans-serif;font-size:14px;box-shadow:0 4px 20px rgba(0,0,0,0.3);border:1px solid #59899d";
  toast.innerHTML = \`⚡ <b>Guiguzi Auto-Tick:</b> Đã tick mới <b>\${newlyTicked}/\${targets.size}</b> lớp (\${ms}ms)\`;
  document.body.appendChild(toast);
  setTimeout(() => toast.remove(), 4500);
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
              <HelpOutlineIcon className="dkn-guide-icon" /> Hướng dẫn sử dụng 3 bước siêu nhanh:
            </Typography>
            <Box className="dkn-guide-steps-grid">
              <Box className="dkn-guide-step-card">
                <span className="dkn-step-badge">1</span>
                <Box className="dkn-step-body">
                  <strong>Sao chép Script</strong>
                  <span>Bấm nút <code>Copy Script Auto-Tick (1-Click)</code> ở góc trên.</span>
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

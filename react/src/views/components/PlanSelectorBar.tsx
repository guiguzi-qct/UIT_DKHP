import AddIcon from '@mui/icons-material/Add';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import EditIcon from '@mui/icons-material/Edit';
import MoreVertIcon from '@mui/icons-material/MoreVert';
import StarIcon from '@mui/icons-material/Star';
import Button from '@mui/material/Button';
import Chip from '@mui/material/Chip';
import Dialog from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogTitle from '@mui/material/DialogTitle';
import IconButton from '@mui/material/IconButton';
import ListItemIcon from '@mui/material/ListItemIcon';
import ListItemText from '@mui/material/ListItemText';
import Menu from '@mui/material/Menu';
import MenuItem from '@mui/material/MenuItem';
import Paper from '@mui/material/Paper';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import { enqueueSnackbar } from 'notistack';
import React, { useState } from 'react';
import { calcTongSoTC } from '../../utils';
import {
  selectActivePlanId,
  selectPlans,
  useTkbStore,
} from '../../zus';
import './PlanSelectorBar.css';

export default function PlanSelectorBar() {
  const plans = useTkbStore(selectPlans);
  const activePlanId = useTkbStore(selectActivePlanId);
  const setActivePlanId = useTkbStore((s) => s.setActivePlanId);
  const createPlan = useTkbStore((s) => s.createPlan);
  const duplicatePlan = useTkbStore((s) => s.duplicatePlan);
  const renamePlan = useTkbStore((s) => s.renamePlan);
  const deletePlan = useTkbStore((s) => s.deletePlan);

  const [menuAnchor, setMenuAnchor] = useState<HTMLElement | null>(null);
  const [selectedPlanId, setSelectedPlanId] = useState<string | null>(null);

  const [isRenameDialogOpen, setIsRenameDialogOpen] = useState(false);
  const [renameInput, setRenameInput] = useState('');

  const handleOpenMenu = (event: React.MouseEvent<HTMLElement>, planId: string) => {
    event.stopPropagation();
    setSelectedPlanId(planId);
    setMenuAnchor(event.currentTarget);
  };

  const handleCloseMenu = () => {
    setMenuAnchor(null);
  };

  const handleSelectPlan = (id: string) => {
    if (id !== activePlanId) {
      setActivePlanId(id);
      const target = plans.find((p) => p.id === id);
      enqueueSnackbar(`Đã chuyển sang ${target?.name || 'Phương án'}`, { variant: 'info' });
    }
  };

  const handleCreate = () => {
    createPlan();
    enqueueSnackbar('Đã tạo phương án mới', { variant: 'success' });
  };

  const handleDuplicate = () => {
    if (selectedPlanId) {
      duplicatePlan(selectedPlanId);
      const source = plans.find((p) => p.id === selectedPlanId);
      enqueueSnackbar(`Đã nhân bản ${source?.name || 'phương án'}`, { variant: 'success' });
    }
    handleCloseMenu();
  };

  const handleOpenRename = () => {
    const target = plans.find((p) => p.id === selectedPlanId);
    if (target) {
      setRenameInput(target.name);
      setIsRenameDialogOpen(true);
    }
    handleCloseMenu();
  };

  const handleSaveRename = () => {
    if (selectedPlanId && renameInput.trim()) {
      renamePlan(selectedPlanId, renameInput.trim());
      enqueueSnackbar('Đã đổi tên phương án', { variant: 'success' });
    }
    setIsRenameDialogOpen(false);
  };

  const handleDelete = () => {
    if (selectedPlanId) {
      const target = plans.find((p) => p.id === selectedPlanId);
      deletePlan(selectedPlanId);
      enqueueSnackbar(`Đã xóa ${target?.name || 'phương án'}`, { variant: 'info' });
    }
    handleCloseMenu();
  };

  return (
    <Paper className="surface-card plan-selector-card">
      <div className="plan-selector-header">
        <Typography variant="subtitle2" fontWeight={700} className="plan-selector-title">
          📁 Các phương án thời khóa biểu ({plans.length})
        </Typography>
      </div>

      <div className="plan-chip-list">
        {plans.map((plan) => {
          const isActive = plan.id === activePlanId;
          const classCount = plan.selectedClasses?.length || 0;
          const tcCount = calcTongSoTC(plan.selectedClasses || []);

          return (
            <div
              key={plan.id}
              className={`plan-chip ${isActive ? 'active' : ''}`}
              onClick={() => handleSelectPlan(plan.id)}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  handleSelectPlan(plan.id);
                }
              }}
            >
              <span className="plan-chip-icon">{isActive ? <StarIcon fontSize="small" color="primary" /> : '📁'}</span>
              <span className="plan-chip-name">{plan.name}</span>
              <Chip
                size="small"
                className="plan-chip-badge"
                label={`${classCount} lớp${tcCount ? ` · ${tcCount} TC` : ''}`}
                color={isActive ? 'primary' : 'default'}
                variant={isActive ? 'filled' : 'outlined'}
              />
              <IconButton
                size="small"
                className="plan-chip-menu-btn"
                onClick={(e) => handleOpenMenu(e, plan.id)}
                aria-label="Tùy chọn phương án"
              >
                <MoreVertIcon fontSize="small" />
              </IconButton>
            </div>
          );
        })}

        <Button
          variant="outlined"
          size="small"
          startIcon={<AddIcon />}
          onClick={handleCreate}
          className="plan-add-btn"
        >
          Thêm phương án
        </Button>
      </div>

      <Menu anchorEl={menuAnchor} open={Boolean(menuAnchor)} onClose={handleCloseMenu}>
        <MenuItem onClick={handleOpenRename}>
          <ListItemIcon>
            <EditIcon fontSize="small" />
          </ListItemIcon>
          <ListItemText>Đổi tên phương án</ListItemText>
        </MenuItem>
        <MenuItem onClick={handleDuplicate}>
          <ListItemIcon>
            <ContentCopyIcon fontSize="small" />
          </ListItemIcon>
          <ListItemText>Tạo bản sao</ListItemText>
        </MenuItem>
        {plans.length > 1 && (
          <MenuItem onClick={handleDelete} sx={{ color: 'error.main' }}>
            <ListItemIcon sx={{ color: 'error.main' }}>
              <DeleteOutlineIcon fontSize="small" />
            </ListItemIcon>
            <ListItemText>Xóa phương án này</ListItemText>
          </MenuItem>
        )}
      </Menu>

      <Dialog open={isRenameDialogOpen} onClose={() => setIsRenameDialogOpen(false)} maxWidth="xs" fullWidth>
        <DialogTitle>Đổi tên phương án</DialogTitle>
        <DialogContent dividers>
          <TextField
            autoFocus
            fullWidth
            size="small"
            label="Tên phương án"
            value={renameInput}
            onChange={(e) => setRenameInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                handleSaveRename();
              }
            }}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setIsRenameDialogOpen(false)}>Hủy</Button>
          <Button variant="contained" onClick={handleSaveRename} disabled={!renameInput.trim()}>
            Lưu
          </Button>
        </DialogActions>
      </Dialog>
    </Paper>
  );
}

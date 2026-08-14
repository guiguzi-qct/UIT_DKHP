import AddIcon from '@mui/icons-material/Add';
import ArrowDropUpIcon from '@mui/icons-material/ArrowDropUp';
import CheckIcon from '@mui/icons-material/Check';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import DragIndicatorIcon from '@mui/icons-material/DragIndicator';
import EditIcon from '@mui/icons-material/Edit';
import MoreVertIcon from '@mui/icons-material/MoreVert';
import Button from '@mui/material/Button';
import Dialog from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogTitle from '@mui/material/DialogTitle';
import Fab from '@mui/material/Fab';
import IconButton from '@mui/material/IconButton';
import ListItemIcon from '@mui/material/ListItemIcon';
import ListItemText from '@mui/material/ListItemText';
import Menu from '@mui/material/Menu';
import MenuItem from '@mui/material/MenuItem';
import Popover from '@mui/material/Popover';
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
  const movePlan = useTkbStore((s) => s.movePlan);

  const activePlan = plans.find((p) => p.id === activePlanId) || plans[0];
  const activePlanIndex = plans.findIndex((p) => p.id === activePlanId);
  const displayPlanNumber = activePlanIndex >= 0 ? activePlanIndex + 1 : 1;

  const rawName = activePlan?.name || String(displayPlanNumber);
  const isDefaultNumber = !isNaN(Number(rawName)) || rawName.toLowerCase() === `plan ${displayPlanNumber}`;
  const pillLabel = isDefaultNumber ? `PLAN ${displayPlanNumber}` : `PLAN ${displayPlanNumber}: ${rawName.toUpperCase()}`;

  const [fabAnchorEl, setFabAnchorEl] = useState<HTMLElement | null>(null);
  const [menuAnchorEl, setMenuAnchorEl] = useState<HTMLElement | null>(null);
  const [selectedPlanId, setSelectedPlanId] = useState<string | null>(null);

  const [isRenameDialogOpen, setIsRenameDialogOpen] = useState(false);
  const [renameInput, setRenameInput] = useState('');
  const [isConfirmDeleteDialogOpen, setIsConfirmDeleteDialogOpen] = useState(false);

  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);

  const handleDragStart = (e: React.DragEvent, index: number) => {
    setDraggedIndex(index);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', String(index));
  };

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    if (draggedIndex !== null && draggedIndex !== index) {
      setDragOverIndex(index);
    }
  };

  const handleDrop = (e: React.DragEvent, dropIndex: number) => {
    e.preventDefault();
    if (draggedIndex !== null && draggedIndex !== dropIndex) {
      movePlan(draggedIndex, dropIndex);
    }
    setDraggedIndex(null);
    setDragOverIndex(null);
  };

  const handleDragEnd = () => {
    setDraggedIndex(null);
    setDragOverIndex(null);
  };

  const isPopoverOpen = Boolean(fabAnchorEl);

  const handleOpenPopover = (event: React.MouseEvent<HTMLElement>) => {
    setFabAnchorEl(event.currentTarget);
  };

  const handleClosePopover = () => {
    setFabAnchorEl(null);
  };

  const handleOpenMenu = (event: React.MouseEvent<HTMLElement>, planId: string) => {
    event.stopPropagation();
    setSelectedPlanId(planId);
    setMenuAnchorEl(event.currentTarget);
  };

  const handleCloseMenu = () => {
    setMenuAnchorEl(null);
  };

  const handleSelectPlan = (id: string) => {
    if (id !== activePlanId) {
      setActivePlanId(id);
      const target = plans.find((p) => p.id === id);
      enqueueSnackbar(`Đã chuyển sang ${target?.name || 'Plan'}`, { variant: 'info' });
    }
  };

  const handleCreate = () => {
    createPlan();
    enqueueSnackbar('Đã tạo Plan mới', { variant: 'success' });
  };

  const handleDuplicate = () => {
    if (selectedPlanId) {
      duplicatePlan(selectedPlanId);
      const source = plans.find((p) => p.id === selectedPlanId);
      enqueueSnackbar(`Đã nhân bản ${source?.name || 'Plan'}`, { variant: 'success' });
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
      enqueueSnackbar('Đã đổi tên Plan', { variant: 'success' });
    }
    setIsRenameDialogOpen(false);
  };

  const handleOpenDeleteConfirm = () => {
    setIsConfirmDeleteDialogOpen(true);
    handleCloseMenu();
  };

  const handleConfirmDelete = () => {
    if (selectedPlanId) {
      const target = plans.find((p) => p.id === selectedPlanId);
      deletePlan(selectedPlanId);
      enqueueSnackbar(`Đã xóa ${target?.name || 'Plan'}`, { variant: 'info' });
    }
    setIsConfirmDeleteDialogOpen(false);
  };

  const targetPlanToDelete = plans.find((p) => p.id === selectedPlanId);

  return (
    <>
      <div className="floating-plan-fab-wrap">
        <Fab
          variant="extended"
          size="medium"
          className="floating-plan-fab"
          onClick={handleOpenPopover}
          aria-label="Chọn Plan"
        >
          <span className="fab-plan-title">{pillLabel}</span>
          <ArrowDropUpIcon className="fab-plan-arrow-solid" />
        </Fab>
      </div>

      <Popover
        open={isPopoverOpen}
        anchorEl={fabAnchorEl}
        onClose={handleClosePopover}
        anchorOrigin={{
          vertical: 'top',
          horizontal: 'right',
        }}
        transformOrigin={{
          vertical: 'bottom',
          horizontal: 'right',
        }}
        PaperProps={{
          className: 'floating-plan-popover-paper',
        }}
      >
        <div className="popover-plan-header">
          <Typography variant="subtitle2" fontWeight={700}>
            Danh sách Plan ({plans.length})
          </Typography>
        </div>

        <div className="popover-plan-list">
          {plans.map((plan, index) => {
            const isActive = plan.id === activePlanId;
            const classCount = plan.selectedClasses?.length || 0;
            const tcCount = calcTongSoTC(plan.selectedClasses || []);

            return (
              <div
                key={plan.id}
                draggable
                onDragStart={(e) => handleDragStart(e, index)}
                onDragOver={(e) => handleDragOver(e, index)}
                onDrop={(e) => handleDrop(e, index)}
                onDragEnd={handleDragEnd}
                className={`popover-plan-item ${isActive ? 'active' : ''} ${
                  draggedIndex === index ? 'is-dragging' : ''
                } ${dragOverIndex === index ? 'is-drag-over' : ''}`}
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
                <div className="plan-item-left">
                  <span
                    className="plan-drag-handle"
                    title="Nhấn giữ để kéo di chuyển vị trí"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <DragIndicatorIcon fontSize="small" />
                  </span>
                  <span className="plan-item-badge">{index + 1}</span>
                  <span className="plan-check-icon">
                    {isActive ? <CheckIcon fontSize="small" color="primary" /> : null}
                  </span>
                  <div className="plan-item-info">
                    <Typography variant="body2" fontWeight={isActive ? 700 : 500}>
                      {plan.name}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      {classCount} lớp {tcCount ? `· ${tcCount} TC` : ''}
                    </Typography>
                  </div>
                </div>

                <div className="plan-item-actions" onClick={(e) => e.stopPropagation()}>
                  <IconButton
                    size="small"
                    className="plan-item-menu-btn"
                    onClick={(e) => handleOpenMenu(e, plan.id)}
                    aria-label="Tùy chọn Plan"
                  >
                    <MoreVertIcon fontSize="small" />
                  </IconButton>
                </div>
              </div>
            );
          })}
        </div>

        <div className="popover-plan-footer">
          <Button
            fullWidth
            variant="outlined"
            size="small"
            startIcon={<AddIcon />}
            onClick={handleCreate}
          >
            Thêm Plan mới
          </Button>
        </div>
      </Popover>

      <Menu anchorEl={menuAnchorEl} open={Boolean(menuAnchorEl)} onClose={handleCloseMenu}>
        <MenuItem onClick={handleOpenRename}>
          <ListItemIcon>
            <EditIcon fontSize="small" />
          </ListItemIcon>
          <ListItemText>Đổi tên</ListItemText>
        </MenuItem>
        <MenuItem onClick={handleDuplicate}>
          <ListItemIcon>
            <ContentCopyIcon fontSize="small" />
          </ListItemIcon>
          <ListItemText>Tạo bản sao</ListItemText>
        </MenuItem>
        {plans.length > 1 && (
          <MenuItem onClick={handleOpenDeleteConfirm} sx={{ color: 'error.main' }}>
            <ListItemIcon sx={{ color: 'error.main' }}>
              <DeleteOutlineIcon fontSize="small" />
            </ListItemIcon>
            <ListItemText>Xóa Plan</ListItemText>
          </MenuItem>
        )}
      </Menu>

      <Dialog open={isRenameDialogOpen} onClose={() => setIsRenameDialogOpen(false)} maxWidth="xs" fullWidth>
        <DialogTitle>Đổi tên Plan</DialogTitle>
        <DialogContent dividers>
          <TextField
            autoFocus
            fullWidth
            size="small"
            label="Tên Plan"
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

      <Dialog open={isConfirmDeleteDialogOpen} onClose={() => setIsConfirmDeleteDialogOpen(false)} maxWidth="xs" fullWidth>
        <DialogTitle>Xác nhận xóa Plan</DialogTitle>
        <DialogContent dividers>
          <Typography variant="body2">
            Bạn có chắc chắn muốn xóa <strong>{targetPlanToDelete?.name || 'Plan này'}</strong> không? Thao tác này không thể hoàn tác.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setIsConfirmDeleteDialogOpen(false)}>Hủy</Button>
          <Button color="error" variant="contained" onClick={handleConfirmDelete}>
            Xóa Plan
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
}

import AddIcon from '@mui/icons-material/Add';
import CloseIcon from '@mui/icons-material/Close';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import SearchIcon from '@mui/icons-material/Search';
import Button from '@mui/material/Button';
import ButtonBase from '@mui/material/ButtonBase';
import Chip from '@mui/material/Chip';
import Dialog from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogTitle from '@mui/material/DialogTitle';
import IconButton from '@mui/material/IconButton';
import InputAdornment from '@mui/material/InputAdornment';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import { enqueueSnackbar } from 'notistack';
import { useMemo, useState } from 'react';
import { ClassModel } from '../../types';
import { getDanhSachTiet, hasOverlapSchedule, hasTimetableSlot, isSameAgGridRowId } from '../../utils';
import { selectFinalDataTkb, selectSelectedClasses, useTkbStore } from '../../zus';
import './CoursePickerDialog.css';

export type PickerTarget =
  | { kind: 'all' }
  | { kind: 'slot'; thu: number; tiet: string }
  | { kind: 'replace'; existing: ClassModel };

const isSameCoursePart = (a: ClassModel, b: ClassModel) => a.MaMH === b.MaMH && a.ThucHanh === b.ThucHanh;

const getSelectionWithoutCoursePart = (selectedClasses: ClassModel[], candidate: ClassModel) =>
  selectedClasses.filter((selectedClass) => !isSameCoursePart(selectedClass, candidate));

export function getCompatibleCandidates(
  data: ClassModel[],
  selectedClasses: ClassModel[],
  target: PickerTarget,
): ClassModel[] {
  return data
    .filter((candidate) => {
      if (selectedClasses.some((selectedClass) => isSameAgGridRowId(selectedClass, candidate))) return false;

      if (target.kind === 'slot') {
        const matchesSlot =
          hasTimetableSlot(candidate) &&
          candidate.Thu === String(target.thu) &&
          getDanhSachTiet(candidate.Tiet).includes(target.tiet);
        if (!matchesSlot) return false;
      }

      if (target.kind === 'replace' && !isSameCoursePart(candidate, target.existing)) return false;

      const classesKeptWhileTryingCandidate = getSelectionWithoutCoursePart(selectedClasses, candidate);
      return !hasOverlapSchedule(classesKeptWhileTryingCandidate, candidate);
    })
    .sort((a, b) =>
      `${a.TenMH}-${a.MaLop}`.localeCompare(`${b.TenMH}-${b.MaLop}`, 'vi', { sensitivity: 'base' }),
    );
}

const formatTiet = (tiet: string) => getDanhSachTiet(tiet).map((value) => (value === '0' ? '10' : value)).join(', ');

const formatSchedule = (candidate: ClassModel) => {
  if (!hasTimetableSlot(candidate)) return 'Chưa có lịch cố định';
  return `Thứ ${candidate.Thu}, tiết ${formatTiet(candidate.Tiet)}`;
};

const getDialogCopy = (target: PickerTarget) => {
  if (target.kind === 'all') {
    return { title: 'Chọn môn học', description: 'Chỉ hiện các lớp không trùng với thời khóa biểu hiện tại.' };
  }
  if (target.kind === 'replace') {
    return {
      title: `Đổi lớp: ${target.existing.TenMH}`,
      description: `Đang chọn ${target.existing.MaLop}. Các lớp bên dưới có thể thay thế mà không trùng lịch.`,
    };
  }
  return {
    title: `Chọn lớp cho Thứ ${target.thu}, tiết ${target.tiet === '0' ? '10' : target.tiet}`,
    description: 'Các lớp bên dưới đi qua ô này và vẫn vừa với phần lịch đã xếp.',
  };
};

type Props = {
  target: PickerTarget | null;
  onClose: () => void;
};

export default function CoursePickerDialog({ target, onClose }: Props) {
  const [search, setSearch] = useState('');
  const data = useTkbStore(selectFinalDataTkb);
  const selectedClasses = useTkbStore(selectSelectedClasses);
  const setSelectedClasses = useTkbStore((state) => state.setSelectedClasses);

  const candidates = useMemo(() => {
    if (!target) return [];
    const normalizedSearch = search.trim().toLocaleLowerCase('vi');
    return getCompatibleCandidates(data, selectedClasses, target).filter((candidate) => {
      if (!normalizedSearch) return true;
      return [candidate.TenMH, candidate.MaMH, candidate.MaLop, candidate.TenGV, candidate.PhongHoc]
        .filter(Boolean)
        .some((value) => String(value).toLocaleLowerCase('vi').includes(normalizedSearch));
    });
  }, [data, search, selectedClasses, target]);

  if (!target) return null;
  const copy = getDialogCopy(target);
  const displayedCandidates = candidates.slice(0, 100);

  const closeDialog = () => {
    setSearch('');
    onClose();
  };

  const chooseCandidate = (candidate: ClassModel) => {
    const classesKept = getSelectionWithoutCoursePart(selectedClasses, candidate);
    setSelectedClasses([...classesKept, candidate]);
    enqueueSnackbar(`Đã chọn ${candidate.MaLop} · ${candidate.TenMH}`, { variant: 'success' });
    setSearch('');
    closeDialog();
  };

  const removeCurrentClass = () => {
    if (target.kind !== 'replace') return;
    setSelectedClasses(selectedClasses.filter((item) => !isSameCoursePart(item, target.existing)));
    enqueueSnackbar(`Đã bỏ ${target.existing.TenMH}`, { variant: 'info' });
    closeDialog();
  };

  return (
    <Dialog
      open
      fullWidth
      maxWidth="md"
      className="course-picker-dialog"
      onClose={(_event, reason) => {
        if (reason === 'escapeKeyDown') closeDialog();
      }}
    >
      <DialogTitle className="course-picker-title">
        <span>{copy.title}</span>
        <IconButton className="course-picker-close" onClick={closeDialog} aria-label="Đóng popup chọn môn">
          <CloseIcon />
        </IconButton>
      </DialogTitle>
      <DialogContent dividers className="course-picker-content">
        <Typography color="text.secondary" className="course-picker-description">{copy.description}</Typography>
        <TextField
          autoFocus
          fullWidth
          size="small"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Tìm tên môn, mã môn, mã lớp hoặc giảng viên..."
          InputProps={{ startAdornment: <InputAdornment position="start"><SearchIcon /></InputAdornment> }}
        />

        <div className="course-picker-count">
          <strong>{candidates.length}</strong> lớp phù hợp
          {candidates.length > displayedCandidates.length && <span> · đang hiển thị 100 kết quả đầu</span>}
        </div>

        <div className="course-option-list">
          {displayedCandidates.map((candidate) => (
            <ButtonBase className="course-option" key={`${candidate.MaLop}-${candidate.Thu}-${candidate.Tiet}`} onClick={() => chooseCandidate(candidate)}>
              <div className="course-option-main">
                <strong>{candidate.TenMH}</strong>
                <span>{candidate.MaLop} · {candidate.TenGV || 'Chưa có giảng viên'}</span>
                <div className="course-option-chips">
                  <Chip size="small" label={formatSchedule(candidate)} />
                  <Chip size="small" variant="outlined" label={`${candidate.SoTc} tín chỉ`} />
                  {candidate.PhongHoc && <Chip size="small" variant="outlined" label={candidate.PhongHoc} />}
                  {!!candidate.ThucHanh && <Chip size="small" variant="outlined" label="Thực hành" />}
                </div>
              </div>
              <span className="course-option-action"><AddIcon /> Chọn</span>
            </ButtonBase>
          ))}
          {!displayedCandidates.length && (
            <div className="course-picker-empty">
              <Typography fontWeight={800}>Không tìm thấy lớp phù hợp</Typography>
              <Typography variant="body2" color="text.secondary">Thử từ khóa khác hoặc chọn một ô thời gian khác.</Typography>
            </div>
          )}
        </div>
      </DialogContent>
      <DialogActions className="course-picker-actions">
        {target.kind === 'replace' && (
          <Button color="error" startIcon={<DeleteOutlineIcon />} onClick={removeCurrentClass}>Bỏ môn này</Button>
        )}
        <Button color="inherit" onClick={closeDialog}>Đóng</Button>
      </DialogActions>
    </Dialog>
  );
}

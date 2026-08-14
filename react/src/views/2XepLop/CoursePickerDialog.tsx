import Button from '@mui/material/Button';
import ButtonBase from '@mui/material/ButtonBase';
import Chip from '@mui/material/Chip';
import Dialog from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogTitle from '@mui/material/DialogTitle';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import { enqueueSnackbar } from 'notistack';
import { useEffect, useMemo, useState } from 'react';
import { ClassModel } from '../../types';
import { getDanhSachTiet, hasOverlapSchedule, hasTimetableSlot, isSameAgGridRowId } from '../../utils';
import { selectFinalDataTkb, selectSelectedClasses, useTkbStore } from '../../zus';
import './CoursePickerDialog.css';

export type PickerTarget =
  | { kind: 'all' }
  | { kind: 'slot'; thu: number; tiets: string[]; label: string }
  | { kind: 'replace'; existing: ClassModel };

const isSameCoursePart = (a: ClassModel, b: ClassModel) => a.MaMH === b.MaMH && a.ThucHanh === b.ThucHanh;

const getSelectionWithoutCoursePart = (selectedClasses: ClassModel[], candidate: ClassModel) =>
  selectedClasses.filter((selectedClass) => !isSameCoursePart(selectedClass, candidate));

export const applyCandidateBatch = (selectedClasses: ClassModel[], candidates: ClassModel[]) =>
  candidates.reduce(
    (result, candidate) => [...getSelectionWithoutCoursePart(result, candidate), candidate],
    selectedClasses,
  );

export function getCompatibleCandidates(
  data: ClassModel[],
  selectedClasses: ClassModel[],
  target: PickerTarget,
): ClassModel[] {
  return data
    .filter((candidate) => {
      if (selectedClasses.some((selectedClass) => isSameAgGridRowId(selectedClass, candidate))) return false;

      if (target.kind === 'slot') {
        const candidatePeriods = getDanhSachTiet(candidate.Tiet);
        const matchesSlot =
          hasTimetableSlot(candidate) &&
          candidate.Thu === String(target.thu) &&
          candidatePeriods.length > 0 &&
          candidatePeriods.every((tiet) => target.tiets.includes(tiet));
        if (!matchesSlot) return false;
      }

      if (target.kind === 'replace' && !isSameCoursePart(candidate, target.existing)) return false;

      const classesKeptWhileTryingCandidate = getSelectionWithoutCoursePart(selectedClasses, candidate);
      return !hasOverlapSchedule(classesKeptWhileTryingCandidate, candidate);
    })
    .sort((a, b) => `${a.TenMH}-${a.MaLop}`.localeCompare(`${b.TenMH}-${b.MaLop}`, 'vi', { sensitivity: 'base' }));
}

export function getCompatibleCandidatesWithDraft(
  data: ClassModel[],
  selectedClasses: ClassModel[],
  target: PickerTarget,
  draftCandidates: ClassModel[],
): ClassModel[] {
  const selectionWithDraft = applyCandidateBatch(selectedClasses, draftCandidates);

  return getCompatibleCandidates(data, selectedClasses, target).filter((candidate) => {
    if (draftCandidates.some((draft) => isSameAgGridRowId(draft, candidate))) return false;
    if (draftCandidates.some((draft) => isSameCoursePart(draft, candidate))) return false;

    const classesKeptWhileTryingCandidate = getSelectionWithoutCoursePart(selectionWithDraft, candidate);
    return !hasOverlapSchedule(classesKeptWhileTryingCandidate, candidate);
  });
}

export type CandidateCourseGroup = {
  key: string;
  name: string;
  courseCodes: string[];
  candidates: ClassModel[];
};

export function groupCandidatesByCourseName(candidates: ClassModel[]): CandidateCourseGroup[] {
  const groups = new Map<string, CandidateCourseGroup>();

  candidates.forEach((candidate) => {
    const name = candidate.TenMH?.trim() || candidate.MaMH || 'Môn chưa có tên';
    const key = name.toLocaleLowerCase('vi');
    const existing = groups.get(key);

    if (existing) {
      existing.candidates.push(candidate);
      if (candidate.MaMH && !existing.courseCodes.includes(candidate.MaMH)) existing.courseCodes.push(candidate.MaMH);
      return;
    }

    groups.set(key, {
      key,
      name,
      courseCodes: candidate.MaMH ? [candidate.MaMH] : [],
      candidates: [candidate],
    });
  });

  return [...groups.values()].sort((a, b) => a.name.localeCompare(b.name, 'vi', { sensitivity: 'base' }));
}

const formatTiet = (tiet: string) =>
  getDanhSachTiet(tiet)
    .map((value) => (value === '0' ? '10' : value))
    .join(', ');

const formatSchedule = (candidate: ClassModel) => {
  if (!hasTimetableSlot(candidate)) return 'Chưa có lịch cố định';
  return `Thứ ${candidate.Thu}, tiết ${formatTiet(candidate.Tiet)}`;
};

const getDialogCopy = (target: PickerTarget) => {
  if (target.kind === 'all') {
    return {
      title: 'Chọn môn học',
      description: 'Có thể chọn nhiều lớp rồi bấm Thêm. Các phương án trùng với phần đã chọn sẽ tự ẩn.',
    };
  }
  if (target.kind === 'replace') {
    return {
      title: `Đổi lớp: ${target.existing.TenMH}`,
      description: `Đang chọn ${target.existing.MaLop}. Chọn phương án thay thế rồi bấm Đổi lớp.`,
    };
  }
  return {
    title: `Chọn lớp cho Thứ ${target.thu} · ${target.label}`,
    description: 'Có thể chọn nhiều lớp nằm trọn trong vùng này. Phương án trùng giờ sẽ tự ẩn.',
  };
};

type Props = {
  target: PickerTarget | null;
  onClose: () => void;
};

export default function CoursePickerDialog({ target, onClose }: Props) {
  const [search, setSearch] = useState('');
  const [draftCandidates, setDraftCandidates] = useState<ClassModel[]>([]);
  const [expandedCourseKey, setExpandedCourseKey] = useState<string | null>(null);
  const data = useTkbStore(selectFinalDataTkb);
  const selectedClasses = useTkbStore(selectSelectedClasses);
  const setSelectedClasses = useTkbStore((state) => state.setSelectedClasses);

  useEffect(() => {
    setSearch('');
    setDraftCandidates([]);
    setExpandedCourseKey(null);
  }, [target]);

  const candidates = useMemo(() => {
    if (!target) return [];
    const normalizedSearch = search.trim().toLocaleLowerCase('vi');
    return getCompatibleCandidatesWithDraft(data, selectedClasses, target, draftCandidates).filter((candidate) => {
      if (!normalizedSearch) return true;
      return [candidate.TenMH, candidate.MaMH, candidate.MaLop, candidate.TenGV, candidate.PhongHoc]
        .filter(Boolean)
        .some((value) => String(value).toLocaleLowerCase('vi').includes(normalizedSearch));
    });
  }, [data, draftCandidates, search, selectedClasses, target]);

  const candidateGroups = useMemo(() => groupCandidatesByCourseName(candidates), [candidates]);

  useEffect(() => {
    if (search.trim() && candidateGroups.length === 1) setExpandedCourseKey(candidateGroups[0].key);
  }, [candidateGroups, search]);

  if (!target) return null;
  const copy = getDialogCopy(target);

  const closeDialog = () => {
    setSearch('');
    setDraftCandidates([]);
    setExpandedCourseKey(null);
    onClose();
  };

  const chooseCandidate = (candidate: ClassModel) => {
    setDraftCandidates((current) => [...current, candidate]);
  };

  const removeDraftCandidate = (candidate: ClassModel) => {
    setDraftCandidates((current) => current.filter((item) => !isSameAgGridRowId(item, candidate)));
  };

  const commitDraftCandidates = () => {
    if (!draftCandidates.length) return;
    setSelectedClasses(applyCandidateBatch(selectedClasses, draftCandidates));
    enqueueSnackbar(`Đã thêm ${draftCandidates.length} lớp vào thời khóa biểu`, { variant: 'success' });
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
      maxWidth="lg"
      className="course-picker-dialog"
      onClose={(_event, reason) => {
        if (reason === 'escapeKeyDown') closeDialog();
      }}
    >
      <DialogTitle className="course-picker-title">
        <span>{copy.title}</span>
        <button className="course-picker-close" type="button" onClick={closeDialog} aria-label="Đóng popup chọn môn">
          ×
        </button>
      </DialogTitle>
      <DialogContent dividers className="course-picker-content">
        <Typography color="text.secondary" className="course-picker-description">
          {copy.description}
        </Typography>

        {!!draftCandidates.length && (
          <section className="course-picker-draft" aria-label="Các lớp đang chọn">
            <div className="course-picker-draft-head">
              <strong>Đang chọn {draftCandidates.length} lớp</strong>
              <button type="button" onClick={() => setDraftCandidates([])}>
                Bỏ chọn hết
              </button>
            </div>
            <div className="course-picker-draft-list">
              {draftCandidates.map((candidate) => (
                <button
                  type="button"
                  key={`${candidate.MaLop}-${candidate.Thu}-${candidate.Tiet}`}
                  onClick={() => removeDraftCandidate(candidate)}
                  aria-label={`Bỏ chọn ${candidate.MaLop}`}
                >
                  <strong>{candidate.TenMH}</strong>
                  <span>
                    {candidate.MaLop} · {formatSchedule(candidate)}
                  </span>
                  <small>Bấm để bỏ chọn</small>
                </button>
              ))}
            </div>
          </section>
        )}

        <TextField
          autoFocus
          fullWidth
          size="small"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Tìm tên môn, mã môn, mã lớp hoặc giảng viên..."
        />

        <div className="course-picker-count">
          <strong>{candidateGroups.length}</strong> môn · <strong>{candidates.length}</strong> lớp còn phù hợp
        </div>

        <div className="course-group-list">
          {candidateGroups.map((group) => {
            const isExpanded = expandedCourseKey === group.key;
            return (
              <section className="course-group" key={group.key}>
                <button
                  className="course-group-trigger"
                  type="button"
                  aria-expanded={isExpanded}
                  onClick={() => setExpandedCourseKey(isExpanded ? null : group.key)}
                >
                  <span className="course-group-copy">
                    <strong>{group.name}</strong>
                    <small>
                      {group.courseCodes.join(', ') || 'Chưa có mã môn'} · {group.candidates.length} lớp
                    </small>
                  </span>
                  <span className="course-group-action">{isExpanded ? 'Thu gọn' : 'Xem lớp'}</span>
                </button>

                {isExpanded && (
                  <div className="course-option-list">
                    {group.candidates.map((candidate) => (
                      <ButtonBase
                        className="course-option"
                        key={`${candidate.MaLop}-${candidate.Thu}-${candidate.Tiet}`}
                        onClick={() => chooseCandidate(candidate)}
                      >
                        <div className="course-option-main">
                          <strong>{candidate.MaLop}</strong>
                          <span>{candidate.TenGV || 'Chưa có giảng viên'}</span>
                          <div className="course-option-chips">
                            <Chip size="small" label={formatSchedule(candidate)} />
                            <Chip size="small" variant="outlined" label={`${candidate.SoTc} tín chỉ`} />
                            {candidate.PhongHoc && <Chip size="small" variant="outlined" label={candidate.PhongHoc} />}
                            {!!candidate.ThucHanh && <Chip size="small" variant="outlined" label="Thực hành" />}
                          </div>
                        </div>
                        <span className="course-option-action">Chọn</span>
                      </ButtonBase>
                    ))}
                  </div>
                )}
              </section>
            );
          })}
          {!candidateGroups.length && (
            <div className="course-picker-empty">
              <Typography fontWeight={800}>Không tìm thấy lớp phù hợp</Typography>
              <Typography variant="body2" color="text.secondary">
                Thử bỏ bớt lớp đang chọn, đổi từ khóa hoặc chọn một vùng thời gian khác.
              </Typography>
            </div>
          )}
        </div>
      </DialogContent>
      <DialogActions className="course-picker-actions">
        {target.kind === 'replace' && (
          <Button color="error" onClick={removeCurrentClass}>
            Bỏ môn này
          </Button>
        )}
        <Button color="inherit" onClick={closeDialog}>
          Đóng
        </Button>
        <Button variant="contained" disabled={!draftCandidates.length} onClick={commitDraftCandidates}>
          {target.kind === 'replace'
            ? 'Đổi lớp'
            : draftCandidates.length
            ? `Thêm ${draftCandidates.length} lớp`
            : 'Thêm lớp'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}

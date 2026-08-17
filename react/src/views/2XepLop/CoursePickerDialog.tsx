import AddIcon from '@mui/icons-material/Add';
import CheckIcon from '@mui/icons-material/Check';
import KeyboardArrowDownIcon from '@mui/icons-material/KeyboardArrowDown';
import KeyboardArrowUpIcon from '@mui/icons-material/KeyboardArrowUp';
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
import { selectFinalDataTkb, selectSelectedClassesBuoc3, useTkbStore } from '../../zus';
import './CoursePickerDialog.css';

export type PickerTarget =
  | { kind: 'all' }
  | { kind: 'slot'; thu: number; tiets: string[]; label: string }
  | { kind: 'replace'; existing: ClassModel };

export function getParentTheoryCode(maLop: string): string {
  const trimmed = (maLop || '').trim();
  if (/\.\d+$/.test(trimmed)) {
    return trimmed.replace(/\.\d+$/, '');
  }
  return trimmed;
}

export function isThucHanhClass(candidate: ClassModel): boolean {
  if (!candidate) return false;

  // 1. Explicit check from Excel fields: ThucHanh > 0 or HTGD === 'TH'
  if (candidate.ThucHanh !== undefined && candidate.ThucHanh !== null) {
    const num = Number(candidate.ThucHanh);
    if (!isNaN(num) && num > 0) return true;
  }

  if (candidate.HTGD) {
    const htgd = String(candidate.HTGD).trim().toUpperCase();
    if (htgd === 'TH' || htgd.includes('THỰC HÀNH') || htgd.includes('THUC HANH')) {
      return true;
    }
  }

  // 2. Pattern check for MaLop: e.g. IT007.R110.1 -> parent is IT007.R110 (contains a dot)
  const maLop = candidate.MaLop?.trim() || '';
  if (/\.\d+$/.test(maLop)) {
    const parentCode = getParentTheoryCode(maLop);
    if (parentCode && parentCode.includes('.')) {
      return true;
    }
  }

  return false;
}

export function isTheoryClass(candidate: ClassModel): boolean {
  return !isThucHanhClass(candidate);
}

export function isPracticeOfTheory(thClass: ClassModel, ltClass: ClassModel): boolean {
  if (!thClass || !ltClass) return false;
  if (thClass.MaMH !== ltClass.MaMH) return false;
  if (!isThucHanhClass(thClass) || isThucHanhClass(ltClass)) return false;

  const ltCode = (ltClass.MaLop || '').trim();
  const thCode = (thClass.MaLop || '').trim();

  if (!ltCode || !thCode) return false;
  return getParentTheoryCode(thCode) === ltCode;
}

export function getMatchingPracticeClasses(ltClass: ClassModel, allCandidates: ClassModel[]): ClassModel[] {
  return allCandidates.filter((c) => isPracticeOfTheory(c, ltClass));
}

const isSameCoursePart = (a: ClassModel, b: ClassModel) => {
  if (a.MaMH !== b.MaMH) return false;
  return isThucHanhClass(a) === isThucHanhClass(b);
};

const getSelectionWithoutCoursePart = (selectedClasses: ClassModel[], candidate: ClassModel) =>
  selectedClasses.filter((selectedClass) => !isSameCoursePart(selectedClass, candidate));

const getCandidateKey = (candidate: ClassModel) => `${candidate.MaLop}-${candidate.Thu}-${candidate.Tiet}`;

export const applyCandidateBatch = (selectedClasses: ClassModel[], candidates: ClassModel[]) =>
  candidates.reduce(
    (result, candidate) => [...getSelectionWithoutCoursePart(result, candidate), candidate],
    selectedClasses,
  );

export function isSameThu(thuA: any, thuB: any): boolean {
  if (thuA === undefined || thuA === null || thuB === undefined || thuB === null) return false;
  const numA = String(thuA).replace(/\D/g, '');
  const numB = String(thuB).replace(/\D/g, '');
  return numA !== '' && numA === numB;
}

export function getCompatibleCandidates(
  data: ClassModel[],
  selectedClasses: ClassModel[],
  target: PickerTarget,
): ClassModel[] {
  const directMatches = data.filter((candidate) => {
    if (selectedClasses.some((selectedClass) => isSameAgGridRowId(selectedClass, candidate))) return false;

    if (target.kind === 'slot') {
      if (!hasTimetableSlot(candidate)) return false;
      if (!isSameThu(candidate.Thu, target.thu)) return false;

      const candidatePeriods = getDanhSachTiet(candidate.Tiet);
      if (!candidatePeriods.length) return false;

      const hasOverlapPeriod = candidatePeriods.some((tiet) => target.tiets.includes(tiet));
      if (!hasOverlapPeriod) return false;
    }

    if (target.kind === 'replace' && !isSameCoursePart(candidate, target.existing)) return false;

    const classesKeptWhileTryingCandidate = getSelectionWithoutCoursePart(selectedClasses, candidate);
    return !hasOverlapSchedule(classesKeptWhileTryingCandidate, candidate);
  });

  if (target.kind !== 'slot') {
    return directMatches.sort((a, b) =>
      `${a.TenMH}-${a.MaLop}`.localeCompare(`${b.TenMH}-${b.MaLop}`, 'vi', { sensitivity: 'base' }),
    );
  }

  // For slot target: Expand directMatches to include paired Theory & Practice classes
  const matchedSet = new Set(directMatches.map(getCandidateKey));
  const expandedList = [...directMatches];

  directMatches.forEach((candidate) => {
    if (isTheoryClass(candidate)) {
      const practices = data.filter(
        (th) => isThucHanhClass(th) && isPracticeOfTheory(th, candidate),
      );
      practices.forEach((th) => {
        const key = getCandidateKey(th);
        if (!matchedSet.has(key)) {
          matchedSet.add(key);
          expandedList.push(th);
        }
      });
    } else if (isThucHanhClass(candidate)) {
      const parentCode = getParentTheoryCode(candidate.MaLop);
      const parentTheory = data.find(
        (c) => isTheoryClass(c) && c.MaMH === candidate.MaMH && c.MaLop?.trim() === parentCode,
      );
      if (parentTheory) {
        const parentKey = getCandidateKey(parentTheory);
        if (!matchedSet.has(parentKey)) {
          matchedSet.add(parentKey);
          expandedList.push(parentTheory);
        }

        const siblingPractices = data.filter(
          (th) => isThucHanhClass(th) && isPracticeOfTheory(th, parentTheory),
        );
        siblingPractices.forEach((th) => {
          const key = getCandidateKey(th);
          if (!matchedSet.has(key)) {
            matchedSet.add(key);
            expandedList.push(th);
          }
        });
      }
    }
  });

  return expandedList.sort((a, b) =>
    `${a.TenMH}-${a.MaLop}`.localeCompare(`${b.TenMH}-${b.MaLop}`, 'vi', { sensitivity: 'base' }),
  );
}

export function getDraftConflictReason(
  candidate: ClassModel,
  selectedClasses: ClassModel[],
  draftCandidates: ClassModel[],
): string | null {
  if (draftCandidates.some((draft) => isSameAgGridRowId(draft, candidate))) {
    return null;
  }

  const isTH = isThucHanhClass(candidate);
  if (draftCandidates.some((draft) => isSameCoursePart(draft, candidate))) {
    return isTH ? 'Đã chọn lớp Thực hành cho môn này' : 'Đã chọn lớp Lý thuyết cho môn này';
  }

  const selectionWithDraft = applyCandidateBatch(selectedClasses, draftCandidates);
  const classesKeptWhileTryingCandidate = getSelectionWithoutCoursePart(selectionWithDraft, candidate);
  if (hasOverlapSchedule(classesKeptWhileTryingCandidate, candidate)) return 'Trùng giờ với lớp đang chọn';

  return null;
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

export type TheoryWithPracticeNode = {
  theory: ClassModel;
  practices: ClassModel[];
};

export function buildTheoryPracticeTree(candidates: ClassModel[]): {
  theoryNodes: TheoryWithPracticeNode[];
  standalonePractices: ClassModel[];
} {
  const theories = candidates.filter(isTheoryClass);
  const practices = candidates.filter(isThucHanhClass);

  const matchedPracticeKeys = new Set<string>();
  const theoryNodes: TheoryWithPracticeNode[] = theories.map((lt) => {
    const matchingPractices = practices.filter((th) => {
      const isMatch = isPracticeOfTheory(th, lt);
      if (isMatch) matchedPracticeKeys.add(getCandidateKey(th));
      return isMatch;
    });

    return {
      theory: lt,
      practices: matchingPractices,
    };
  });

  const standalonePractices = practices.filter(
    (th) => !matchedPracticeKeys.has(getCandidateKey(th))
  );

  return { theoryNodes, standalonePractices };
}

export const formatTiet = (tiet: string) => {
  const list = getDanhSachTiet(tiet).map((value) => (value === '0' ? '10' : value));
  if (list.length === 0) return '';
  if (list.length === 1) return list[0];

  const nums = list.map(Number);
  const isConsecutive = nums.every((val, idx) => idx === 0 || val === nums[idx - 1] + 1);

  if (isConsecutive && nums.length > 2) {
    return `${nums[0]}–${nums[nums.length - 1]}`;
  }

  return list.join(', ');
};

const formatSchedule = (candidate: ClassModel) => {
  if (!hasTimetableSlot(candidate)) return 'Chưa có lịch cố định';
  return `Thứ ${candidate.Thu}, tiết ${formatTiet(candidate.Tiet)}`;
};

const getDialogCopy = (target: PickerTarget) => {
  if (target.kind === 'all') {
    return {
      title: 'Chọn môn học',
      description: 'Chọn lớp Lý thuyết trước, hệ thống sẽ tự động chừa lại các lớp Thực hành đi kèm (như R11.1, R11.2) để chọn.',
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
    description: 'Có thể chọn nhiều lớp nằm trọn trong vùng này. Phương án trùng giờ sẽ được làm mờ.',
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

  const [shakingKey, setShakingKey] = useState<string | null>(null);
  const [shakingSubmit, setShakingSubmit] = useState(false);

  const data = useTkbStore(selectFinalDataTkb);
  const selectedClasses = useTkbStore(selectSelectedClassesBuoc3);
  const setSelectedClasses = useTkbStore((state) => state.setSelectedClasses);

  useEffect(() => {
    setSearch('');
    setDraftCandidates([]);
    setExpandedCourseKey(null);
    setShakingKey(null);
    setShakingSubmit(false);
  }, [target]);

  const candidates = useMemo(() => {
    if (!target) return [];
    const normalizedSearch = search.trim().toLocaleLowerCase('vi');
    const list = getCompatibleCandidates(data, selectedClasses, target);

    return list.filter((candidate) => {
      if (!normalizedSearch) return true;
      return [candidate.TenMH, candidate.MaMH, candidate.MaLop, candidate.TenGV, candidate.PhongHoc]
        .filter(Boolean)
        .some((value) => String(value).toLocaleLowerCase('vi').includes(normalizedSearch));
    });
  }, [data, search, selectedClasses, target]);

  const conflictReasons = useMemo(() => {
    const reasons = new Map<string, string>();
    candidates.forEach((candidate) => {
      const reason = getDraftConflictReason(candidate, selectedClasses, draftCandidates);
      if (reason) reasons.set(getCandidateKey(candidate), reason);
    });
    return reasons;
  }, [candidates, draftCandidates, selectedClasses]);

  const dimmedCount = conflictReasons.size;
  const availableCount = candidates.length - dimmedCount;

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
    setShakingKey(null);
    setShakingSubmit(false);
    onClose();
  };

  const chooseCandidate = (candidate: ClassModel) => {
    const isAlreadyDraft = draftCandidates.some((d) => isSameAgGridRowId(d, candidate));
    if (isAlreadyDraft) {
      setDraftCandidates((current) => current.filter((item) => !isSameAgGridRowId(item, candidate)));
      return;
    }

    const isTH = isThucHanhClass(candidate);
    if (isTH) {
      const allSelectedLTs = [...selectedClasses, ...draftCandidates].filter(isTheoryClass);
      const hasParentLTSelected = allSelectedLTs.some((lt) => isPracticeOfTheory(candidate, lt));

      if (!hasParentLTSelected) {
        const parentCode = getParentTheoryCode(candidate.MaLop);
        const parentTheory = data.find(
          (c) => isTheoryClass(c) && c.MaMH === candidate.MaMH && c.MaLop?.trim() === parentCode,
        );
        if (parentTheory) {
          enqueueSnackbar(`Đã tự động chọn lớp Lý thuyết ${parentTheory.MaLop} đi kèm!`, { variant: 'info' });
          setDraftCandidates((current) => [...current, parentTheory, candidate]);
          return;
        }
      }
    }

    setDraftCandidates((current) => [...current, candidate]);
  };

  const removeDraftCandidate = (candidate: ClassModel) => {
    setDraftCandidates((current) => current.filter((item) => !isSameAgGridRowId(item, candidate)));
  };

  const commitDraftCandidates = () => {
    if (!draftCandidates.length) return;

    const allCurrentClasses = [...selectedClasses, ...draftCandidates];
    const draftLTClasses = draftCandidates.filter(isTheoryClass);

    let missingTHWarning = '';
    for (const ltClass of draftLTClasses) {
      const matchingTHOptions = getMatchingPracticeClasses(ltClass, data);
      if (matchingTHOptions.length > 0) {
        const hasMatchingTHSelected = allCurrentClasses.some((c) =>
          isThucHanhClass(c) && matchingTHOptions.some((thOpt) => isSameAgGridRowId(thOpt, c))
        );

        if (!hasMatchingTHSelected) {
          missingTHWarning = `Nhớ chọn thêm lớp Thực hành cho môn ${ltClass.TenMH} (${matchingTHOptions.map((c) => c.MaLop).join(', ')}) nhé!`;
        }
      }
    }

    setSelectedClasses(applyCandidateBatch(selectedClasses, draftCandidates));
    enqueueSnackbar(
      missingTHWarning
        ? `Đã thêm ${draftCandidates.length} lớp. ${missingTHWarning}`
        : `Đã thêm ${draftCandidates.length} lớp vào thời khóa biểu`,
      { variant: missingTHWarning ? 'warning' : 'success' }
    );
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
      onClose={closeDialog}
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
          <strong>{candidateGroups.length}</strong> môn · <strong>{availableCount}</strong> lớp có thể chọn
          {!!dimmedCount && <span> · {dimmedCount} lớp xung đột đang làm mờ</span>}
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
                  <span className="course-group-action" aria-hidden="true">
                    {isExpanded ? <KeyboardArrowUpIcon /> : <KeyboardArrowDownIcon />}
                  </span>
                  <span className="course-picker-visually-hidden">{isExpanded ? 'Thu gọn' : 'Xem lớp'}</span>
                </button>

                {isExpanded && (() => {
                  const { theoryNodes, standalonePractices } = buildTheoryPracticeTree(group.candidates);

                  return (
                    <div className="course-option-list">
                      {theoryNodes.map(({ theory, practices }) => {
                        const ltKey = getCandidateKey(theory);
                        const ltConflict = conflictReasons.get(ltKey);
                        const isLTDraftSelected = draftCandidates.some((d) => isSameAgGridRowId(d, theory));
                        const isLTTkbSelected = selectedClasses.some((s) => isSameAgGridRowId(s, theory));
                        const isLTActive = isLTDraftSelected || isLTTkbSelected;

                        return (
                          <div className="theory-tree-node" key={ltKey}>
                            {/* Parent Theory Card */}
                            <ButtonBase
                              disableRipple
                              className={`course-option course-option-theory${
                                ltConflict ? ' course-option-conflict' : ''
                              }${isLTActive ? ' course-option-active-lt' : ''}`}
                              disabled={!!ltConflict}
                              onClick={() => chooseCandidate(theory)}
                              aria-label={ltConflict || `Chọn lớp Lý thuyết ${theory.MaLop}`}
                            >
                              <div className="course-option-main">
                                <strong>{theory.MaLop}</strong>
                                <span>{theory.TenGV || 'Chưa có giảng viên'}</span>
                                <div className="course-option-chips">
                                  <Chip size="small" label={formatSchedule(theory)} />
                                  <Chip size="small" variant="outlined" label={`${theory.SoTc} tín chỉ`} />
                                  {theory.PhongHoc && (
                                    <Chip size="small" variant="outlined" label={theory.PhongHoc} />
                                  )}
                                  <Chip size="small" color="primary" className="chip-ly-thuyet" label="Lý thuyết" />
                                </div>
                              </div>
                              <span
                                className={`course-option-action${
                                  ltConflict ? ' course-option-action-conflict' : ''
                                }`}
                              >
                                {ltConflict || (
                                  <>
                                    {isLTActive ? <CheckIcon aria-hidden="true" /> : <AddIcon aria-hidden="true" />}
                                    <span className="course-picker-visually-hidden">{isLTActive ? 'Bỏ chọn' : 'Chọn'}</span>
                                  </>
                                )}
                              </span>
                            </ButtonBase>

                            {/* Nested Practice Children (Indented / Thụt vô 1 tí) */}
                            {practices.length > 0 && (
                              <div className={`practice-nested-container${isLTActive ? ' active-branch' : ''}`}>
                                {practices.map((practice) => {
                                  const thKey = getCandidateKey(practice);
                                  const thOwnConflict = conflictReasons.get(thKey);
                                  const effectiveTHConflict = thOwnConflict || (ltConflict ? 'Lớp Lý thuyết đã bị trùng/khóa' : null);

                                  const isTHDraftSelected = draftCandidates.some((d) => isSameAgGridRowId(d, practice));
                                  const isTHTkbSelected = selectedClasses.some((s) => isSameAgGridRowId(s, practice));
                                  const isTHActive = isTHDraftSelected || isTHTkbSelected;
                                  const isLockedTH = !isLTActive && !effectiveTHConflict;
                                  const isUnlockedTH = isLTActive && !isTHActive && !effectiveTHConflict;
                                  const isShaking = shakingKey === thKey;

                                  return (
                                    <ButtonBase
                                      disableRipple
                                      className={`course-option course-option-practice${
                                        effectiveTHConflict ? ' course-option-conflict' : ''
                                      }${isLockedTH ? ' course-option-locked-th' : ''}${
                                        isUnlockedTH ? ' course-option-unlocked-th' : ''
                                      }${isTHActive ? ' course-option-active-th' : ''}${
                                        isShaking ? ' shake-red-animation' : ''
                                      }`}
                                      key={thKey}
                                      disabled={!!effectiveTHConflict}
                                      onClick={() => chooseCandidate(practice)}
                                      aria-label={effectiveTHConflict || `Chọn lớp Thực hành ${practice.MaLop}`}
                                    >
                                      <div className="course-option-main">
                                        <strong>{practice.MaLop}</strong>
                                        <span>{practice.TenGV || 'Chưa có giảng viên'}</span>
                                        <div className="course-option-chips">
                                          <Chip size="small" label={formatSchedule(practice)} />
                                          <Chip size="small" variant="outlined" label={`${practice.SoTc} tín chỉ`} />
                                          {practice.PhongHoc && (
                                            <Chip size="small" variant="outlined" label={practice.PhongHoc} />
                                          )}
                                          {!effectiveTHConflict && (
                                            <Chip
                                              size="small"
                                              className={`chip-thuc-hanh ${isTHActive ? 'active' : ''}`}
                                              label="Thực hành"
                                            />
                                          )}
                                        </div>
                                      </div>
                                      <span
                                        className={`course-option-action${
                                          effectiveTHConflict ? ' course-option-action-conflict' : ''
                                        }`}
                                      >
                                        {effectiveTHConflict || (
                                          <>
                                            {isTHActive ? <CheckIcon aria-hidden="true" /> : <AddIcon aria-hidden="true" />}
                                            <span className="course-picker-visually-hidden">{isTHActive ? 'Bỏ chọn' : 'Chọn'}</span>
                                          </>
                                        )}
                                      </span>
                                    </ButtonBase>
                                  );
                                })}
                              </div>
                            )}
                          </div>
                        );
                      })}

                      {standalonePractices.map((practice) => {
                        const thKey = getCandidateKey(practice);
                        const thConflict = conflictReasons.get(thKey);
                        const isTHActive = draftCandidates.some((d) => isSameAgGridRowId(d, practice)) || selectedClasses.some((s) => isSameAgGridRowId(s, practice));
                        const isShaking = shakingKey === thKey;

                        return (
                          <ButtonBase
                            disableRipple
                            className={`course-option course-option-practice${
                              thConflict ? ' course-option-conflict' : ''
                            }${isTHActive ? ' course-option-active-th' : ''}${
                              isShaking ? ' shake-red-animation' : ''
                            }`}
                            key={thKey}
                            disabled={!!thConflict}
                            onClick={() => chooseCandidate(practice)}
                          >
                            <div className="course-option-main">
                              <strong>{practice.MaLop}</strong>
                              <span>{practice.TenGV || 'Chưa có giảng viên'}</span>
                              <div className="course-option-chips">
                                <Chip size="small" label={formatSchedule(practice)} />
                                <Chip size="small" variant="outlined" label={`${practice.SoTc} tín chỉ`} />
                                {practice.PhongHoc && (
                                  <Chip size="small" variant="outlined" label={practice.PhongHoc} />
                                )}
                                <Chip size="small" color="secondary" className="chip-thuc-hanh" label="Thực hành" />
                              </div>
                            </div>
                            <span
                              className={`course-option-action${
                                thConflict ? ' course-option-action-conflict' : ''
                              }`}
                            >
                              {thConflict || (isTHActive ? <CheckIcon aria-hidden="true" /> : <AddIcon aria-hidden="true" />)}
                            </span>
                          </ButtonBase>
                        );
                      })}
                    </div>
                  );
                })()}
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
        <Button
          variant="contained"
          className={shakingSubmit ? 'shake-red-animation' : ''}
          disabled={!draftCandidates.length}
          onClick={commitDraftCandidates}
        >
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

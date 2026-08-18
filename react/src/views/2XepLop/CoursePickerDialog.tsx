import AddIcon from '@mui/icons-material/Add';
import CheckIcon from '@mui/icons-material/Check';
import CloseIcon from '@mui/icons-material/Close';
import KeyboardArrowDownIcon from '@mui/icons-material/KeyboardArrowDown';
import KeyboardArrowUpIcon from '@mui/icons-material/KeyboardArrowUp';
import ViewListIcon from '@mui/icons-material/ViewList';
import ViewModuleIcon from '@mui/icons-material/ViewModule';
import Button from '@mui/material/Button';
import ButtonBase from '@mui/material/ButtonBase';
import Chip from '@mui/material/Chip';
import Dialog from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogTitle from '@mui/material/DialogTitle';
import TextField from '@mui/material/TextField';
import ToggleButton from '@mui/material/ToggleButton';
import ToggleButtonGroup from '@mui/material/ToggleButtonGroup';
import Typography from '@mui/material/Typography';
import { enqueueSnackbar } from 'notistack';
import { useEffect, useMemo, useState } from 'react';
import { ClassModel } from '../../types';
import { getDanhSachTiet, hasOverlapSchedule, hasTimetableSlot, isSameAgGridRowId } from '../../utils';
import { selectFinalDataTkb, selectSelectedClassesBuoc3, useTkbStore } from '../../zus';
import { TimetablePickTarget } from '../components/ThoiKhoaBieuTable';
import { cleanTenMH } from '../1ChonFileExcel/utils';
import './CoursePickerDialog.css';

export type PickerTarget =
  | { kind: 'all' }
  | { kind: 'slot'; thu: number; tiets: string[]; label: string }
  | { kind: 'replace'; existing: ClassModel };

export function getParentTheoryCode(maLop: string): string {
  let trimmed = (maLop || '').trim();
  if (trimmed.includes('-----')) {
    trimmed = trimmed.split('-----')[0].trim();
  }
  const codeMatch = trimmed.match(/^([A-Z0-9.]+)/i);
  if (codeMatch) {
    trimmed = codeMatch[1];
  }
  if (/\.\d+$/.test(trimmed)) {
    return trimmed.replace(/\.\d+$/, '');
  }
  return trimmed;
}

export function isThucHanhClass(candidate: ClassModel): boolean {
  if (!candidate) return false;

  const maLop = (candidate.MaLop || '').trim();

  // 1. MaLop pattern check FIRST: UIT practice classes always have a practice suffix (.1, .2, .ANTT.1)
  // e.g. IE104.R12.1 or NT230.R11.ANTT.1 or SE104.O21.2
  if (/\.[A-Z0-9.]+\.\d+/i.test(maLop) || /\.\d+(\s|-----|$)/.test(maLop)) {
    return true;
  }

  // 2. Explicit check from HTGD field
  if (candidate.HTGD) {
    const htgd = String(candidate.HTGD).trim().toUpperCase();
    if (htgd === 'TH' || htgd.includes('THỰC HÀNH') || htgd.includes('THUC HANH')) {
      return true;
    }
    if (htgd === 'LT' || htgd.includes('LÝ THUYẾT') || htgd.includes('LY THUYET') || htgd === 'LHD') {
      return false; // Explicitly Theory!
    }
  }

  // 3. Explicit check from ThucHanh field
  if (candidate.ThucHanh !== undefined && candidate.ThucHanh !== null && String(candidate.ThucHanh).trim() !== '') {
    const num = Number(candidate.ThucHanh);
    if (!isNaN(num)) {
      if (num > 0) return true; // Explicitly Practice!
      if (num === 0) return false; // Explicitly Theory!
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
  const thLtCode = (thClass.MaLopLt || '').trim();

  if (!ltCode) return false;

  // 1. Explicit match via MaLopLt column from Excel (e.g. "MA LOP LT" column = "CE118.R11")
  if (thLtCode && thLtCode === ltCode) {
    return true;
  }

  // 2. Pattern match via parent theory code
  if (thCode && getParentTheoryCode(thCode) === ltCode) {
    return true;
  }

  return false;
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

    return true;
  });

  if (target.kind !== 'slot') {
    return directMatches.sort((a, b) =>
      `${a.TenMH}-${a.MaLop}`.localeCompare(`${b.TenMH}-${b.MaLop}`, 'vi', { sensitivity: 'base' }),
    );
  }

  // For slot target: If a Theory class matches the slot, include ALL of its child Practice classes (regardless of time!)
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
    const rawName = candidate.TenMH?.trim() || candidate.MaMH || 'Môn chưa có tên';
    const name = cleanTenMH(rawName) || rawName;
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

export function buildTheoryPracticeTree(candidates: ClassModel[], data: ClassModel[] = []): {
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

  const unmatchedPractices = practices.filter(
    (th) => !matchedPracticeKeys.has(getCandidateKey(th))
  );

  const standalonePractices: ClassModel[] = [];

  unmatchedPractices.forEach((th) => {
    if (matchedPracticeKeys.has(getCandidateKey(th))) return;

    const parentCode = getParentTheoryCode(th.MaLop);
    const parentTheory =
      candidates.find((c) => isTheoryClass(c) && c.MaMH === th.MaMH && c.MaLop?.trim() === parentCode) ||
      data.find((c) => isTheoryClass(c) && c.MaMH === th.MaMH && c.MaLop?.trim() === parentCode);

    if (parentTheory) {
      const existingNode = theoryNodes.find((node) => isSameAgGridRowId(node.theory, parentTheory));
      const siblingPractices = practices.filter((p) => isPracticeOfTheory(p, parentTheory));

      siblingPractices.forEach((p) => matchedPracticeKeys.add(getCandidateKey(p)));

      if (existingNode) {
        siblingPractices.forEach((p) => {
          if (!existingNode.practices.some((item) => isSameAgGridRowId(item, p))) {
            existingNode.practices.push(p);
          }
        });
      } else {
        theoryNodes.push({
          theory: parentTheory,
          practices: siblingPractices.length > 0 ? siblingPractices : [th],
        });
      }
    } else {
      standalonePractices.push(th);
    }
  });

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

const getEffectiveSoTc = (candidate: ClassModel, data: ClassModel[] = []): number => {
  if (candidate.SoTc && candidate.SoTc > 0) return candidate.SoTc;
  const match = data.find((c) => (c.MaMH === candidate.MaMH || c.TenMH === candidate.TenMH) && c.SoTc > 0);
  return match?.SoTc || 0;
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
  const [viewMode, setViewMode] = useState<'group' | 'list'>('group');

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

        <div className="course-picker-subbar">
          <div className="course-picker-count">
            <strong>{candidateGroups.length}</strong> môn · <strong>{availableCount}</strong> lớp có thể chọn
            {!!dimmedCount && <span> · {dimmedCount} lớp xung đột đang làm mờ</span>}
          </div>

          <ToggleButtonGroup
            value={viewMode}
            exclusive
            onChange={(_, val) => val && setViewMode(val)}
            size="small"
            className="course-view-toggle-group"
          >
            <ToggleButton value="group" aria-label="Chế độ nhóm môn">
              <ViewModuleIcon style={{ fontSize: 18, marginRight: 4 }} />
              Nhóm môn
            </ToggleButton>
            <ToggleButton value="list" aria-label="Chế độ danh sách lớp">
              <ViewListIcon style={{ fontSize: 18, marginRight: 4 }} />
              Danh sách
            </ToggleButton>
          </ToggleButtonGroup>
        </div>

        {viewMode === 'list' ? (
          <div className="course-flat-list-wrapper">
            <table className="course-flat-table">
              <thead>
                <tr>
                  <th style={{ width: '46px', textAlign: 'center' }}></th>
                  <th>Môn học</th>
                  <th>Mã lớp</th>
                  <th>Giảng viên</th>
                  <th>Thứ</th>
                  <th>Tiết</th>
                  <th>Phòng</th>
                  <th>Loại</th>
                  <th>Tín chỉ</th>
                </tr>
              </thead>
              <tbody>
                {candidates.map((candidate) => {
                  const key = getCandidateKey(candidate);
                  const conflict = conflictReasons.get(key);
                  const isDraftSelected = draftCandidates.some((d) => isSameAgGridRowId(d, candidate));
                  const isTkbSelected = selectedClasses.some((s) => isSameAgGridRowId(s, candidate));
                  const isActive = isDraftSelected || isTkbSelected;
                  const isTH = isThucHanhClass(candidate);

                  return (
                    <tr
                      key={key}
                      className={`course-flat-row ${conflict ? 'is-conflict' : ''} ${isActive ? 'is-active' : ''}`}
                      onClick={() => !conflict && chooseCandidate(candidate)}
                    >
                      <td style={{ textAlign: 'center' }} onClick={(e) => e.stopPropagation()}>
                        <input
                          type="checkbox"
                          checked={isActive}
                          disabled={!!conflict}
                          onChange={() => !conflict && chooseCandidate(candidate)}
                        />
                      </td>
                      <td className="cell-name">
                        <strong className="mh-title">{candidate.TenMH}</strong>
                        <span className="mh-code">{candidate.MaMH}</span>
                      </td>
                      <td className="cell-code">
                        <strong>{candidate.MaLop}</strong>
                      </td>
                      <td className="cell-gv">{candidate.TenGV || '—'}</td>
                      <td className="cell-thu">{candidate.Thu || '—'}</td>
                      <td className="cell-tiet">{candidate.Tiet || '—'}</td>
                      <td className="cell-phong">{candidate.PhongHoc || '—'}</td>
                      <td className="cell-type">
                        <Chip
                          size="small"
                          className={isTH ? 'chip-thuc-hanh' : 'chip-ly-thuyet'}
                          label={isTH ? 'Thực hành' : 'Lý thuyết'}
                        />
                      </td>
                      <td className="cell-sotc">
                        {candidate.SoTc || getEffectiveSoTc(candidate, data)}
                      </td>
                    </tr>
                  );
                })}
                {!candidates.length && (
                  <tr>
                    <td colSpan={9} style={{ textAlign: 'center', padding: '32px 16px' }}>
                      <Typography fontWeight={800}>Không tìm thấy lớp phù hợp</Typography>
                      <Typography variant="body2" color="text.secondary">
                        Thử bỏ bớt lớp đang chọn, đổi từ khóa hoặc chọn một vùng thời gian khác.
                      </Typography>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        ) : (
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
                    const { theoryNodes, standalonePractices } = buildTheoryPracticeTree(group.candidates, data);

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
                                    <Chip size="small" variant="outlined" label={`${theory.SoTc || getEffectiveSoTc(theory, data)} tín chỉ`} />
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
                                            <Chip size="small" variant="outlined" label={`${practice.SoTc || getEffectiveSoTc(practice, data)} tín chỉ`} />
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
                                  <Chip size="small" variant="outlined" label={`${practice.SoTc || getEffectiveSoTc(practice, data)} tín chỉ`} />
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
        )}
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

export function CoursePickerSidePanel({
  onClose,
  onOpenGroupModal,
  slotFilter,
  onClearSlotFilter,
  onHoverClass,
}: {
  onClose?: () => void;
  onOpenGroupModal?: () => void;
  slotFilter?: TimetablePickTarget | null;
  onClearSlotFilter?: () => void;
  onHoverClass?: (cls: ClassModel | null) => void;
}) {
  const [searchSubject, setSearchSubject] = useState('');
  const [searchMaLop, setSearchMaLop] = useState('');
  const [searchGv, setSearchGv] = useState('');
  const [searchThu, setSearchThu] = useState<string>('ALL');
  const [searchTiet, setSearchTiet] = useState('');
  const [searchPhong, setSearchPhong] = useState('');
  const [typeFilter, setTypeFilter] = useState<'ALL' | 'LT' | 'TH'>('ALL');
  const [sessionFilter, setSessionFilter] = useState<'ALL' | 'SANG' | 'CHIEU'>('ALL');
  const [avoidThuFilter, setAvoidThuFilter] = useState<string>('NONE');
  const [hideConflicts, setHideConflicts] = useState(false);

  const data = useTkbStore(selectFinalDataTkb);
  const selectedClasses = useTkbStore(selectSelectedClassesBuoc3);
  const setSelectedClasses = useTkbStore((state) => state.setSelectedClasses);

  const handleClearAllFilters = () => {
    setSearchSubject('');
    setSearchMaLop('');
    setSearchGv('');
    setSearchThu('ALL');
    setSearchTiet('');
    setSearchPhong('');
    setTypeFilter('ALL');
    setSessionFilter('ALL');
    setAvoidThuFilter('NONE');
    setHideConflicts(false);
    if (onClearSlotFilter) onClearSlotFilter();
  };

  const allCandidates = useMemo(() => {
    const normSubj = searchSubject.trim().toLocaleLowerCase('vi');
    const normLop = searchMaLop.trim().toLocaleLowerCase('vi');
    const normGv = searchGv.trim().toLocaleLowerCase('vi');
    const normTiet = searchTiet.trim();
    const normPhong = searchPhong.trim().toLocaleLowerCase('vi');

    return data
      .filter((candidate) => {
        if (!hasTimetableSlot(candidate)) return false;

        // Slot Filter from Timetable click
        if (slotFilter) {
          if (slotFilter.existing) {
            if (!isSameCoursePart(candidate, slotFilter.existing)) return false;
          } else if (slotFilter.thu) {
            if (!isSameThu(candidate.Thu, slotFilter.thu)) return false;
            if (slotFilter.tiets && slotFilter.tiets.length) {
              const candidatePeriods = getDanhSachTiet(candidate.Tiet);
              if (!candidatePeriods.some((tiet) => slotFilter.tiets.includes(tiet))) {
                return false;
              }
            }
          }
        }

        const isTH = isThucHanhClass(candidate);
        if (typeFilter === 'LT' && isTH) return false;
        if (typeFilter === 'TH' && !isTH) return false;

        // Session Filter (Buổi Sáng / Buổi Chiều)
        if (sessionFilter === 'SANG') {
          const tietStr = String(candidate.Tiet || '');
          if (!/[1-5]/.test(tietStr)) return false;
        } else if (sessionFilter === 'CHIEU') {
          const tietStr = String(candidate.Tiet || '');
          if (!/[6-90]/.test(tietStr)) return false;
        }

        // Avoid Day Filter (Tránh Thứ)
        if (avoidThuFilter !== 'NONE' && String(candidate.Thu) === avoidThuFilter) return false;

        if (normSubj) {
          const matchSubj = [candidate.TenMH, candidate.MaMH]
            .filter(Boolean)
            .some((val) => String(val).toLocaleLowerCase('vi').includes(normSubj));
          if (!matchSubj) return false;
        }

        if (normLop) {
          if (!candidate.MaLop || !candidate.MaLop.toLocaleLowerCase('vi').includes(normLop)) return false;
        }

        if (normGv) {
          if (!candidate.TenGV || !candidate.TenGV.toLocaleLowerCase('vi').includes(normGv)) return false;
        }

        if (searchThu !== 'ALL') {
          if (String(candidate.Thu) !== searchThu) return false;
        }

        if (normTiet) {
          if (!candidate.Tiet || !String(candidate.Tiet).includes(normTiet)) return false;
        }

        if (normPhong) {
          if (!candidate.PhongHoc || !candidate.PhongHoc.toLocaleLowerCase('vi').includes(normPhong)) return false;
        }

        return true;
      })
      .sort((a, b) =>
        `${a.TenMH}-${a.MaLop}`.localeCompare(`${b.TenMH}-${b.MaLop}`, 'vi', { sensitivity: 'base' }),
      );
  }, [data, searchSubject, searchMaLop, searchGv, searchThu, searchTiet, searchPhong, typeFilter, slotFilter]);

  const conflictReasons = useMemo(() => {
    const reasons = new Map<string, string>();
    allCandidates.forEach((candidate) => {
      if (selectedClasses.some((s) => isSameAgGridRowId(s, candidate))) return;
      const reason = getDraftConflictReason(candidate, selectedClasses, []);
      if (reason) reasons.set(getCandidateKey(candidate), reason);
    });
    return reasons;
  }, [allCandidates, selectedClasses]);

  const displayCandidates = useMemo(() => {
    if (!hideConflicts) return allCandidates;
    return allCandidates.filter((c) => !conflictReasons.has(getCandidateKey(c)));
  }, [allCandidates, hideConflicts, conflictReasons]);

  const toggleCandidate = (candidate: ClassModel) => {
    const isSelected = selectedClasses.some((s) => isSameAgGridRowId(s, candidate));
    if (isSelected) {
      setSelectedClasses(selectedClasses.filter((s) => !isSameAgGridRowId(s, candidate)));
      enqueueSnackbar(`Đã bỏ chọn ${candidate.MaLop}`, { variant: 'info' });
      return;
    }

    const isTH = isThucHanhClass(candidate);
    if (isTH) {
      const hasParentLT = selectedClasses.some((lt) => isTheoryClass(lt) && isPracticeOfTheory(candidate, lt));
      if (!hasParentLT) {
        const parentCode = getParentTheoryCode(candidate.MaLop);
        const parentTheory = data.find(
          (c) => isTheoryClass(c) && c.MaMH === candidate.MaMH && c.MaLop?.trim() === parentCode
        );
        if (parentTheory) {
          setSelectedClasses([...selectedClasses, parentTheory, candidate]);
          enqueueSnackbar(`Đã chọn ${candidate.MaLop} & tự động thêm lớp Lý thuyết ${parentTheory.MaLop}!`, { variant: 'success' });
          return;
        }
      }
    }

    setSelectedClasses(applyCandidateBatch(selectedClasses, [candidate]));
    enqueueSnackbar(`Đã thêm ${candidate.MaLop}`, { variant: 'success' });
  };

  return (
    <div className="course-picker-side-panel-container">
      {/* Top Toolbar matching reference screenshot */}
      <div className="side-panel-toolbar-row">
        <div className="toolbar-left-group">
          <div className="type-pill-group">
            <button
              type="button"
              className={`pill-btn ${typeFilter === 'ALL' ? 'active' : ''}`}
              onClick={() => setTypeFilter('ALL')}
            >
              Tất cả
            </button>
            <button
              type="button"
              className={`pill-btn ${typeFilter === 'LT' ? 'active' : ''}`}
              onClick={() => setTypeFilter('LT')}
            >
              LT
            </button>
            <button
              type="button"
              className={`pill-btn ${typeFilter === 'TH' ? 'active' : ''}`}
              onClick={() => setTypeFilter('TH')}
            >
              TH
            </button>
          </div>

          <button
            type="button"
            className={`hide-conflict-badge-btn ${hideConflicts ? 'active' : ''}`}
            onClick={() => setHideConflicts(!hideConflicts)}
          >
            Ẩn lớp không hợp lệ
          </button>
        </div>

        <div className="toolbar-right-group">
          <button
            type="button"
            className="view-toggle-mode-btn"
            onClick={() => {
              if (onOpenGroupModal) onOpenGroupModal();
            }}
          >
            Nhóm môn (Popup)
          </button>

          <button type="button" className="clear-filter-btn" onClick={handleClearAllFilters}>
            Xóa lọc
          </button>

          {onClose && (
            <button
              type="button"
              className="side-panel-close-btn"
              onClick={onClose}
              aria-label="Đóng bảng tìm kiếm"
            >
              <CloseIcon style={{ fontSize: 16 }} />
            </button>
          )}
        </div>
      </div>

      {slotFilter && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, margin: '2px 0' }}>
          <Chip
            size="small"
            color="primary"
            label={
              slotFilter.existing
                ? `Đang lọc môn: ${slotFilter.existing.TenMH}`
                : `Đang lọc: Thứ ${slotFilter.thu} ${slotFilter.label ? `(${slotFilter.label})` : ''}`
            }
            onDelete={onClearSlotFilter}
          />
        </div>
      )}

      <div className="course-flat-list-wrapper side-panel-list">
        <table className="course-flat-table side-panel-table">
          <thead>
            <tr>
              <th style={{ width: '36px', textAlign: 'center' }}></th>
              <th style={{ minWidth: '240px' }}>MÔN HỌC</th>
              <th style={{ width: '95px' }}>MÃ LỚP</th>
              <th style={{ width: '100px' }}>GIẢNG VIÊN</th>
              <th style={{ width: '55px' }}>THỨ</th>
              <th style={{ width: '65px' }}>TIẾT</th>
              <th style={{ width: '60px' }}>PHÒNG</th>
              <th style={{ width: '80px', textAlign: 'center' }}>LOẠI · TC</th>
            </tr>
            {/* Column-level search header row matching reference screenshot */}
            <tr className="filter-header-row">
              <th></th>
              <th>
                <input
                  type="text"
                  className="column-filter-input"
                  placeholder="Tên / mã môn..."
                  value={searchSubject}
                  onChange={(e) => setSearchSubject(e.target.value)}
                />
              </th>
              <th>
                <input
                  type="text"
                  className="column-filter-input"
                  placeholder="Mã lớp..."
                  value={searchMaLop}
                  onChange={(e) => setSearchMaLop(e.target.value)}
                />
              </th>
              <th>
                <input
                  type="text"
                  className="column-filter-input"
                  placeholder="GV / mã GV..."
                  value={searchGv}
                  onChange={(e) => setSearchGv(e.target.value)}
                />
              </th>
              <th>
                <select
                  className="column-filter-select"
                  value={searchThu}
                  onChange={(e) => setSearchThu(e.target.value)}
                >
                  <option value="ALL">Tất cả</option>
                  <option value="2">T2</option>
                  <option value="3">T3</option>
                  <option value="4">T4</option>
                  <option value="5">T5</option>
                  <option value="6">T6</option>
                  <option value="7">T7</option>
                </select>
              </th>
              <th>
                <input
                  type="text"
                  className="column-filter-input"
                  placeholder="vd 1-5 hoặc 678..."
                  value={searchTiet}
                  onChange={(e) => setSearchTiet(e.target.value)}
                />
              </th>
              <th>
                <input
                  type="text"
                  className="column-filter-input"
                  placeholder="Phòng..."
                  value={searchPhong}
                  onChange={(e) => setSearchPhong(e.target.value)}
                />
              </th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {displayCandidates.map((candidate) => {
              const key = getCandidateKey(candidate);
              const conflict = conflictReasons.get(key);
              const isActive = selectedClasses.some((s) => isSameAgGridRowId(s, candidate));
              const isTH = isThucHanhClass(candidate);
              const sotc = candidate.SoTc || getEffectiveSoTc(candidate, data);

              return (
                <tr
                  key={key}
                  className={`course-flat-row ${conflict ? 'is-conflict' : ''} ${isActive ? 'is-active' : ''}`}
                  onClick={() => !conflict && toggleCandidate(candidate)}
                  onMouseEnter={() => onHoverClass?.(candidate)}
                  onMouseLeave={() => onHoverClass?.(null)}
                >
                  <td style={{ textAlign: 'center' }} onClick={(e) => e.stopPropagation()}>
                    <input
                      type="checkbox"
                      checked={isActive}
                      disabled={!!conflict}
                      onChange={() => !conflict && toggleCandidate(candidate)}
                    />
                  </td>
                  <td className="cell-name">
                    <strong className="mh-title">{candidate.TenMH}</strong>
                    <span className="mh-code">{candidate.MaMH}</span>
                  </td>
                  <td className="cell-code">
                    <strong>{candidate.MaLop}</strong>
                  </td>
                  <td className="cell-gv" title={candidate.TenGV || ''}>
                    {candidate.TenGV || '—'}
                  </td>
                  <td className="cell-lich">
                    {candidate.Thu ? `T${candidate.Thu}` : '—'}
                  </td>
                  <td className="cell-lich">
                    {candidate.Tiet || '—'}
                  </td>
                  <td className="cell-phong">{candidate.PhongHoc || '—'}</td>
                  <td className="cell-type" style={{ textAlign: 'center' }}>
                    <Chip
                      size="small"
                      className={isTH ? 'chip-thuc-hanh' : 'chip-ly-thuyet'}
                      label={`${isTH ? 'TH' : 'LT'} · ${sotc}TC`}
                    />
                  </td>
                </tr>
              );
            })}
            {!displayCandidates.length && (
              <tr>
                <td colSpan={8} style={{ textAlign: 'center', padding: '32px 16px' }}>
                  <Typography fontWeight={800}>Không tìm thấy lớp phù hợp</Typography>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

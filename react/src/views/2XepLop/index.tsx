import SearchIcon from '@mui/icons-material/Search';
import Button from '@mui/material/Button';
import { enqueueSnackbar } from 'notistack';
import { useEffect, useRef, useState } from 'react';
import { useHistory } from 'react-router-dom';
import { ROUTES } from '../../constants';
import { selectSelectedClassesBuoc3, selectTongSoTcBuoc3, useTkbStore } from '../../zus';
import PlanSelectorBar from '../components/PlanSelectorBar';
import ThoiKhoaBieuTable, { TimetablePickTarget } from '../components/ThoiKhoaBieuTable';
import CoursePickerDialog, { CoursePickerSidePanel, PickerTarget } from './CoursePickerDialog';
import './styles.css';

function Index() {
  const history = useHistory();
  const [pickerTarget, setPickerTarget] = useState<PickerTarget | null>(null);
  const [isSidePanelOpen, setIsSidePanelOpen] = useState<boolean>(false);
  const [selectedSlotFilter, setSelectedSlotFilter] = useState<TimetablePickTarget | null>(null);
  const [sidePanelWidth, setSidePanelWidth] = useState<number>(560);
  const [isResizing, setIsResizing] = useState<boolean>(false);
  const splitContainerRef = useRef<HTMLDivElement>(null);

  const selectedClasses = useTkbStore(selectSelectedClassesBuoc3);
  const credits = useTkbStore(selectTongSoTcBuoc3);
  const setSelectedClasses = useTkbStore((s) => s.setSelectedClasses);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'x') {
        e.preventDefault();
        setIsSidePanelOpen((prev) => !prev);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isResizing || !splitContainerRef.current) return;
      const rect = splitContainerRef.current.getBoundingClientRect();
      const newWidth = e.clientX - rect.left;
      const maxW = Math.min(950, rect.width - 320);
      if (newWidth >= 320 && newWidth <= maxW) {
        setSidePanelWidth(newWidth);
      }
    };

    const handleMouseUp = () => {
      setIsResizing(false);
    };

    if (isResizing) {
      document.body.style.userSelect = 'none';
      document.body.style.cursor = 'col-resize';
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
    } else {
      document.body.style.userSelect = '';
      document.body.style.cursor = '';
    }

    return () => {
      document.body.style.userSelect = '';
      document.body.style.cursor = '';
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isResizing]);

  const openPickerFromTimetable = (target: TimetablePickTarget) => {
    if (isSidePanelOpen) {
      // If Side Search Panel (List Mode) is OPEN, filter panel directly without popup!
      setSelectedSlotFilter(target);
    } else {
      // If Side Search Panel is CLOSED, open centered Group Mode Popup Dialog!
      if (target.existing) {
        setPickerTarget({ kind: 'replace', existing: target.existing });
      } else if (target.label === 'Ngoài giờ') {
        setIsSidePanelOpen(true);
      } else {
        setPickerTarget({ kind: 'slot', thu: target.thu, tiets: target.tiets, label: target.label });
      }
    }
  };

  const handleClearAll = () => {
    setSelectedClasses([]);
    enqueueSnackbar('Đã xóa tất cả các môn khỏi thời khóa biểu', { variant: 'info' });
  };

  return (
    <section className={`page-wrap wide builder-page ${isSidePanelOpen ? 'has-open-side-drawer' : ''}`}>
      {/* UNIFIED WORKSPACE CONTAINER CARD MATCHING DIAGRAM */}
      <div className="surface-card builder-workspace-card">
        {/* MIDDLE ROW: Integrated Split Layout */}
        <div
          className={`builder-split-layout ${isResizing ? 'is-resizing' : ''}`}
          ref={splitContainerRef}
        >
          {/* LEFT COLUMN: Inline Search List Panel */}
          {isSidePanelOpen && (
            <>
              <div
                className="builder-inline-side-panel"
                style={{ width: `${sidePanelWidth}px` }}
              >
                <CoursePickerSidePanel
                  onClose={() => {
                    setIsSidePanelOpen(false);
                    setSelectedSlotFilter(null);
                  }}
                  onOpenGroupModal={() => {
                    setIsSidePanelOpen(false);
                    setSelectedSlotFilter(null);
                    setPickerTarget({ kind: 'all' });
                  }}
                  slotFilter={selectedSlotFilter}
                  onClearSlotFilter={() => setSelectedSlotFilter(null)}
                />
              </div>

              {/* DRAGGABLE RESIZER HANDLE */}
              <div
                className="builder-inline-resizer"
                onMouseDown={(e) => {
                  e.preventDefault();
                  setIsResizing(true);
                }}
                title="Kéo rê để thay đổi chiều rộng bảng tìm kiếm"
              >
                <div className="resizer-handle-line" />
              </div>
            </>
          )}

          {/* RIGHT COLUMN: Timetable Grid */}
          <div className="builder-timetable-column">
            <ThoiKhoaBieuTable interactive onPickSlot={openPickerFromTimetable} />
          </div>
        </div>
      </div>

      <div className={`builder-action-dock ${isSidePanelOpen ? 'is-compact' : ''}`} role="region" aria-label="Hành động xếp lớp">
        {!isSidePanelOpen && (
          <div
            className="builder-dock-search"
            role="button"
            tabIndex={0}
            onClick={() => setIsSidePanelOpen(true)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                setIsSidePanelOpen(true);
              }
            }}
          >
            <SearchIcon className="builder-dock-search-icon" />
            <span className="builder-dock-search-placeholder">
              Tìm tên môn, mã môn, giảng viên...
            </span>
            <span className="builder-dock-shortcut">Ctrl + X</span>
          </div>
        )}
        <div className="stat-pill-group">
          <div className="stat-pill stat-pill-solid">
            <strong className="stat-pill-num">{selectedClasses.length}</strong>
            <span className="stat-pill-txt">lớp</span>
          </div>
          <div className="stat-pill stat-pill-solid">
            <strong className="stat-pill-num">{credits}</strong>
            <span className="stat-pill-txt">tín chỉ</span>
          </div>
        </div>
        <div className="builder-dock-actions">
          <Button
            variant="outlined"
            color="error"
            className="builder-clear-btn"
            disabled={!selectedClasses.length}
            onClick={handleClearAll}
          >
            Xóa hết
          </Button>
          <Button
            variant="contained"
            disabled={!selectedClasses.length}
            onClick={() => history.push(ROUTES._3KetQua.path)}
          >
            Hoàn tất
          </Button>
        </div>
      </div>

      <PlanSelectorBar />
      <CoursePickerDialog target={pickerTarget} onClose={() => setPickerTarget(null)} />
    </section>
  );
}

export default Index;

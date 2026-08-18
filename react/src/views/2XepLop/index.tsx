import SearchIcon from '@mui/icons-material/Search';
import Button from '@mui/material/Button';
import Paper from '@mui/material/Paper';
import { enqueueSnackbar } from 'notistack';
import { useEffect, useState } from 'react';
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

  const openPickerFromTimetable = (target: TimetablePickTarget) => {
    if (target.existing) {
      setPickerTarget({ kind: 'replace', existing: target.existing });
    } else if (target.label === 'Ngoài giờ') {
      setIsSidePanelOpen(true);
    } else {
      setPickerTarget({ kind: 'slot', thu: target.thu, tiets: target.tiets, label: target.label });
    }
  };

  const handleClearAll = () => {
    setSelectedClasses([]);
    enqueueSnackbar('Đã xóa tất cả các môn khỏi thời khóa biểu', { variant: 'info' });
  };

  return (
    <section className="page-wrap wide builder-page">
      <PlanSelectorBar />

      <div className="builder-split-layout">
        {/* LEFT PANEL: Inline Search & List View Panel (Appears when toggled) */}
        {isSidePanelOpen && (
          <Paper className="surface-card builder-side-panel">
            <CoursePickerSidePanel
              onClose={() => setIsSidePanelOpen(false)}
              onOpenGroupModal={() => setPickerTarget({ kind: 'all' })}
            />
          </Paper>
        )}

        {/* RIGHT PANEL: Timetable Grid */}
        <Paper className="surface-card timetable-card builder-timetable">
          <ThoiKhoaBieuTable interactive onPickSlot={openPickerFromTimetable} />
        </Paper>
      </div>

      <div className="builder-action-dock" role="region" aria-label="Hành động xếp lớp">
        <div
          className="builder-dock-search"
          role="button"
          tabIndex={0}
          onClick={() => setIsSidePanelOpen((prev) => !prev)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              setIsSidePanelOpen((prev) => !prev);
            }
          }}
        >
          <SearchIcon className="builder-dock-search-icon" />
          <span className="builder-dock-search-placeholder">
            {isSidePanelOpen ? 'Thu gọn bảng tìm kiếm' : 'Tìm tên môn, mã môn, giảng viên...'}
          </span>
          <span className="builder-dock-shortcut">Ctrl + X</span>
        </div>
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

      <CoursePickerDialog target={pickerTarget} onClose={() => setPickerTarget(null)} />
    </section>
  );
}

export default Index;

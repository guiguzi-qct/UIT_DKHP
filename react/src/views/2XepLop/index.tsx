import Button from '@mui/material/Button';
import Chip from '@mui/material/Chip';
import Paper from '@mui/material/Paper';
import { enqueueSnackbar } from 'notistack';
import { useState } from 'react';
import { useHistory } from 'react-router-dom';
import { ROUTES } from '../../constants';
import { selectSelectedClassesBuoc3, selectTongSoTcBuoc3, useTkbStore } from '../../zus';
import PlanSelectorBar from '../components/PlanSelectorBar';
import ThoiKhoaBieuTable, { TimetablePickTarget } from '../components/ThoiKhoaBieuTable';
import CoursePickerDialog, { PickerTarget } from './CoursePickerDialog';
import './styles.css';

function Index() {
  const history = useHistory();
  const [pickerTarget, setPickerTarget] = useState<PickerTarget | null>(null);
  const selectedClasses = useTkbStore(selectSelectedClassesBuoc3);
  const credits = useTkbStore(selectTongSoTcBuoc3);
  const setSelectedClasses = useTkbStore((s) => s.setSelectedClasses);

  const openPickerFromTimetable = (target: TimetablePickTarget) => {
    if (target.existing) setPickerTarget({ kind: 'replace', existing: target.existing });
    else setPickerTarget({ kind: 'slot', thu: target.thu, tiets: target.tiets, label: target.label });
  };

  const handleClearAll = () => {
    setSelectedClasses([]);
    enqueueSnackbar('Đã xóa tất cả các môn khỏi thời khóa biểu', { variant: 'info' });
  };

  return (
    <section className="page-wrap wide builder-page">
      <PlanSelectorBar />

      <Paper className="surface-card timetable-card builder-timetable">
        <ThoiKhoaBieuTable interactive onPickSlot={openPickerFromTimetable} />
      </Paper>

      <div className="builder-action-dock" role="region" aria-label="Hành động xếp lớp">
        <div className="builder-dock-copy">
          <strong>Xếp lớp trực tiếp trên lịch</strong>
          <span>Click vùng trống để thêm môn hoặc click lớp đã xếp để đổi lớp.</span>
        </div>
        <div className="builder-stats">
          <Chip label={`${selectedClasses.length} lớp`} color={selectedClasses.length ? 'primary' : 'default'} />
          <Chip label={`${credits} tín chỉ`} variant="outlined" />
        </div>
        <div className="builder-dock-actions">
          <Button
            variant="outlined"
            color="error"
            disabled={!selectedClasses.length}
            onClick={handleClearAll}
          >
            Xóa hết
          </Button>
          <Button variant="outlined" onClick={() => setPickerTarget({ kind: 'all' })}>
            Chọn môn
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

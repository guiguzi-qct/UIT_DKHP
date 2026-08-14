import Button from '@mui/material/Button';
import Chip from '@mui/material/Chip';
import Paper from '@mui/material/Paper';
import { useState } from 'react';
import { useHistory } from 'react-router-dom';
import { ROUTES } from '../../constants';
import { selectSelectedClasses, selectTongSoTcSelected, useTkbStore } from '../../zus';
import ThoiKhoaBieuTable, { TimetablePickTarget } from '../components/ThoiKhoaBieuTable';
import CoursePickerDialog, { PickerTarget } from './CoursePickerDialog';
import './styles.css';

function Index() {
  const history = useHistory();
  const [pickerTarget, setPickerTarget] = useState<PickerTarget | null>(null);
  const selectedClasses = useTkbStore(selectSelectedClasses);
  const credits = useTkbStore(selectTongSoTcSelected);

  const openPickerFromTimetable = (target: TimetablePickTarget) => {
    if (target.existing) setPickerTarget({ kind: 'replace', existing: target.existing });
    else setPickerTarget({ kind: 'slot', thu: target.thu, tiets: target.tiets, label: target.label });
  };

  return (
    <section className="page-wrap wide builder-page">
      <Paper className="surface-card builder-toolbar">
        <div className="builder-title">
          <h1>Xếp lớp trực tiếp trên lịch</h1>
          <p>Click ô trống để thêm môn, hoặc click lớp đã xếp để đổi sang lớp khác.</p>
        </div>
        <div className="builder-stats">
          <Chip label={`${selectedClasses.length} lớp`} color={selectedClasses.length ? 'primary' : 'default'} />
          <Chip label={`${credits} tín chỉ`} variant="outlined" />
        </div>
      </Paper>

      <div className="builder-tip">Di chuột qua vùng trống để chọn lớp phù hợp với buổi học.</div>

      <Paper className="surface-card timetable-card builder-timetable">
        <ThoiKhoaBieuTable interactive onPickSlot={openPickerFromTimetable} />
      </Paper>

      <div className="builder-action-dock" role="region" aria-label="Hành động xếp lớp">
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

      <CoursePickerDialog target={pickerTarget} onClose={() => setPickerTarget(null)} />
    </section>
  );
}

export default Index;

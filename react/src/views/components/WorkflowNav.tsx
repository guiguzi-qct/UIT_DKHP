import CalendarMonthOutlinedIcon from '@mui/icons-material/CalendarMonthOutlined';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import PlaylistAddCheckOutlinedIcon from '@mui/icons-material/PlaylistAddCheckOutlined';
import UploadFileOutlinedIcon from '@mui/icons-material/UploadFileOutlined';
import { NavLink, useLocation } from 'react-router-dom';
import { ROUTES } from '../../constants';
import { selectFinalDataTkb, selectSelectedClasses, useTkbStore } from '../../zus';

const steps = [
  { ...ROUTES._1ChonFileExcel, shortName: 'Nhập dữ liệu', description: 'Chọn file Excel', icon: UploadFileOutlinedIcon },
  { ...ROUTES._2XepLop, shortName: 'Chọn lớp', description: 'Tìm và lọc lớp', icon: PlaylistAddCheckOutlinedIcon },
  { ...ROUTES._3KetQua, shortName: 'Thời khóa biểu', description: 'Kiểm tra kết quả', icon: CalendarMonthOutlinedIcon },
] as const;

export default function WorkflowNav() {
  const location = useLocation();
  const data = useTkbStore(selectFinalDataTkb);
  const selectedClasses = useTkbStore(selectSelectedClasses);
  const completion = [data.length > 0, selectedClasses.length > 0, false];

  return (
    <nav className="workflow-nav" aria-label="Các bước tạo thời khóa biểu">
      {steps.map((step, index) => {
        const Icon = step.icon;
        const isActive = location.pathname === step.path;
        const isDisabled = index > 0 && data.length === 0;
        const className = ['workflow-step', isActive ? 'active' : '', isDisabled ? 'disabled' : '']
          .filter(Boolean)
          .join(' ');

        if (isDisabled) {
          return (
            <span className={className} aria-disabled="true" key={step.path}>
              <span className="workflow-step-icon"><Icon /></span>
              <span className="workflow-step-copy"><strong>{step.shortName}</strong><small>{step.description}</small></span>
            </span>
          );
        }

        return (
          <NavLink className={className} to={step.path + location.search} key={step.path}>
            <span className="workflow-step-icon">
              {completion[index] && !isActive ? <CheckCircleIcon className="completed-icon" /> : <Icon />}
            </span>
            <span className="workflow-step-copy"><strong>{step.shortName}</strong><small>{step.description}</small></span>
          </NavLink>
        );
      })}
    </nav>
  );
}

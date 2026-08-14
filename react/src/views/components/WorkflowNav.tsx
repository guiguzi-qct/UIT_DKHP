import { NavLink, useLocation } from 'react-router-dom';
import { ROUTES } from '../../constants';
import { selectFinalDataTkb, selectSelectedClassesBuoc3, useTkbStore } from '../../zus';

const steps = [
  { ...ROUTES._1ChonFileExcel, shortName: 'Nhập dữ liệu', description: 'Chọn file Excel' },
  { ...ROUTES._2XepLop, shortName: 'Chọn lớp', description: 'Tìm và lọc lớp' },
  { ...ROUTES._3KetQua, shortName: 'Thời khóa biểu', description: 'Kiểm tra kết quả' },
] as const;

export default function WorkflowNav() {
  const location = useLocation();
  const data = useTkbStore(selectFinalDataTkb);
  const selectedClasses = useTkbStore(selectSelectedClassesBuoc3);
  const completion = [data.length > 0, selectedClasses.length > 0, false];

  return (
    <nav className="workflow-nav" aria-label="Các bước tạo thời khóa biểu">
      {steps.map((step, index) => {
        const isActive = location.pathname === step.path;
        const isDisabled = index > 0 && data.length === 0;
        const className = ['workflow-step', isActive ? 'active' : '', isDisabled ? 'disabled' : '']
          .filter(Boolean)
          .join(' ');

        if (isDisabled) {
          return (
            <span className={className} aria-disabled="true" key={step.path}>
              <span className="workflow-step-number">{index + 1}</span>
              <span className="workflow-step-copy">
                <strong>{step.shortName}</strong>
                <small>{step.description}</small>
              </span>
            </span>
          );
        }

        return (
          <NavLink className={className} to={step.path + location.search} key={step.path}>
            <span className="workflow-step-number">{completion[index] && !isActive ? '✓' : index + 1}</span>
            <span className="workflow-step-copy">
              <strong>{step.shortName}</strong>
              <small>{step.description}</small>
            </span>
          </NavLink>
        );
      })}
    </nav>
  );
}

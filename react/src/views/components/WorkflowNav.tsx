import { NavLink, useLocation } from 'react-router-dom';
import { ROUTES } from '../../constants';
import { selectFinalDataTkb, useTkbStore } from '../../zus';

const step1 = { ...ROUTES._1ChonFileExcel, shortName: 'Nhập dữ liệu', description: 'Chọn file Excel' } as const;

const steps24 = [
  { ...ROUTES._2XepLop, shortName: 'Chỉnh sửa', description: 'Tìm và lọc lớp' },
  { ...ROUTES._3KetQua, shortName: 'Thời khóa biểu', description: 'Kiểm tra kết quả' },
  { ...ROUTES._4DangKyNhanh, shortName: 'Hỗ trợ đăng ký', description: 'Xuất mã & Script' },
] as const;

export default function WorkflowNav() {
  const location = useLocation();
  const data = useTkbStore(selectFinalDataTkb);

  const isStep1Active = location.pathname === step1.path;

  return (
    <nav className="workflow-nav" aria-label="Điều hướng các bước">
      {/* Step 1 separated */}
      <NavLink
        className={`workflow-step ${isStep1Active ? 'active' : ''}`}
        to={step1.path + location.search}
      >
        <span className="workflow-step-title">{step1.shortName}</span>
      </NavLink>

      <span className="workflow-nav-divider" />

      {/* Steps 2-4 */}
      {steps24.map((step) => {
        const isActive = location.pathname === step.path;
        const isDisabled = data.length === 0;
        const className = ['workflow-step', isActive ? 'active' : '', isDisabled ? 'disabled' : '']
          .filter(Boolean)
          .join(' ');

        if (isDisabled) {
          return (
            <span className={className} aria-disabled="true" key={step.path}>
              <span className="workflow-step-title">{step.shortName}</span>
            </span>
          );
        }

        return (
          <NavLink className={className} to={step.path + location.search} key={step.path}>
            <span className="workflow-step-title">{step.shortName}</span>
          </NavLink>
        );
      })}
    </nav>
  );
}

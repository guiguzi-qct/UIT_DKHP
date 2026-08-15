import React from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { ROUTES } from '../../constants';
import { selectFinalDataTkb, useTkbStore } from '../../zus';

const steps = [
  { ...ROUTES._1ChonFileExcel, shortName: 'Nhập dữ liệu' },
  { ...ROUTES._2XepLop, shortName: 'Chỉnh sửa' },
  { ...ROUTES._3KetQua, shortName: 'Thời khóa biểu' },
  { ...ROUTES._4DangKyNhanh, shortName: 'Hỗ trợ đăng ký' },
] as const;

export default function WorkflowNav() {
  const location = useLocation();
  const data = useTkbStore(selectFinalDataTkb);

  return (
    <nav className="workflow-nav" aria-label="Điều hướng các bước">
      {steps.map((step, index) => {
        const isActive = location.pathname === step.path;
        const isDisabled = index > 0 && data.length === 0;
        const className = ['workflow-step', isActive ? 'active' : '', isDisabled ? 'disabled' : '']
          .filter(Boolean)
          .join(' ');

        return (
          <React.Fragment key={step.path}>
            {index === 1 && <span className="workflow-nav-divider" />}

            {isDisabled ? (
              <span className={className} aria-disabled="true">
                <span className="workflow-step-title">{step.shortName}</span>
              </span>
            ) : (
              <NavLink className={className} to={step.path + location.search}>
                <span className="workflow-step-title">{step.shortName}</span>
              </NavLink>
            )}
          </React.Fragment>
        );
      })}
    </nav>
  );
}

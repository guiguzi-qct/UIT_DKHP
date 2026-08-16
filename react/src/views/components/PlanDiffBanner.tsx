import Button from '@mui/material/Button';
import React, { useMemo } from 'react';
import { calcTongSoTC } from '../../utils';
import { selectActivePlanId, selectPlans, useTkbStore } from '../../zus';
import './PlanDiffBanner.css';

export default function PlanDiffBanner() {
  const plans = useTkbStore(selectPlans);
  const activePlanId = useTkbStore(selectActivePlanId);
  const diffComparePlanId = useTkbStore((s) => s.diffComparePlanId);
  const setDiffComparePlanId = useTkbStore((s) => s.setDiffComparePlanId);

  const activePlan = useMemo(() => plans.find((p) => p.id === activePlanId) || plans[0], [plans, activePlanId]);
  const comparePlan = useMemo(() => plans.find((p) => p.id === diffComparePlanId), [plans, diffComparePlanId]);

  if (!comparePlan || comparePlan.id === activePlan.id) return null;

  const planAClasses = (activePlan.selectedClasses || []).filter((c): c is typeof activePlan.selectedClasses[0] => !!c);
  const planBClasses = (comparePlan.selectedClasses || []).filter((c): c is typeof comparePlan.selectedClasses[0] => !!c);

  const planACount = planAClasses.length;
  const planBCount = planBClasses.length;

  const planATc = calcTongSoTC(planAClasses);
  const planBTc = calcTongSoTC(planBClasses);

  const getDaysCount = (classes: typeof planAClasses) => {
    const days = new Set<string>();
    classes.forEach((c) => {
      if (c && c.Thu && /^[2-7]$/.test(String(c.Thu).trim())) {
        days.add(String(c.Thu).trim());
      }
    });
    return days.size;
  };

  const planADays = getDaysCount(planAClasses);
  const planBDays = getDaysCount(planBClasses);

  const commonClassesCount = planAClasses.filter((cA) =>
    cA && cA.MaLop && planBClasses.some((cB) => cB && cB.MaLop && String(cB.MaLop).trim() === String(cA.MaLop).trim()),
  ).length;

  return (
    <div className="plan-diff-banner-wrap">
      <div className="plan-diff-top">
        <div className="plan-diff-title">
          <strong>Đang so sánh:</strong>
          <span className="plan-diff-badge badge-plan-a">{activePlan.name} (Gốc)</span>
          <span style={{ fontSize: 13, fontWeight: 700, color: '#59899D' }}>vs</span>
          <span className="plan-diff-badge badge-plan-b">{comparePlan.name}</span>
        </div>

        <Button
          size="small"
          variant="outlined"
          color="inherit"
          style={{ borderColor: '#0E2128', color: '#0E2128', fontWeight: 800 }}
          onClick={() => setDiffComparePlanId(null)}
        >
          Thoát so sánh
        </Button>
      </div>

      <div className="plan-diff-stats-grid">
        <div className="diff-stat-card">
          <span className="diff-stat-label">Tổng số tín chỉ</span>
          <div className="diff-stat-values">
            <span className="diff-val-pill pill-plan-a">{activePlan.name}: {planATc} TC</span>
            <span className="diff-val-pill pill-plan-b">{comparePlan.name}: {planBTc} TC</span>
          </div>
        </div>

        <div className="diff-stat-card">
          <span className="diff-stat-label">Số ngày đi học</span>
          <div className="diff-stat-values">
            <span className="diff-val-pill pill-plan-a">{activePlan.name}: {planADays} ngày</span>
            <span className="diff-val-pill pill-plan-b">{comparePlan.name}: {planBDays} ngày</span>
          </div>
        </div>

        <div className="diff-stat-card">
          <span className="diff-stat-label">Số môn học chung</span>
          <div className="diff-stat-values">
            <span className="diff-val-pill pill-common">
              {commonClassesCount} / {Math.max(planACount, planBCount)} môn giống nhau
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

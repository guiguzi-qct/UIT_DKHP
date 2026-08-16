import Button from '@mui/material/Button';
import React, { useMemo } from 'react';
import { calcTongSoTC, getDanhSachTiet } from '../../utils';
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

  const planACount = activePlan.selectedClasses.length;
  const planBCount = comparePlan.selectedClasses.length;

  const planATc = calcTongSoTC(activePlan.selectedClasses);
  const planBTc = calcTongSoTC(comparePlan.selectedClasses);

  const getDaysCount = (classes: typeof activePlan.selectedClasses) => {
    const days = new Set<string>();
    classes.forEach((c) => {
      if (c.Thu && /^[2-7]$/.test(c.Thu.trim())) {
        days.add(c.Thu.trim());
      }
    });
    return days.size;
  };

  const getMorningPeriodsCount = (classes: typeof activePlan.selectedClasses) => {
    let count = 0;
    classes.forEach((c) => {
      const tiets = getDanhSachTiet(c.Tiet);
      tiets.forEach((t) => {
        const num = Number(t === '0' ? 10 : t);
        if (num >= 1 && num <= 5) count++;
      });
    });
    return count;
  };

  const planADays = getDaysCount(activePlan.selectedClasses);
  const planBDays = getDaysCount(comparePlan.selectedClasses);

  const planAMorning = getMorningPeriodsCount(activePlan.selectedClasses);
  const planBMorning = getMorningPeriodsCount(comparePlan.selectedClasses);

  const commonClassesCount = activePlan.selectedClasses.filter((cA) =>
    comparePlan.selectedClasses.some((cB) => cB.MaLop?.trim() === cA.MaLop?.trim()),
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
            <span>{activePlan.name}: <strong>{planATc} TC</strong></span>
            <span>·</span>
            <span>{comparePlan.name}: <strong>{planBTc} TC</strong></span>
          </div>
        </div>

        <div className="diff-stat-card">
          <span className="diff-stat-label">Số ngày đi học</span>
          <div className="diff-stat-values">
            <span>{activePlan.name}: <strong>{planADays} ngày</strong></span>
            <span>·</span>
            <span>{comparePlan.name}: <strong>{planBDays} ngày</strong></span>
          </div>
        </div>

        <div className="diff-stat-card">
          <span className="diff-stat-label">Số tiết ca sáng (1-5)</span>
          <div className="diff-stat-values">
            <span>{activePlan.name}: <strong>{planAMorning} tiết</strong></span>
            <span>·</span>
            <span>{comparePlan.name}: <strong>{planBMorning} tiết</strong></span>
          </div>
        </div>

        <div className="diff-stat-card">
          <span className="diff-stat-label">Số môn học chung</span>
          <div className="diff-stat-values">
            <strong>{commonClassesCount} / {Math.max(planACount, planBCount)} môn giống nhau</strong>
          </div>
        </div>
      </div>
    </div>
  );
}

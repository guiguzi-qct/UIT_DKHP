import React from 'react';
import { selectActivePlanId, selectPlans, useTkbStore } from '../../../zus';

function TableHead() {
  const diffComparePlanId = useTkbStore((s) => s.diffComparePlanId);
  const activePlanId = useTkbStore(selectActivePlanId);
  const plans = useTkbStore(selectPlans);

  const activePlan = plans.find((p) => p.id === activePlanId) || plans[0];
  const comparePlan = plans.find((p) => p.id === diffComparePlanId);

  if (comparePlan && comparePlan.id !== activePlan.id) {
    return (
      <thead>
        <tr>
          <th rowSpan={2} style={{ verticalAlign: 'middle' }}>Thứ / Tiết</th>
          <th colSpan={2}>Thứ 2</th>
          <th colSpan={2}>Thứ 3</th>
          <th colSpan={2}>Thứ 4</th>
          <th colSpan={2}>Thứ 5</th>
          <th colSpan={2}>Thứ 6</th>
          <th colSpan={2}>Thứ 7</th>
        </tr>
        <tr>
          <th style={{ fontSize: '11px', background: '#D0E8F5', color: '#0E2128', padding: '4px 6px' }}>{activePlan.name}</th>
          <th style={{ fontSize: '11px', background: '#FFE8CC', color: '#0E2128', padding: '4px 6px' }}>{comparePlan.name}</th>
          <th style={{ fontSize: '11px', background: '#D0E8F5', color: '#0E2128', padding: '4px 6px' }}>{activePlan.name}</th>
          <th style={{ fontSize: '11px', background: '#FFE8CC', color: '#0E2128', padding: '4px 6px' }}>{comparePlan.name}</th>
          <th style={{ fontSize: '11px', background: '#D0E8F5', color: '#0E2128', padding: '4px 6px' }}>{activePlan.name}</th>
          <th style={{ fontSize: '11px', background: '#FFE8CC', color: '#0E2128', padding: '4px 6px' }}>{comparePlan.name}</th>
          <th style={{ fontSize: '11px', background: '#D0E8F5', color: '#0E2128', padding: '4px 6px' }}>{activePlan.name}</th>
          <th style={{ fontSize: '11px', background: '#FFE8CC', color: '#0E2128', padding: '4px 6px' }}>{comparePlan.name}</th>
          <th style={{ fontSize: '11px', background: '#D0E8F5', color: '#0E2128', padding: '4px 6px' }}>{activePlan.name}</th>
          <th style={{ fontSize: '11px', background: '#FFE8CC', color: '#0E2128', padding: '4px 6px' }}>{comparePlan.name}</th>
          <th style={{ fontSize: '11px', background: '#D0E8F5', color: '#0E2128', padding: '4px 6px' }}>{activePlan.name}</th>
          <th style={{ fontSize: '11px', background: '#FFE8CC', color: '#0E2128', padding: '4px 6px' }}>{comparePlan.name}</th>
        </tr>
      </thead>
    );
  }

  return (
    <thead>
      <tr>
        <th>Thứ / Tiết</th>
        <th>Thứ 2</th>
        <th>Thứ 3</th>
        <th>Thứ 4</th>
        <th>Thứ 5</th>
        <th>Thứ 6</th>
        <th>Thứ 7</th>
      </tr>
    </thead>
  );
}

export default TableHead;

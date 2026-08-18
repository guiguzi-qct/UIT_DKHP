import React from 'react';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import DownloadIcon from '@mui/icons-material/Download';
import Button from '@mui/material/Button';
import clsx from 'clsx';
import { useLocation } from 'react-router-dom';
import { ROUTES } from '../../../constants';
import { ClassModel } from '../../../types';
import { extractThuList, getDanhSachTiet } from '../../../utils';

import ErrorBoundary from '../ErrorBoundary';
import ClassCell, { ClassCellContext } from './ClassCell';
import TableHead from './TableHead';
import {
  CELL,
  PhanLoaiHocTrenTruongContext,
  type RowData,
  usePhanLoaiHocTrenTruongContext,
  useProcessImageTkb,
} from './hooks';
import './styles.css';
import { timeLookup, tietOnline } from './utils';

export type TimetablePickTarget = {
  thu: number;
  tiets: string[];
  label: string;
  existing?: ClassModel;
};

type InteractiveProps = {
  interactive?: boolean;
  onPickSlot?: (target: TimetablePickTarget) => void;
  hoveredClass?: ClassModel | null;
};

type TietGroup = {
  start: number;
  end: number;
  label: string;
};

const DAY_NUMBERS = [2, 3, 4, 5, 6, 7] as const;
const MAIN_GROUPS: TietGroup[] = [
  { start: 0, end: 4, label: 'Buổi sáng' },
  { start: 5, end: 9, label: 'Buổi chiều' },
];

const getDayKey = (thu: number) => `Thu${thu}` as keyof RowData;
const getTietValue = (index: number) => (index === 9 ? '0' : String(index + 1));
const getTietLabel = (index: number) => String(index + 1);

const getRangeLabel = (start: number, end: number, group: TietGroup) => {
  if (start === group.start && end === group.end) {
    return group.label;
  }
  if (start === end) return `Tiết ${getTietLabel(start)}`;
  return `Tiết ${getTietLabel(start)}–${getTietLabel(end)}`;
};

const getEmptyRun = (rows: RowData[], thu: number, index: number, group: TietGroup) => {
  const dayKey = getDayKey(thu);
  let start = index;
  let end = index;

  while (start > group.start && rows[start - 1][dayKey] === CELL.NO_CLASS) start -= 1;
  while (end < group.end && rows[end + 1][dayKey] === CELL.NO_CLASS) end += 1;

  return { start, end };
};

const GetCell = ({
  data,
  thu,
  tiets,
  label,
  rowSpan,
  interactive,
  onPickSlot,
}: {
  data: any;
  thu: number;
  tiets: string[];
  label: string;
  rowSpan?: number;
} & InteractiveProps) => {
  if (data === CELL.NO_CLASS) {
    return (
      <td rowSpan={rowSpan} className={clsx('empty-schedule-slot', { 'empty-pickable-slot': interactive })}>
        {interactive ? (
          <button
            className="empty-slot-button"
            type="button"
            onClick={() => onPickSlot?.({ thu, tiets, label })}
            aria-label={`Chọn lớp cho Thứ ${thu}, ${label}`}
          >
            <span className="empty-slot-label">{label}</span>
            <span className="empty-slot-action">Click để chọn</span>
          </button>
        ) : (
          <span className="empty-slot-label static">{label}</span>
        )}
      </td>
    );
  }

  if (data === CELL.OCCUPIED) return null;

  if (Array.isArray(data)) {
    const maxSpan = Math.max(...data.map((item) => getDanhSachTiet(item.Tiet).length));
    return (
      <ClassCell
        data={data as any}
        rowSpan={maxSpan}
        interactive={interactive}
        onPick={() => onPickSlot?.({ thu, tiets, label, existing: data[0] })}
      />
    );
  }

  return (
    <ClassCell
      data={data}
      rowSpan={getDanhSachTiet(data.Tiet).length}
      interactive={interactive}
      onPick={() => onPickSlot?.({ thu, tiets, label, existing: data })}
    />
  );
};

function MainPeriodRow({
  rows,
  index,
  group,
  interactive,
  onPickSlot,
  hoveredClass,
}: {
  rows: RowData[];
  index: number;
  group: TietGroup;
} & InteractiveProps) {
  const row = rows[index];

  return (
    <tr className="main-period-row">
      <td className="cell-tiet">
        <strong>Tiết {index + 1}</strong>
        <span>{timeLookup[index]}</span>
      </td>
      {DAY_NUMBERS.map((thu) => {
        const data = row[getDayKey(thu)];

        if (data === CELL.NO_CLASS) {
          const run = getEmptyRun(rows, thu, index, group);
          if (index !== run.start) return null;

          const tiets = Array.from({ length: run.end - run.start + 1 }, (_, offset) =>
            getTietValue(run.start + offset),
          );
          const label = getRangeLabel(run.start, run.end, group);

          const isHovered =
            hoveredClass &&
            hoveredClass.Thu &&
            hoveredClass.Tiet &&
            extractThuList(hoveredClass.Thu).includes(String(thu)) &&
            getDanhSachTiet(hoveredClass.Tiet).some((t) => tiets.includes(t));

          if (isHovered) {
            const slotSpan = run.end - run.start + 1;
            return (
              <td key={thu} rowSpan={slotSpan} className="cell-class-wrapper ghost-cell-wrapper">
                <div
                  className="class-cell-card ghost-preview-card"
                  title={hoveredClass ? `Xem trước: ${hoveredClass.MaLop} - ${hoveredClass.TenMH}` : 'Xem trước'}
                />
              </td>
            );
          }

          return (
            <GetCell
              key={thu}
              data={data}
              thu={thu}
              tiets={tiets}
              label={label}
              rowSpan={run.end - run.start + 1}
              interactive={interactive}
              onPickSlot={onPickSlot}
            />
          );
        }

        return (
          <GetCell
            key={thu}
            data={data}
            thu={thu}
            tiets={[getTietValue(index)]}
            label={`Tiết ${index + 1}`}
            interactive={interactive}
            onPickSlot={onPickSlot}
          />
        );
      })}
    </tr>
  );
}

function OnlineRow({
  rows,
  khongHocTrenTruong,
  redundant,
  interactive,
  onPickSlot,
}: {
  rows: RowData[];
  khongHocTrenTruong: ClassModel[];
  redundant: Array<{ existing: ClassModel; new: ClassModel[] }>;
} & InteractiveProps) {
  const row = rows[tietOnline.index] || {};
  const onlineFromGrid = DAY_NUMBERS.map((thu) => row[getDayKey(thu)]).filter(
    (cell): cell is ClassModel => cell !== CELL.NO_CLASS && cell !== CELL.OCCUPIED && !Array.isArray(cell),
  );

  const redundantNewClasses = redundant.flatMap((it) => it.new);
  const allOutsideClasses = [...onlineFromGrid, ...khongHocTrenTruong, ...redundantNewClasses];

  if (!allOutsideClasses.length && !interactive) return null;

  return (
    <tr className="online-row">
      <td className="cell-tiet">
        <strong>Ngoài giờ</strong>
      </td>
      <td colSpan={6} className="online-row-cell">
        {allOutsideClasses.length > 0 ? (
          <div
            className="online-classes-flex"
            style={{
              ['--item-count' as any]: Math.min(allOutsideClasses.length, 6),
            }}
          >
            {allOutsideClasses.map((lop) => (
              <ClassCell
                key={`${lop.MaLop}-${lop.Thu}-${lop.Tiet}`}
                data={lop}
                interactive={interactive}
                onPick={() =>
                  onPickSlot?.({
                    thu: Number(lop.Thu) || 2,
                    tiets: [tietOnline.stringValue],
                    label: 'Ngoài giờ',
                    existing: lop,
                  })
                }
              />
            ))}
          </div>
        ) : (
          <div style={{ padding: '4px' }}>
            <div className="online-empty-static">
              <span className="empty-slot-label">Ngoài giờ</span>
            </div>
          </div>
        )}
      </td>
    </tr>
  );
}

function Render({ interactive = false, onPickSlot, hoveredClass }: InteractiveProps) {
  const { rowDataHocTrenTruong, khongHocTrenTruong, redundant } = usePhanLoaiHocTrenTruongContext();
  const location = useLocation();
  const { tkbTableRef, saveTkbImageToComputer, copyTkbImageToClipboard } = useProcessImageTkb();
  const isInStep2 = location.pathname === ROUTES._2XepLop.path;

  return (
    <ClassCellContext>
      <div id="thoi-khoa-bieu" className={clsx({ compact: isInStep2, 'interactive-timetable': interactive })}>
        {!isInStep2 && (
          <div className="timetable-toolbar">
            <div>
              <strong>Lịch học trong tuần</strong>
              <small>Cuộn ngang để xem đầy đủ trên màn hình nhỏ</small>
            </div>
            <div className="timetable-actions">
              <Button variant="outlined" startIcon={<ContentCopyIcon />} onClick={copyTkbImageToClipboard}>
                Sao chép ảnh
              </Button>
              <Button variant="contained" startIcon={<DownloadIcon />} onClick={saveTkbImageToComputer}>
                Tải ảnh
              </Button>
            </div>
          </div>
        )}

        <div className="timetable-scroll">
          <table ref={tkbTableRef}>
            <colgroup>
              <col className="timetable-period-column" />
              {DAY_NUMBERS.map((thu) => (
                <col key={thu} className="timetable-day-column" />
              ))}
            </colgroup>
            <TableHead />
            <tbody>
              {MAIN_GROUPS.flatMap((group) =>
                Array.from({ length: group.end - group.start + 1 }, (_, offset) => {
                  const index = group.start + offset;
                  return (
                    <MainPeriodRow
                      key={index}
                      rows={rowDataHocTrenTruong}
                      index={index}
                      group={group}
                      interactive={interactive}
                      onPickSlot={onPickSlot}
                      hoveredClass={hoveredClass}
                    />
                  );
                }),
              )}
              <OnlineRow
                rows={rowDataHocTrenTruong}
                khongHocTrenTruong={khongHocTrenTruong}
                redundant={redundant}
                interactive={interactive}
                onPickSlot={onPickSlot}
              />
            </tbody>
          </table>
        </div>
      </div>
    </ClassCellContext>
  );
}

function Index(props: InteractiveProps) {
  return (
    <ErrorBoundary>
      <ClassCellContext>
        <PhanLoaiHocTrenTruongContext>
          <Render {...props} />
        </PhanLoaiHocTrenTruongContext>
      </ClassCellContext>
    </ErrorBoundary>
  );
}

export default Index;

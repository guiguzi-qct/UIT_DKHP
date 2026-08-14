import Button from '@mui/material/Button';
import clsx from 'clsx';
import { useLocation } from 'react-router-dom';
import { ROUTES } from '../../../constants';
import { ClassModel } from '../../../types';
import { getDanhSachTiet } from '../../../utils';
import { selectIsChiVeTkb, useTkbStore } from '../../../zus';
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
    return `${group.label} · Tiết ${getTietLabel(start)}–${getTietLabel(end)}`;
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
  data: RowData[keyof RowData];
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

function OnlineRow({ rows, interactive, onPickSlot }: { rows: RowData[] } & InteractiveProps) {
  const row = rows[tietOnline.index];
  const isEmpty = Object.values(row).every((cell) => cell === CELL.NO_CLASS);
  if (isEmpty) return null;

  return (
    <tr className="online-row">
      <td className="cell-tiet">
        <strong>Online</strong>
      </td>
      {DAY_NUMBERS.map((thu) => (
        <GetCell
          key={thu}
          data={row[getDayKey(thu)]}
          thu={thu}
          tiets={[tietOnline.stringValue]}
          label="Online"
          interactive={interactive}
          onPickSlot={onPickSlot}
        />
      ))}
    </tr>
  );
}

function Render({ interactive = false, onPickSlot }: InteractiveProps) {
  const { rowDataHocTrenTruong, khongHocTrenTruong, redundant } = usePhanLoaiHocTrenTruongContext();
  const location = useLocation();
  const isChiVeTkb = useTkbStore(selectIsChiVeTkb);
  const { tkbTableRef, saveTkbImageToComputer, copyTkbImageToClipboard } = useProcessImageTkb();
  const isInStep2 = location.pathname === ROUTES._2XepLop.path;

  if (isInStep2 && isChiVeTkb) {
    return (
      <h3 style={{ textAlign: 'center', padding: 20 }}>
        {location.search.includes('self_selected') ? (
          <>
            Preview bị disable ở chế độ chia sẻ TKB <code style={{ whiteSpace: 'nowrap' }}>?self_selected=</code>, sang
            tab Bước 3 để xem TKB
          </>
        ) : (
          `Bạn đang chọn "Tự chuẩn bị danh sách mã lớp" ở tab Bước 3`
        )}
      </h3>
    );
  }

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
              <Button variant="outlined" onClick={copyTkbImageToClipboard}>
                Sao chép ảnh
              </Button>
              <Button variant="contained" onClick={saveTkbImageToComputer}>
                Tải ảnh
              </Button>
            </div>
          </div>
        )}

        <div className="redundant-class-list">
          {redundant
            .flatMap((it) => it.new)
            .map((lop) => (
              <ClassCell key={`${lop.MaLop}-${lop.Thu}-${lop.Tiet}`} data={lop} isOutsideTable />
            ))}
        </div>
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
                    />
                  );
                }),
              )}
              <OnlineRow rows={rowDataHocTrenTruong} interactive={interactive} onPickSlot={onPickSlot} />
              {khongHocTrenTruong.map((lop) => (
                <tr key={`${lop.MaLop}-${lop.Thu}-${lop.Tiet}`}>
                  <ClassCell
                    colSpan={7}
                    data={lop}
                    interactive={interactive}
                    onPick={() =>
                      onPickSlot?.({
                        thu: Number(lop.Thu) || 2,
                        tiets: getDanhSachTiet(lop.Tiet),
                        label: 'Lịch chưa cố định',
                        existing: lop,
                      })
                    }
                  />
                </tr>
              ))}
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

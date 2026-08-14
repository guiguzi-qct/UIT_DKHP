import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';
import { IconButton, Tooltip } from '@mui/material';
import clsx from 'clsx';
import constate from 'constate';
import groupBy from 'lodash/groupBy';
import reverse from 'lodash/reverse';
import { useMemo, useState } from 'react';
import { ClassModel } from '../../../types';
import { isSameAgGridRowId, uniqMaLop } from '../../../utils';
import { selectSelectedClassesBuoc3, useTkbStore } from '../../../zus';
import { usePhanLoaiHocTrenTruongContext } from './hooks';
import './styles.css';

const randomColors = [
  '#ADBECC',
  '#C8D7E3',
  '#59899D',
  '#8FAFC4',
  '#D5E0E8',
  '#94B5C6',
  '#BACBD8',
  '#6C99AB',
  '#CFDCDE',
  '#82A4B5',
  '#B5C6D1',
  '#759AA9',
  '#DCE6EC',
  '#99B4C4',
  '#A4BAC8',
] as const;

type Props = {
  data: ClassModel;
  isOutsideTable?: boolean;
  interactive?: boolean;
  onPick?: () => void;
} & React.TdHTMLAttributes<HTMLTableCellElement>;

const getMonChonRoiKey = (data: ClassModel) => `${data.MaMH}-${data.ThucHanh}`;
const useMonChonRoi = () => {
  const newRandomColors = useMemo(() => reverse([...randomColors]), []);
  const selectedClasses = useTkbStore(selectSelectedClassesBuoc3);
  const map = groupBy(selectedClasses, getMonChonRoiKey);
  const mapColor: Record<keyof typeof map, (typeof newRandomColors)[number]> = {};
  let index = 0;
  Object.entries(map).forEach(([key, value]) => {
    const hasDuplication = uniqMaLop(value).length > 1;
    if (hasDuplication) mapColor[key] = newRandomColors[index++];
  });

  const getWarningColor = (data: ClassModel) => mapColor[getMonChonRoiKey(data)];
  const isWarning = (data: ClassModel) => !!getWarningColor(data);
  return { isWarning, getWarningColor };
};
export const [ClassCellContext, useClassCellContext] = constate(() => {
  const [cellHovering, setCellHovering] = useState<ClassModel | null>(null);
  const [isHoveringOnRemoveIcon, setIsHoveringOnRemoveIcon] = useState(false);
  const [isHoveringOnWarningIcon, setIsHoveringOnWarningIcon] = useState(false);
  const { isWarning, getWarningColor } = useMonChonRoi();
  const isHoveringOnThisCell = (data: ClassModel, fieldCompare: keyof ClassModel) => {
    return cellHovering?.[fieldCompare] === data?.[fieldCompare];
  };
  const isHoveringOnThisCellRemoveIcon = (data: ClassModel) =>
    isHoveringOnThisCell(data, 'MaMH') && isHoveringOnRemoveIcon;
  const isHoveringOnThisCellWarningIcon = (data: ClassModel) => {
    return !!cellHovering && getMonChonRoiKey(data) === getMonChonRoiKey(cellHovering) && isHoveringOnWarningIcon;
  };
  const onRemoveClass = () => {
    setCellHovering(null);
    setIsHoveringOnRemoveIcon(false);
    setIsHoveringOnWarningIcon(false);
  };
  return {
    isHoveringOnThisCell,
    isHoveringOnThisCellRemoveIcon,
    isHoveringOnThisCellWarningIcon,
    setCellHovering,
    setIsHoveringOnRemoveIcon,
    setIsHoveringOnWarningIcon,
    isWarning,
    getWarningColor,
    onRemoveClass,
  };
});

function ClassCell({ data, isOutsideTable = false, interactive = false, onPick, ...restProps }: Props) {
  const { MaLop, NgonNgu, TenMH, TenGV, PhongHoc, NBD, NKT, Thu, Tiet } = data;
  const removeClasses = useTkbStore((s) => s.removeClasses);
  const selectedClasses = useTkbStore(selectSelectedClassesBuoc3);
  const {
    isHoveringOnThisCell,
    isHoveringOnThisCellRemoveIcon,
    isHoveringOnThisCellWarningIcon,
    setIsHoveringOnWarningIcon,
    setCellHovering,
    setIsHoveringOnRemoveIcon,
    isWarning,
    getWarningColor,
    onRemoveClass,
  } = useClassCellContext();

  const { redundant } = usePhanLoaiHocTrenTruongContext();

  // TODO: display warning cho cac truong hop:
  // - chon 2 slot chung mon khac lop, i.e: Nhap Mon Lap Trinh LT cua 1 nguoi, TH cua 1 nguoi khac
  const cacLopChungMonDangChon = useMemo(() => {
    return selectedClasses.filter((selectedClass) => selectedClass.MaMH === data.MaMH);
  }, [data.MaMH, selectedClasses]);

  const redundantIndex = redundant.findIndex((info) => {
    return (
      isSameAgGridRowId(info.existing, data) || info.new.some((addingClass) => isSameAgGridRowId(addingClass, data))
    );
  });
  const isRedundantRelated = redundantIndex > -1;

  return (
    <Tooltip title={isRedundantRelated ? 'Bị trùng TKB' : null}>
      <td
        {...restProps}
        className={clsx('cell-class', {
          'cell-class-pickable': interactive,
          'cell-class-unbounded': !restProps.rowSpan,
          'cell-class-hovering': isHoveringOnThisCell(data, 'MaMH'),
        })}
        role={interactive ? 'button' : undefined}
        tabIndex={interactive ? 0 : undefined}
        aria-label={interactive ? `Đổi lớp ${TenMH}` : undefined}
        style={{
          boxShadow: isRedundantRelated ? `inset 0 0 0 3px ${randomColors[redundantIndex]}` : undefined,
        }}
        onMouseEnter={() => setCellHovering(data)}
        onMouseLeave={() => setCellHovering(null)}
        onClick={interactive ? onPick : undefined}
        onKeyDown={
          interactive
            ? (event) => {
                if (event.key === 'Enter' || event.key === ' ') {
                  event.preventDefault();
                  onPick?.();
                }
              }
            : undefined
        }
      >
        {interactive && <span className="cell-picker-hint">Click để đổi lớp</span>}
        <Tooltip
          title={
            <>
              Xoá môn này
              {isWarning(data) && isHoveringOnThisCell(data, 'MaLop') && (
                <>
                  <br />
                  hoặc Shift+Click để chỉ xoá slot thừa này
                </>
              )}
            </>
          }
          open={isHoveringOnThisCellRemoveIcon(data)}
        >
          <IconButton
            onMouseEnter={() => setIsHoveringOnRemoveIcon(true)}
            onMouseLeave={() => setIsHoveringOnRemoveIcon(false)}
            style={{ position: 'absolute', top: 0, right: 0 }}
            color="inherit"
            size="small"
            onClick={(e) => {
              e.stopPropagation();
              const classesToRemove = (() => {
                if (isWarning(data) && e.shiftKey) {
                  return [data];
                }
                if ((e.ctrlKey || e.metaKey) && e.shiftKey) {
                  // easter eggs: Cmd + Shift + Click to remove all selected classes
                  return selectedClasses;
                }
                return cacLopChungMonDangChon;
              })();
              removeClasses(classesToRemove);
              onRemoveClass();
            }}
            className="remove-class-btn"
          >
            <DeleteOutlineIcon />
          </IconButton>
        </Tooltip>
        <div className="class-cell-content">
          <strong className="class-cell-code">
            {MaLop}
            {isWarning(data) && (
              <Tooltip open={isHoveringOnThisCellWarningIcon(data)} title="Có vẻ như bạn đang chọn thừa cho môn này">
                <WarningAmberIcon
                  onMouseEnter={() => setIsHoveringOnWarningIcon(true)}
                  onMouseLeave={() => setIsHoveringOnWarningIcon(false)}
                  style={{ color: getWarningColor(data) }}
                />
              </Tooltip>
            )}{' '}
            - {NgonNgu}
          </strong>
          {TenMH && <span className="class-cell-name">{TenMH}</span>}
          {TenGV && <strong className="class-cell-secondary">{TenGV}</strong>}
          {PhongHoc && <span className="class-cell-secondary">{PhongHoc}</span>}
          {NBD && <span className="class-cell-secondary">BĐ: {NBD}</span>}
          {NKT && <span className="class-cell-secondary">KT: {NKT}</span>}
          {isOutsideTable && (
            <strong className="class-cell-secondary">
              Thứ {Thu} Tiết {Tiet}
            </strong>
          )}
        </div>
      </td>
    </Tooltip>
  );
}

export default ClassCell;

import FileDownloadIcon from '@mui/icons-material/FileDownload';
import Button from '@mui/material/Button';
import clsx from 'clsx';
import { useLocation } from 'react-router-dom';
import ImageIcon from '@mui/icons-material/Image';
import { useMemo } from 'react';
import { ROUTES } from '../../../constants';
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

const GetCell = ({ data }) => {
  if (data === CELL.NO_CLASS) return <td />;
  if (data === CELL.OCCUPIED) return null;
  return <ClassCell data={data} rowSpan={getDanhSachTiet(data.Tiet).length} />;
};

function RowHocTrenTruong({ row, index }: { row: RowData; index: number }) {
  const shouldBeHidden = useMemo(() => {
    if (index < 10) return false; // Tiết 1-10 luôn luôn hiện,
    return Object.values(row).every((cell) => cell === CELL.NO_CLASS); // Tiết buổi tối + Online nếu không có lớp thì ẩn đi
  }, [row, index]);

  return (
    <tr style={{ visibility: shouldBeHidden ? 'collapse' : undefined }}>
      <td className="cell-tiet">
        Tiết {index === tietOnline.index ? tietOnline.stringValue : index + 1} <br />
        {timeLookup[index]}
      </td>
      {[2, 3, 4, 5, 6, 7].map((t) => (
        <GetCell key={t} data={row['Thu' + t]} />
      ))}
    </tr>
  );
}

function Render() {
  const { rowDataHocTrenTruong, khongHocTrenTruong, redundant } = usePhanLoaiHocTrenTruongContext();

  const location = useLocation();
  const isChiVeTkb = useTkbStore(selectIsChiVeTkb);
  const { tkbTableRef, saveTkbImageToComputer, copyTkbImageToClipboard } = useProcessImageTkb();

  const isInStep2 = location.pathname === ROUTES._2XepLop.path;

  // TODO: refactor the messy flow after writing tests
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
      <div
        id="thoi-khoa-bieu"
        className={clsx({ compact: isInStep2 })}
      >
        {!isInStep2 && (
          <div className="timetable-toolbar">
            <div>
              <strong>Lịch học trong tuần</strong>
              <small>Cuộn ngang để xem đầy đủ trên màn hình nhỏ</small>
            </div>
            <div className="timetable-actions">
              <Button variant="outlined" startIcon={<ImageIcon />} onClick={copyTkbImageToClipboard}>Sao chép ảnh</Button>
              <Button variant="contained" startIcon={<FileDownloadIcon />} onClick={saveTkbImageToComputer}>Tải ảnh</Button>
            </div>
          </div>
        )}

        <div style={{ display: 'flex' }}>
          {redundant
            .flatMap((it) => it.new)
            .map((lop, index) => (
              <tr key={index}>
                <ClassCell data={lop} isOutsideTable />
              </tr>
            ))}
        </div>
        <div className="timetable-scroll">
          <table ref={tkbTableRef}>
            <TableHead />
            <tbody>
              {rowDataHocTrenTruong.map((row, index) => (
                <RowHocTrenTruong key={index} row={row} index={index} />
              ))}
              {khongHocTrenTruong.map((lop, index) => (
                <tr key={index}>
                  <ClassCell colSpan={7} data={lop} />
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </ClassCellContext>
  );
}

function Index() {
  return (
    <ErrorBoundary>
      <ClassCellContext>
        <PhanLoaiHocTrenTruongContext>
          <Render />
        </PhanLoaiHocTrenTruongContext>
      </ClassCellContext>
    </ErrorBoundary>
  );
}

export default Index;

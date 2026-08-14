import ArrowForwardIcon from '@mui/icons-material/ArrowForward';
import DeleteSweepOutlinedIcon from '@mui/icons-material/DeleteSweepOutlined';
import SearchIcon from '@mui/icons-material/Search';
import Button from '@mui/material/Button';
import Chip from '@mui/material/Chip';
import InputAdornment from '@mui/material/InputAdornment';
import Paper from '@mui/material/Paper';
import TextField from '@mui/material/TextField';
import { AgGridReact } from 'ag-grid-react';
import { useState } from 'react';
import { useHistory } from 'react-router-dom';
import { ClassModel } from 'types';
import { ROUTES } from '../../../constants';
import { selectSelectedClasses, selectTongSoTcSelected, useTkbStore } from '../../../zus';
import './styles.css';
import { useGridOptions } from './utils';

function AgGrid() {
  const [quickFilter, setQuickFilter] = useState('');
  const history = useHistory();
  const selectedClasses = useTkbStore(selectSelectedClasses);
  const credits = useTkbStore(selectTongSoTcSelected);
  const setSelectedClasses = useTkbStore((state) => state.setSelectedClasses);
  const {
    agGridRef,
    isRowSelectable,
    columnDefs,
    defaultColDef,
    getMainMenuItems,
    onSelectionChanged,
    onFilterChanged,
    onGridReady,
    onRowClicked,
    rowData,
    getRowId,
  } = useGridOptions();

  return (
    <section className="page-wrap wide selection-page">
      <header className="page-heading selection-heading">
        <div>
          <h1>Chọn lớp học phần</h1>
          <p>Tìm theo tên môn, mã lớp hoặc giảng viên. Tick vào lớp muốn học; các lớp trùng lịch sẽ tự được khóa.</p>
        </div>
      </header>

      <Paper className="surface-card selection-toolbar">
        <TextField
          className="quick-search"
          value={quickFilter}
          onChange={(event) => setQuickFilter(event.target.value)}
          placeholder="Tìm môn, mã lớp, giảng viên..."
          size="small"
          inputProps={{ 'aria-label': 'Tìm nhanh lớp học phần' }}
          InputProps={{ startAdornment: <InputAdornment position="start"><SearchIcon /></InputAdornment> }}
        />
        <div className="selection-stats">
          <Chip label={`${selectedClasses.length} lớp đã chọn`} color={selectedClasses.length ? 'primary' : 'default'} />
          <Chip label={`${credits} tín chỉ`} variant="outlined" />
        </div>
        <div className="selection-actions">
          <Button
            variant="text"
            color="inherit"
            startIcon={<DeleteSweepOutlinedIcon />}
            disabled={!selectedClasses.length}
            onClick={() => setSelectedClasses([])}
          >
            Bỏ chọn tất cả
          </Button>
          <Button
            variant="contained"
            endIcon={<ArrowForwardIcon />}
            disabled={!selectedClasses.length}
            onClick={() => history.push(ROUTES._3KetQua.path)}
          >
            Xem thời khóa biểu
          </Button>
        </div>
      </Paper>

      <div className="ag-theme-alpine course-grid">
        <AgGridReact<ClassModel>
          ref={agGridRef}
          rowData={rowData}
          quickFilterText={quickFilter}
          cacheQuickFilter={true}
          isRowSelectable={isRowSelectable}
          defaultColDef={defaultColDef}
          columnDefs={columnDefs}
          headerHeight={48}
          rowHeight={46}
          enableCellTextSelection={true}
          suppressAnimationFrame={true}
          rowSelection="multiple"
          rowMultiSelectWithClick={true}
          getMainMenuItems={getMainMenuItems}
          rowGroupPanelShow="never"
          suppressDragLeaveHidesColumns={true}
          rowClass="ag-cell-normal"
          onFilterChanged={onFilterChanged}
          onSelectionChanged={onSelectionChanged}
          onGridReady={onGridReady}
          getRowId={getRowId}
          onRowClicked={onRowClicked}
        />
      </div>
    </section>
  );
}

export default AgGrid;

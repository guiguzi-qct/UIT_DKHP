import ShareIcon from '@mui/icons-material/Share';
import { IconButton, Tooltip, useTheme } from '@mui/material';
import type { InputBaseProps, Theme } from '@mui/material';
import Grid from '@mui/material/Grid';
import TextField from '@mui/material/TextField';
import { forwardRef, useMemo } from 'react';
import type { HTMLAttributes } from 'react';
import { extractListMaLop } from '../../utils';
import { selectIsChiVeTkb, selectPhanLoaiHocTrenTruong, selectTextareaChiVeTkb, useTkbStore } from '../../zus';

const getReadonlySx = (theme: Theme) => ({
  '& .MuiInputBase-input': {
    color: theme.palette.text.secondary,
    backgroundColor: theme.palette.action.hover,
    cursor: 'default',
  },
});

const ListInputComponent: InputBaseProps['inputComponent'] = forwardRef<
  HTMLTextAreaElement,
  HTMLAttributes<HTMLTextAreaElement>
>((props, ref) => {
  const isChiVeTkb = useTkbStore(selectIsChiVeTkb);
  return (
    <Tooltip title={isChiVeTkb ? 'Mỗi mã lớp một hàng hoặc cách nhau bằng khoảng trắng hay dấu phẩy' : ''}>
      <textarea ref={ref} style={{ resize: 'vertical' }} {...props} />
    </Tooltip>
  );
});

export default function DanhSachLopInput() {
  const theme = useTheme();
  const setTextareChiVeTkb = useTkbStore((s) => s.setTextareChiVeTkb);
  const cacLop = useTkbStore(selectPhanLoaiHocTrenTruong);
  const listMaLop = useMemo(() => extractListMaLop(cacLop.flat()), [cacLop]);
  const hasLop = listMaLop.length > 0;
  const isChiVeTkb = useTkbStore(selectIsChiVeTkb);
  const textareaChiVeTkb = useTkbStore(selectTextareaChiVeTkb);
  const useToolXepLop = !isChiVeTkb;
  const value = isChiVeTkb ? textareaChiVeTkb : hasLop ? listMaLop.join(',') : 'Chưa có lớp nào';

  return (
    <Grid item xs={12}>
      <TextField
        label="Danh sách mã lớp"
        fullWidth
        size="small"
        multiline
        inputProps={{ readOnly: useToolXepLop, style: { resize: 'vertical' } }}
        rows={2}
        variant="outlined"
        onChange={(event) => setTextareChiVeTkb(event.target.value)}
        value={value}
        disabled={useToolXepLop && !hasLop}
        sx={useToolXepLop ? getReadonlySx(theme) : undefined}
        InputProps={{
          inputComponent: ListInputComponent,
          endAdornment:
            useToolXepLop && hasLop ? (
              <Tooltip title="Chia sẻ thời khóa biểu">
                <IconButton
                  edge="end"
                  size="small"
                  onClick={() => {
                    const newUrl = window.location.origin + window.location.pathname + '?self_selected=' + value;
                    navigator.clipboard.writeText(newUrl);
                    window.open(newUrl, Math.random().toString());
                  }}
                >
                  <ShareIcon />
                </IconButton>
              </Tooltip>
            ) : null,
        }}
      />
    </Grid>
  );
}

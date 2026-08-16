import EmailIcon from '@mui/icons-material/Email';
import FacebookIcon from '@mui/icons-material/Facebook';
import RotateLeftIcon from '@mui/icons-material/RotateLeft';
import WarningAmberRoundedIcon from '@mui/icons-material/WarningAmberRounded';
import AppBar from '@mui/material/AppBar';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Container from '@mui/material/Container';
import Dialog from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogTitle from '@mui/material/DialogTitle';
import LinearProgress from '@mui/material/LinearProgress';
import { createTheme, ThemeProvider } from '@mui/material/styles';
import Toolbar from '@mui/material/Toolbar';
import Tooltip from '@mui/material/Tooltip';
import Typography from '@mui/material/Typography';
import { useSnackbar } from 'notistack';
import React, { Suspense, useState } from 'react';
import { BrowserRouter, Redirect, Route, useHistory, useLocation } from 'react-router-dom';
import { ROUTES } from '../constants';
import { selectFinalDataTkb, selectIsChiVeTkb, selectTextareaChiVeTkb, useTkbStore } from '../zus';
import ChonFileExcel from './1ChonFileExcel';
import XepLop from './2XepLop';
import KetQua from './3KetQua';
import DangKyNhanh from './4DangKyNhanh';
import ErrorBoundary from './components/ErrorBoundary';
import NeedStep1Warning from './components/NeedStep1';
import ScrollToTop from './components/ScrollToTop';
import WorkflowNav from './components/WorkflowNav';
import './App.css';

const customTheme = createTheme({
  palette: {
    primary: {
      main: '#0E2128',
      light: '#59899D',
      dark: '#040309',
      contrastText: '#ffffff',
    },
    secondary: {
      main: '#59899D',
      light: '#ADBECC',
      dark: '#0E2128',
      contrastText: '#ffffff',
    },
    error: {
      main: '#d9534f',
      light: '#e6716e',
    },
    background: {
      default: '#F4F7F9',
      paper: '#ffffff',
    },
    text: {
      primary: '#040309',
      secondary: '#0E2128',
    },
  },
  typography: {
    fontFamily: '"Be Vietnam Pro", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
  },
  shape: {
    borderRadius: 14,
  },
});

type PersistedRouteProps = {
  path: string;
  component: React.ComponentType;
};

/**
 * to show/hide only, instead of mount/unmount the component when route changes
 * for a smoother UX
 */
function PersistedRoute(props: PersistedRouteProps) {
  const location = useLocation();
  const match = location.pathname === props.path;
  return (
    <div hidden={!match} style={{ width: '100%' }}>
      <props.component />
    </div>
  );
}

function FallbackRoute() {
  const location = useLocation();
  if (location.pathname === '/1') return <Redirect to={ROUTES._1ChonFileExcel.path} />;
  if (location.pathname === '/2') return <Redirect to={ROUTES._2XepLop.path} />;
  if (location.pathname === '/3') return <Redirect to={ROUTES._3KetQua.path} />;
  if (location.pathname === '/4') return <Redirect to={ROUTES._4DangKyNhanh.path} />;
  const hasAnyMatch = Object.values(ROUTES).some((route) => route.path === location.pathname);
  return hasAnyMatch ? null : <Redirect to={ROUTES._1ChonFileExcel.path} />;
}

function HeaderActions() {
  const history = useHistory();
  const { enqueueSnackbar } = useSnackbar();
  const resetAllData = useTkbStore((s) => s.resetAllData);
  const [isResetConfirmOpen, setIsResetConfirmOpen] = useState(false);

  const handleConfirmReset = () => {
    resetAllData();
    setIsResetConfirmOpen(false);
    enqueueSnackbar('Đã đặt lại dữ liệu thành công', { variant: 'success' });
    history.push(ROUTES._1ChonFileExcel.path);
  };

  return (
    <Box className="header-actions">
      <Tooltip title="Xóa toàn bộ dữ liệu & làm lại từ đầu">
        <Button
          variant="outlined"
          size="medium"
          className="header-action-btn reset-btn"
          startIcon={<RotateLeftIcon />}
          onClick={() => setIsResetConfirmOpen(true)}
        >
          Đặt lại
        </Button>
      </Tooltip>

      {/* Reset Dialog */}
      <Dialog
        open={isResetConfirmOpen}
        onClose={() => setIsResetConfirmOpen(false)}
        PaperProps={{
          style: {
            borderRadius: 18,
            border: '1.5px solid #0E2128',
            padding: '8px 6px',
          },
        }}
      >
        <DialogTitle fontWeight={800} style={{ display: 'flex', alignItems: 'center', gap: 10, color: '#0E2128', fontSize: '20px' }}>
          <WarningAmberRoundedIcon style={{ fontSize: 32, color: '#d9534f' }} />
          Xác nhận đặt lại dữ liệu?
        </DialogTitle>
        <DialogContent>
          <Typography style={{ color: '#0E2128', fontWeight: 600, fontSize: '14.5px', lineHeight: 1.5 }}>
            Tất cả file Excel đã tải, các môn đã chọn và các phương án xếp lịch của bạn sẽ bị xóa. Bạn có muốn tiếp tục không?
          </Typography>
        </DialogContent>
        <DialogActions style={{ padding: '8px 24px 16px' }}>
          <Button onClick={() => setIsResetConfirmOpen(false)} style={{ color: '#0E2128', fontWeight: 700 }}>
            Hủy
          </Button>
          <Button variant="contained" color="error" style={{ fontWeight: 800, borderRadius: 10, padding: '8px 20px' }} onClick={handleConfirmReset} autoFocus>
            Xác nhận xóa & làm lại
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}

function App() {
  const dataTkb = useTkbStore(selectFinalDataTkb);
  const isChiVeTkb = useTkbStore(selectIsChiVeTkb);
  const textareaChiVeTkb = useTkbStore(selectTextareaChiVeTkb);
  const hasData = dataTkb.length > 0 || isChiVeTkb || textareaChiVeTkb.trim().length > 0;
  const [isContactOpen, setIsContactOpen] = useState(false);

  return (
    <ErrorBoundary>
      <ThemeProvider theme={customTheme}>
        <BrowserRouter basename={process.env.PUBLIC_URL}>
          <Box className="app-shell">
            <Route component={ScrollToTop} />
            <AppBar className="app-header" position="sticky" elevation={0}>
              <Toolbar className="app-toolbar">
                <Tooltip title="Bấm để xem thông tin ứng dụng & liên hệ">
                  <Box
                    className="brand-lockup"
                    onClick={() => setIsContactOpen(true)}
                    style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 12 }}
                  >
                    <img className="brand-mark" src={`${process.env.PUBLIC_URL}/logo.png`} alt="UIT no Jikan logo" />
                    <Typography className="brand-name">UIT no Jikan</Typography>
                  </Box>
                </Tooltip>

                <WorkflowNav />

                <HeaderActions />
              </Toolbar>
            </AppBar>
            <Container className="app-container" maxWidth={false}>
              <main className="app-content">
                <Suspense fallback={<LinearProgress className="route-loader" />}>
                  <PersistedRoute path={ROUTES._1ChonFileExcel.path} component={ChonFileExcel} />
                  <PersistedRoute path={ROUTES._2XepLop.path} component={hasData ? XepLop : NeedStep1Warning} />
                  <PersistedRoute path={ROUTES._3KetQua.path} component={hasData ? KetQua : NeedStep1Warning} />
                  <PersistedRoute path={ROUTES._4DangKyNhanh.path} component={hasData ? DangKyNhanh : NeedStep1Warning} />
                  <FallbackRoute />
                </Suspense>
              </main>
            </Container>

            {/* Contact Info Dialog on Logo Click */}
            <Dialog
              open={isContactOpen}
              onClose={() => setIsContactOpen(false)}
              maxWidth="xs"
              fullWidth
              PaperProps={{
                style: {
                  borderRadius: 18,
                  border: '1.5px solid #0E2128',
                  padding: '8px 6px',
                },
              }}
            >
              <DialogTitle fontWeight={800} style={{ color: '#0E2128', fontSize: '20px' }}>
                UIT no Jikan 🚀
              </DialogTitle>
              <DialogContent dividers style={{ borderColor: '#D5E0E8' }}>
                <Box style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                  <Typography variant="body2" style={{ color: '#0E2128', fontWeight: 600, lineHeight: 1.6 }}>
                    Ứng dụng hỗ trợ lập kế hoạch & xếp thời khóa biểu tự động dành riêng cho sinh viên <strong>UIT (Trường Đại học Công nghệ Thông tin - ĐHQG-HCM)</strong>.
                  </Typography>

                  <Box
                    style={{
                      background: '#F4F7F9',
                      borderRadius: 12,
                      padding: '14px',
                      border: '1px solid #D5E0E8',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: 10,
                    }}
                  >
                    <Typography variant="caption" style={{ color: '#59899D', fontWeight: 800, letterSpacing: '0.05em' }}>
                      KÊNH THÔNG TIN & HỖ TRỢ
                    </Typography>

                    <Button
                      variant="contained"
                      startIcon={<FacebookIcon />}
                      component="a"
                      href="https://www.facebook.com/profile.php?id=61589480516886"
                      target="_blank"
                      rel="noreferrer"
                      style={{
                        borderRadius: 10,
                        fontWeight: 800,
                        color: '#ffffff',
                        background: '#1877F2',
                        textTransform: 'none',
                        boxShadow: 'none',
                      }}
                    >
                      Facebook: Quỷ Cốc Tử
                    </Button>

                    <Button
                      variant="outlined"
                      startIcon={<EmailIcon />}
                      component="a"
                      href="mailto:quycoctu.tdm@gmail.com"
                      style={{
                        borderRadius: 10,
                        fontWeight: 800,
                        color: '#0E2128',
                        borderColor: '#0E2128',
                        background: '#ffffff',
                        textTransform: 'none',
                      }}
                    >
                      quycoctu.tdm@gmail.com
                    </Button>
                  </Box>
                </Box>
              </DialogContent>
              <DialogActions style={{ padding: '8px 24px 16px' }}>
                <Button
                  variant="contained"
                  onClick={() => setIsContactOpen(false)}
                  style={{ fontWeight: 800, borderRadius: 10, padding: '8px 24px', background: '#0E2128', width: '100%' }}
                >
                  Đóng
                </Button>
              </DialogActions>
            </Dialog>
          </Box>
        </BrowserRouter>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;

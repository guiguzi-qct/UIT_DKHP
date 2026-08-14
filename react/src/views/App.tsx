import LockOutlinedIcon from '@mui/icons-material/LockOutlined';
import AppBar from '@mui/material/AppBar';
import Box from '@mui/material/Box';
import Chip from '@mui/material/Chip';
import Container from '@mui/material/Container';
import LinearProgress from '@mui/material/LinearProgress';
import { createTheme, ThemeProvider } from '@mui/material/styles';
import Toolbar from '@mui/material/Toolbar';
import Typography from '@mui/material/Typography';
import React, { Suspense } from 'react';
import { BrowserRouter, Redirect, Route, useLocation } from 'react-router-dom';
import { ROUTES } from '../constants';
import { selectFinalDataTkb, selectIsChiVeTkb, selectTextareaChiVeTkb, useTkbStore } from '../zus';
import ChonFileExcel from './1ChonFileExcel';
import XepLop from './2XepLop';
import KetQua from './3KetQua';
import ErrorBoundary from './components/ErrorBoundary';
import NeedStep1Warning from './components/NeedStep1';
import ScrollToTop from './components/ScrollToTop';
import WorkflowNav from './components/WorkflowNav';
import './App.css';

const vintageTheme = createTheme({
  palette: {
    primary: {
      main: '#7c4d3a',
      light: '#9e6d5a',
      dark: '#5a3527',
      contrastText: '#fffdfa',
    },
    secondary: {
      main: '#5a6b57',
      light: '#7a8c77',
      dark: '#3c4a3a',
      contrastText: '#fffdfa',
    },
    error: {
      main: '#b94a48',
      light: '#d96b69',
    },
    background: {
      default: '#f7f4ee',
      paper: '#fffdfa',
    },
    text: {
      primary: '#332925',
      secondary: '#665952',
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
  const hasAnyMatch = Object.values(ROUTES).some((route) => route.path === location.pathname);
  return hasAnyMatch ? null : <Redirect to={ROUTES._1ChonFileExcel.path} />;
}

function App() {
  const dataTkb = useTkbStore(selectFinalDataTkb);
  const isChiVeTkb = useTkbStore(selectIsChiVeTkb);
  const textareaChiVeTkb = useTkbStore(selectTextareaChiVeTkb);
  const hasData = dataTkb.length > 0 || isChiVeTkb || textareaChiVeTkb.trim().length > 0;

  return (
    <ErrorBoundary>
      <ThemeProvider theme={vintageTheme}>
        <BrowserRouter basename={process.env.PUBLIC_URL}>
        <Box className="app-shell">
          <Route component={ScrollToTop} />
          <AppBar className="app-header" position="sticky" elevation={0}>
            <Toolbar className="app-toolbar">
              <Box className="brand-lockup">
                <img className="brand-mark" src={`${process.env.PUBLIC_URL}/logo.png`} alt="UIT no Jikan logo" />
                <Box>
                  <Typography className="brand-name">UIT no Jikan</Typography>
                  <Typography className="brand-tagline">Xếp thời khóa biểu dễ hơn</Typography>
                </Box>
              </Box>
              <WorkflowNav />
              <Chip className="privacy-chip" icon={<LockOutlinedIcon />} label="Dữ liệu chỉ lưu trên thiết bị" variant="outlined" />
            </Toolbar>
          </AppBar>
          <Container className="app-container" maxWidth={false}>
            <main className="app-content">
              <Suspense fallback={<LinearProgress className="route-loader" />}>
              <PersistedRoute path={ROUTES._1ChonFileExcel.path} component={ChonFileExcel} />
              <PersistedRoute path={ROUTES._2XepLop.path} component={hasData ? XepLop : NeedStep1Warning} />
              <PersistedRoute path={ROUTES._3KetQua.path} component={hasData ? KetQua : NeedStep1Warning} />
              <FallbackRoute />
              </Suspense>
            </main>
          </Container>
        </Box>
      </BrowserRouter>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;

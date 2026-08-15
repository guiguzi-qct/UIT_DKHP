import React from 'react';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Button from '@mui/material/Button';
import Alert from '@mui/material/Alert';
import AlertTitle from '@mui/material/AlertTitle';
import Stack from '@mui/material/Stack';
import Accordion from '@mui/material/Accordion';
import AccordionSummary from '@mui/material/AccordionSummary';
import AccordionDetails from '@mui/material/AccordionDetails';
import ErrorOutlineIcon from '@mui/icons-material/ErrorOutline';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';

interface ErrorBoundaryProps {
  fallback?: React.ReactNode;
  children: React.ReactNode;
}

interface ErrorBoundaryState {
  hasErrored: boolean;
  error: Error | null;
  errorInfo: React.ErrorInfo | null;
}

class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);

    this.state = {
      hasErrored: false,
      error: null,
      errorInfo: null,
    };
  }

  static getDerivedStateFromError(error: Error): Partial<ErrorBoundaryState> {
    return { hasErrored: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('ErrorBoundary caught an error:', error, errorInfo);
    this.setState({
      errorInfo,
    });

    const isChunkLoadError =
      error?.name === 'ChunkLoadError' ||
      /Loading chunk/i.test(error?.message || '');

    if (isChunkLoadError) {
      const storageKey = 'chunk_reload_attempts';
      const attempts = Number(sessionStorage.getItem(storageKey) || 0);
      if (attempts < 2) {
        sessionStorage.setItem(storageKey, String(attempts + 1));
        window.location.reload();
      }
    }
  }

  handleReload = () => {
    window.location.reload();
  };

  render() {
    if (this.state.hasErrored) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <Box
          sx={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            minHeight: '400px',
            padding: 3,
            maxWidth: '600px',
            margin: '0 auto',
          }}
        >
          <Alert
            severity="error"
            icon={<ErrorOutlineIcon />}
            sx={{
              width: '100%',
            }}
          >
            <AlertTitle>Đã xảy ra lỗi</AlertTitle>
            <Typography variant="body2" sx={{ mb: 2 }}>
              Hãy tải lại trang và thử lại.
            </Typography>
            <Button variant="contained" color="primary" onClick={this.handleReload} sx={{ mb: 2 }}>
              Tải lại trang
            </Button>
            {this.state.error && (
              <Accordion
                sx={{
                  width: '100%',
                  padding: 1.5,
                  boxShadow: 'none',
                  '&:before': {
                    display: 'none',
                  },
                  bgcolor: 'white',
                  '& .MuiAccordionSummary-root': {
                    minHeight: 'auto',
                    py: 0.5,
                    px: 0,
                    '&:hover': {
                      bgcolor: 'white',
                    },
                  },
                  '& .MuiAccordionDetails-root': {
                    px: 0,
                    pt: 1,
                    pb: 0,
                  },
                }}
              >
                <AccordionSummary expandIcon={<ExpandMoreIcon sx={{ fontSize: '1.2rem' }} />}>
                  <Typography variant="caption" sx={{ fontWeight: 500, opacity: 0.8 }}>
                    Chi tiết lỗi (để báo cáo)
                  </Typography>
                </AccordionSummary>
                <AccordionDetails>
                  <Stack spacing={1.5}>
                    {this.state.error.message && (
                      <Box>
                        <Typography variant="caption" sx={{ mb: 0.5, fontWeight: 500, opacity: 0.7, display: 'block' }}>
                          Thông báo lỗi:
                        </Typography>
                        <Box
                          sx={{
                            p: 1.25,
                            bgcolor: 'rgba(0, 0, 0, 0.03)',
                            borderRadius: 1,
                            border: '1px solid rgba(0, 0, 0, 0.08)',
                            fontFamily: 'monospace',
                            fontSize: '0.8125rem',
                            whiteSpace: 'pre-wrap',
                            wordBreak: 'break-word',
                            color: 'rgba(0, 0, 0, 0.75)',
                          }}
                        >
                          {this.state.error.message}
                        </Box>
                      </Box>
                    )}
                    {this.state.error.stack && (
                      <Box>
                        <Typography variant="caption" sx={{ mb: 0.5, fontWeight: 500, opacity: 0.7, display: 'block' }}>
                          Stack trace:
                        </Typography>
                        <Box
                          sx={{
                            p: 1.25,
                            bgcolor: 'rgba(0, 0, 0, 0.03)',
                            borderRadius: 1,
                            border: '1px solid rgba(0, 0, 0, 0.08)',
                            fontFamily: 'monospace',
                            fontSize: '0.75rem',
                            whiteSpace: 'pre-wrap',
                            wordBreak: 'break-word',
                            maxHeight: '250px',
                            overflow: 'auto',
                            color: 'rgba(0, 0, 0, 0.7)',
                            '&::-webkit-scrollbar': {
                              width: '6px',
                            },
                            '&::-webkit-scrollbar-track': {
                              bgcolor: 'rgba(0, 0, 0, 0.02)',
                              borderRadius: '3px',
                            },
                            '&::-webkit-scrollbar-thumb': {
                              bgcolor: 'rgba(0, 0, 0, 0.15)',
                              borderRadius: '3px',
                              '&:hover': {
                                bgcolor: 'rgba(0, 0, 0, 0.25)',
                              },
                            },
                          }}
                        >
                          {this.state.error.stack}
                        </Box>
                      </Box>
                    )}
                    {this.state.errorInfo?.componentStack && (
                      <Box>
                        <Typography variant="caption" sx={{ mb: 0.5, fontWeight: 500, opacity: 0.7, display: 'block' }}>
                          Component stack:
                        </Typography>
                        <Box
                          sx={{
                            p: 1.25,
                            bgcolor: 'rgba(0, 0, 0, 0.03)',
                            borderRadius: 1,
                            border: '1px solid rgba(0, 0, 0, 0.08)',
                            fontFamily: 'monospace',
                            fontSize: '0.75rem',
                            whiteSpace: 'pre-wrap',
                            wordBreak: 'break-word',
                            maxHeight: '250px',
                            overflow: 'auto',
                            color: 'rgba(0, 0, 0, 0.7)',
                            '&::-webkit-scrollbar': {
                              width: '6px',
                            },
                            '&::-webkit-scrollbar-track': {
                              bgcolor: 'rgba(0, 0, 0, 0.02)',
                              borderRadius: '3px',
                            },
                            '&::-webkit-scrollbar-thumb': {
                              bgcolor: 'rgba(0, 0, 0, 0.15)',
                              borderRadius: '3px',
                              '&:hover': {
                                bgcolor: 'rgba(0, 0, 0, 0.25)',
                              },
                            },
                          }}
                        >
                          {this.state.errorInfo.componentStack}
                        </Box>
                      </Box>
                    )}
                  </Stack>
                </AccordionDetails>
              </Accordion>
            )}
          </Alert>
        </Box>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;

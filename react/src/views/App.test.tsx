import React from 'react';
import { render } from '@testing-library/react';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import App from './App';

test('renders guiguzi branding', () => {
  const { getByText } = render(
    <ThemeProvider theme={createTheme()}>
      <App />
    </ThemeProvider>,
  );
  expect(getByText('guiguzi')).toBeInTheDocument();
});

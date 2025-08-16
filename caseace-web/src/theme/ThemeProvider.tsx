// src/theme/ThemeProvider.tsx

'use client';

import { ThemeProvider as MUIThemeProvider, createTheme } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import { AppRouterCacheProvider } from '@mui/material-nextjs/v13-appRouter';

const theme = createTheme({
  palette: {
    mode: 'light',
    primary: {
      main: '#000000',
      light: '#333333',
      dark: '#000000',
    },
    secondary: {
      main: '#666666',
      light: '#999999',
      dark: '#333333',
    },
    background: {
      default: '#f7f7f8',
      paper: '#ffffff',
    },
    text: {
      primary: '#000000',
      secondary: '#666666',
    },
    success: {
      main: '#10B981',
    },
    warning: {
      main: '#F59E0B',
    },
    error: {
      main: '#EF4444',
    },
    info: {
      main: '#3B82F6',
    },
  },
  typography: {
    fontFamily: 'Inter, system-ui, sans-serif',
    h1: {
      fontWeight: 700,
      color: '#000000',
    },
    h2: {
      fontWeight: 600,
      color: '#000000',
    },
    h3: {
      fontWeight: 600,
      color: '#000000',
    },
    h4: {
      fontWeight: 600,
      color: '#000000',
    },
    h5: {
      fontWeight: 600,
      color: '#000000',
    },
    h6: {
      fontWeight: 600,
      color: '#000000',
    },
  },
  components: {
    MuiCssBaseline: {
      styleOverrides: {
        body: {
          background: '#f7f7f8',
          minHeight: '100vh',
        },
      },
    },
    MuiCard: {
      styleOverrides: {
        root: {
          background: '#ffffff',
          border: '1px solid #e5e7eb',
          borderRadius: '8px',
          boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)',
        },
      },
    },
    MuiPaper: {
      styleOverrides: {
        root: {
          background: '#ffffff',
          border: '1px solid #e5e7eb',
          borderRadius: '8px',
        },
      },
    },
    MuiTextField: {
      styleOverrides: {
        root: {
          '& .MuiOutlinedInput-root': {
            backgroundColor: '#ffffff',
            borderRadius: '8px',
            '& fieldset': {
              borderColor: '#d1d5db',
            },
            '&:hover fieldset': {
              borderColor: '#9ca3af',
            },
            '&.Mui-focused fieldset': {
              borderColor: '#000000',
            },
          },
          '& .MuiInputLabel-root': {
            color: '#6b7280',
          },
          '& .MuiInputBase-input': {
            color: '#000000',
          },
        },
      },
    },
    MuiButton: {
      styleOverrides: {
        root: {
          borderRadius: '8px',
          textTransform: 'none',
          fontWeight: 500,
        },
        contained: {
          background: '#000000',
          color: '#ffffff',
          boxShadow: 'none',
          '&:hover': {
            background: '#333333',
            boxShadow: 'none',
          },
        },
      },
    },
    MuiTableCell: {
      styleOverrides: {
        root: {
          borderBottom: '1px solid #e5e7eb',
          color: '#000000',
        },
        head: {
          color: '#374151',
          fontWeight: 600,
        },
      },
    },
    MuiTableRow: {
      styleOverrides: {
        root: {
          '&:hover': {
            backgroundColor: '#f9fafb',
          },
        },
      },
    },
    MuiAppBar: {
      styleOverrides: {
        root: {
          background: '#ffffff',
          border: '1px solid #e5e7eb',
          boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)',
        },
      },
    },
    MuiDrawer: {
      styleOverrides: {
        paper: {
          background: '#ffffff',
          border: '1px solid #e5e7eb',
        },
      },
    },
  },
});

export default function ThemeProvider({ children }: { children: React.ReactNode }) {
  return (
    <AppRouterCacheProvider>
      <MUIThemeProvider theme={theme}>
        <CssBaseline />
        {children}
      </MUIThemeProvider>
    </AppRouterCacheProvider>
  );
}
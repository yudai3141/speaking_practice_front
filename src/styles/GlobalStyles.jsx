import { GlobalStyles as MuiGlobalStyles } from '@mui/material';

export const GlobalStyles = () => (
  <MuiGlobalStyles
    styles={{
      ':root': {
        '--neon-green': '#00ff00',
        '--neon-blue': '#0066ff',
        '--dark-bg': '#0a0a0a',
        '--darker-bg': '#000000',
      },
      'body': {
        background: 'linear-gradient(135deg, #000000 0%, #0a0a0a 100%)',
        color: '#00ff00',
        fontFamily: "'Orbitron', sans-serif",
        margin: 0,
        padding: 0,
        minHeight: '100vh',
      },
      'button': {
        background: '#000000',
        color: '#00ff00',
        border: '1px solid #00ff00',
        padding: '10px 20px',
        fontFamily: "'Orbitron', sans-serif",
        textTransform: 'uppercase',
        cursor: 'pointer',
        transition: 'all 0.3s ease',
        boxShadow: '0 0 10px rgba(0, 255, 0, 0.3)',
        '&:hover': {
          background: '#00ff00',
          color: '#000000',
          boxShadow: '0 0 20px rgba(0, 255, 0, 0.5)',
        },
        '&:disabled': {
          opacity: 0.5,
          cursor: 'not-allowed',
        },
      },
      'input, textarea': {
        background: 'rgba(0, 0, 0, 0.7)',
        border: '1px solid #00ff00',
        color: '#00ff00',
        padding: '8px',
        fontFamily: "'Share Tech Mono', monospace",
        boxShadow: '0 0 10px rgba(0, 255, 0, 0.3)',
        '&:focus': {
          outline: 'none',
          boxShadow: '0 0 15px rgba(0, 255, 0, 0.4)',
        },
      },
      '.MuiDialog-paper': {
        background: '#0a0a0a !important',
        border: '1px solid #00ff00 !important',
        boxShadow: '0 0 10px rgba(0, 255, 0, 0.3) !important',
        color: '#00ff00 !important',
      },
      '.MuiTypography-root': {
        color: '#00ff00 !important',
        fontFamily: "'Share Tech Mono', monospace !important",
      },
      '.MuiCheckbox-root': {
        color: '#00ff00 !important',
      },
    }}
  />
); 
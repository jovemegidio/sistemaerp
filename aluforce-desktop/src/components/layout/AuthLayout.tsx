import { FC } from 'react';
import { Outlet, Navigate } from 'react-router-dom';
import { Box, Container, Paper, Typography } from '@mui/material';
import { useAppSelector } from '@store/index';

const AuthLayout: FC = () => {
  const { isAuthenticated } = useAppSelector((state) => state.auth);

  // Redirect to dashboard if already authenticated
  if (isAuthenticated) {
    return <Navigate to="/" replace />;
  }

  return (
    <Box
      sx={{
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        backgroundColor: 'background.default',
        backgroundImage: 'linear-gradient(135deg, #1565C0 0%, #0D47A1 100%)',
      }}
    >
      {/* Header with logo */}
      <Box
        sx={{
          py: 3,
          px: 4,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <Typography
          variant="h4"
          component="h1"
          sx={{
            color: 'white',
            fontWeight: 700,
            letterSpacing: 1,
            textShadow: '0 2px 4px rgba(0,0,0,0.2)',
          }}
        >
          ALUFORCE
        </Typography>
      </Box>

      {/* Main content */}
      <Container
        maxWidth="sm"
        sx={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          py: 4,
        }}
      >
        <Paper
          elevation={8}
          sx={{
            p: { xs: 3, sm: 5 },
            borderRadius: 3,
            boxShadow: '0 8px 40px rgba(0,0,0,0.12)',
          }}
        >
          <Outlet />
        </Paper>

        {/* Footer info */}
        <Typography
          variant="body2"
          sx={{
            mt: 4,
            textAlign: 'center',
            color: 'rgba(255,255,255,0.8)',
          }}
        >
          Sistema Empresarial ALUFORCE v2.0
        </Typography>
      </Container>

      {/* Bottom decoration */}
      <Box
        sx={{
          height: 80,
          background: 'linear-gradient(180deg, transparent 0%, rgba(0,0,0,0.1) 100%)',
        }}
      />
    </Box>
  );
};

export default AuthLayout;

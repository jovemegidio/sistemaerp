import { FC } from 'react';
import { Box, CircularProgress, Typography, Backdrop } from '@mui/material';

interface GlobalLoadingProps {
  message?: string | null;
}

const GlobalLoading: FC<GlobalLoadingProps> = ({ message }) => {
  return (
    <Backdrop
      open={true}
      sx={{
        color: '#fff',
        zIndex: (theme) => theme.zIndex.drawer + 1000,
        backgroundColor: 'rgba(0, 0, 0, 0.7)',
        flexDirection: 'column',
        gap: 2,
      }}
    >
      <CircularProgress color="inherit" size={56} thickness={4} />
      {message && (
        <Typography variant="body1" color="inherit">
          {message}
        </Typography>
      )}
    </Backdrop>
  );
};

export default GlobalLoading;

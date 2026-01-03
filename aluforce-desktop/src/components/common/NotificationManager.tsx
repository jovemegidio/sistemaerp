import { FC, useEffect } from 'react';
import { Snackbar, Alert, AlertTitle, Slide, SlideProps } from '@mui/material';
import { useAppSelector, useAppDispatch } from '@store/index';
import { removeNotification } from '@store/slices/uiSlice';

const SlideTransition = (props: SlideProps) => {
  return <Slide {...props} direction="up" />;
};

const NotificationManager: FC = () => {
  const dispatch = useAppDispatch();
  const { notifications } = useAppSelector((state) => state.ui);

  // Get the first notification to display
  const currentNotification = notifications[0];

  useEffect(() => {
    if (currentNotification) {
      const timer = setTimeout(() => {
        dispatch(removeNotification(currentNotification.id));
      }, currentNotification.duration || 5000);

      return () => clearTimeout(timer);
    }
  }, [currentNotification, dispatch]);

  const handleClose = (_: React.SyntheticEvent | Event, reason?: string) => {
    if (reason === 'clickaway') return;
    if (currentNotification) {
      dispatch(removeNotification(currentNotification.id));
    }
  };

  if (!currentNotification) return null;

  return (
    <Snackbar
      open={true}
      autoHideDuration={currentNotification.duration || 5000}
      onClose={handleClose}
      anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
      TransitionComponent={SlideTransition}
      sx={{ maxWidth: 400 }}
    >
      <Alert
        onClose={handleClose}
        severity={currentNotification.type}
        variant="filled"
        sx={{
          width: '100%',
          boxShadow: 3,
          '& .MuiAlert-message': {
            width: '100%',
          },
        }}
      >
        {currentNotification.title && (
          <AlertTitle sx={{ fontWeight: 600 }}>
            {currentNotification.title}
          </AlertTitle>
        )}
        {currentNotification.message}
      </Alert>
    </Snackbar>
  );
};

export default NotificationManager;

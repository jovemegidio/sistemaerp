import { FC, useState, useEffect } from 'react';
import { Outlet } from 'react-router-dom';
import { Box, useMediaQuery, useTheme } from '@mui/material';
import { useAppSelector, useAppDispatch } from '@store/index';
import { setSidebarOpen, setSidebarCollapsed } from '@store/slices/uiSlice';

import Header from './Header';
import Sidebar from './Sidebar';
import NotificationManager from '@components/common/NotificationManager';
import GlobalLoading from '@components/common/GlobalLoading';

const DRAWER_WIDTH = 280;
const DRAWER_COLLAPSED_WIDTH = 72;

const MainLayout: FC = () => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const dispatch = useAppDispatch();
  
  const { sidebarOpen, sidebarCollapsed, globalLoading, globalLoadingMessage } = useAppSelector(
    (state) => state.ui
  );

  // Handle responsive sidebar
  useEffect(() => {
    if (isMobile) {
      dispatch(setSidebarOpen(false));
      dispatch(setSidebarCollapsed(false));
    } else {
      dispatch(setSidebarOpen(true));
    }
  }, [isMobile, dispatch]);

  const handleSidebarToggle = () => {
    if (isMobile) {
      dispatch(setSidebarOpen(!sidebarOpen));
    } else {
      dispatch(setSidebarCollapsed(!sidebarCollapsed));
    }
  };

  const handleSidebarClose = () => {
    if (isMobile) {
      dispatch(setSidebarOpen(false));
    }
  };

  const drawerWidth = sidebarCollapsed ? DRAWER_COLLAPSED_WIDTH : DRAWER_WIDTH;

  return (
    <Box sx={{ display: 'flex', minHeight: '100vh' }}>
      {/* Header */}
      <Header 
        drawerWidth={isMobile ? 0 : drawerWidth}
        onMenuClick={handleSidebarToggle}
      />

      {/* Sidebar */}
      <Sidebar
        width={DRAWER_WIDTH}
        collapsedWidth={DRAWER_COLLAPSED_WIDTH}
        open={sidebarOpen}
        collapsed={sidebarCollapsed}
        isMobile={isMobile}
        onClose={handleSidebarClose}
      />

      {/* Main Content */}
      <Box
        component="main"
        sx={{
          flexGrow: 1,
          display: 'flex',
          flexDirection: 'column',
          minHeight: '100vh',
          width: { md: `calc(100% - ${drawerWidth}px)` },
          ml: { md: `${drawerWidth}px` },
          transition: theme.transitions.create(['margin', 'width'], {
            easing: theme.transitions.easing.sharp,
            duration: theme.transitions.duration.leavingScreen,
          }),
        }}
      >
        {/* Toolbar spacer */}
        <Box sx={{ height: 64 }} />

        {/* Page Content */}
        <Box
          sx={{
            flexGrow: 1,
            p: { xs: 2, sm: 3 },
            backgroundColor: 'background.default',
            minHeight: 'calc(100vh - 64px)',
          }}
        >
          <Outlet />
        </Box>
      </Box>

      {/* Notifications */}
      <NotificationManager />

      {/* Global Loading Overlay */}
      {globalLoading && <GlobalLoading message={globalLoadingMessage} />}
    </Box>
  );
};

export default MainLayout;

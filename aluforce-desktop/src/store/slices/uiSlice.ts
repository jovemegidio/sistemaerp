import { createSlice, PayloadAction } from '@reduxjs/toolkit';

// Types
export interface Notification {
  id: string;
  type: 'success' | 'error' | 'warning' | 'info';
  message: string;
  title?: string;
  duration?: number;
  timestamp: number;
}

export interface UiState {
  sidebarOpen: boolean;
  sidebarCollapsed: boolean;
  currentModule: string | null;
  currentPage: string | null;
  darkMode: boolean;
  notifications: Notification[];
  globalLoading: boolean;
  globalLoadingMessage: string | null;
  breadcrumbs: { label: string; path: string }[];
  modalStack: string[];
}

// Initial state
const initialState: UiState = {
  sidebarOpen: true,
  sidebarCollapsed: false,
  currentModule: null,
  currentPage: null,
  darkMode: false,
  notifications: [],
  globalLoading: false,
  globalLoadingMessage: null,
  breadcrumbs: [],
  modalStack: [],
};

// Slice
const uiSlice = createSlice({
  name: 'ui',
  initialState,
  reducers: {
    toggleSidebar: (state) => {
      state.sidebarOpen = !state.sidebarOpen;
    },
    setSidebarOpen: (state, action: PayloadAction<boolean>) => {
      state.sidebarOpen = action.payload;
    },
    toggleSidebarCollapse: (state) => {
      state.sidebarCollapsed = !state.sidebarCollapsed;
    },
    setSidebarCollapsed: (state, action: PayloadAction<boolean>) => {
      state.sidebarCollapsed = action.payload;
    },
    setCurrentModule: (state, action: PayloadAction<string | null>) => {
      state.currentModule = action.payload;
    },
    setCurrentPage: (state, action: PayloadAction<string | null>) => {
      state.currentPage = action.payload;
    },
    toggleDarkMode: (state) => {
      state.darkMode = !state.darkMode;
    },
    setDarkMode: (state, action: PayloadAction<boolean>) => {
      state.darkMode = action.payload;
    },
    addNotification: (state, action: PayloadAction<Omit<Notification, 'id' | 'timestamp'>>) => {
      const notification: Notification = {
        ...action.payload,
        id: `notification-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        timestamp: Date.now(),
        duration: action.payload.duration ?? 5000,
      };
      state.notifications.push(notification);
    },
    removeNotification: (state, action: PayloadAction<string>) => {
      state.notifications = state.notifications.filter(n => n.id !== action.payload);
    },
    clearAllNotifications: (state) => {
      state.notifications = [];
    },
    setGlobalLoading: (state, action: PayloadAction<boolean | { loading: boolean; message?: string }>) => {
      if (typeof action.payload === 'boolean') {
        state.globalLoading = action.payload;
        state.globalLoadingMessage = null;
      } else {
        state.globalLoading = action.payload.loading;
        state.globalLoadingMessage = action.payload.message ?? null;
      }
    },
    setBreadcrumbs: (state, action: PayloadAction<{ label: string; path: string }[]>) => {
      state.breadcrumbs = action.payload;
    },
    pushModal: (state, action: PayloadAction<string>) => {
      if (!state.modalStack.includes(action.payload)) {
        state.modalStack.push(action.payload);
      }
    },
    popModal: (state, action: PayloadAction<string | undefined>) => {
      if (action.payload) {
        state.modalStack = state.modalStack.filter(m => m !== action.payload);
      } else {
        state.modalStack.pop();
      }
    },
    clearModals: (state) => {
      state.modalStack = [];
    },
    resetUi: () => initialState,
  },
});

export const {
  toggleSidebar,
  setSidebarOpen,
  toggleSidebarCollapse,
  setSidebarCollapsed,
  setCurrentModule,
  setCurrentPage,
  toggleDarkMode,
  setDarkMode,
  addNotification,
  removeNotification,
  clearAllNotifications,
  setGlobalLoading,
  setBreadcrumbs,
  pushModal,
  popModal,
  clearModals,
  resetUi,
} = uiSlice.actions;

export default uiSlice.reducer;

// Notification helper actions
export const showSuccess = (message: string, title?: string) => 
  addNotification({ type: 'success', message, title });

export const showError = (message: string, title?: string) => 
  addNotification({ type: 'error', message, title, duration: 8000 });

export const showWarning = (message: string, title?: string) => 
  addNotification({ type: 'warning', message, title });

export const showInfo = (message: string, title?: string) => 
  addNotification({ type: 'info', message, title });

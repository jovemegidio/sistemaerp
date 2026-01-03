import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import { invoke } from '@tauri-apps/api/core';

// Types
interface Usuario {
  id: number;
  nome: string;
  email: string;
  permissoes: string;
  empresa_id: number | null;
  ativo: boolean;
  created_at: string;
  updated_at: string;
}

interface LoginCredentials {
  email: string;
  senha: string;
}

interface AuthState {
  user: Usuario | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
  lastActivity: number | null;
}

// Initial state
const initialState: AuthState = {
  user: null,
  token: null,
  isAuthenticated: false,
  isLoading: false,
  error: null,
  lastActivity: null,
};

// Async thunks
export const login = createAsyncThunk(
  'auth/login',
  async (credentials: LoginCredentials, { rejectWithValue }) => {
    try {
      const response = await invoke<{ user: Usuario; token: string }>('login', { 
        email: credentials.email, 
        senha: credentials.senha 
      });
      return response;
    } catch (error) {
      return rejectWithValue(error as string);
    }
  }
);

export const logout = createAsyncThunk(
  'auth/logout',
  async (_, { getState, rejectWithValue }) => {
    try {
      const state = getState() as { auth: AuthState };
      if (state.auth.token) {
        await invoke('logout', { token: state.auth.token });
      }
      return true;
    } catch (error) {
      return rejectWithValue(error as string);
    }
  }
);

export const validateSession = createAsyncThunk(
  'auth/validateSession',
  async (_, { getState, rejectWithValue }) => {
    try {
      const state = getState() as { auth: AuthState };
      if (!state.auth.token) {
        throw new Error('No token found');
      }
      const response = await invoke<{ user: Usuario }>('validate_session', { 
        token: state.auth.token 
      });
      return response;
    } catch (error) {
      return rejectWithValue(error as string);
    }
  }
);

export const changePassword = createAsyncThunk(
  'auth/changePassword',
  async ({ senhaAtual, novaSenha }: { senhaAtual: string; novaSenha: string }, { getState, rejectWithValue }) => {
    try {
      const state = getState() as { auth: AuthState };
      if (!state.auth.user) {
        throw new Error('User not authenticated');
      }
      await invoke('change_password', {
        usuarioId: state.auth.user.id,
        senhaAtual,
        novaSenha,
      });
      return true;
    } catch (error) {
      return rejectWithValue(error as string);
    }
  }
);

// Slice
const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    clearError: (state) => {
      state.error = null;
    },
    updateLastActivity: (state) => {
      state.lastActivity = Date.now();
    },
    resetAuth: () => initialState,
  },
  extraReducers: (builder) => {
    builder
      // Login
      .addCase(login.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(login.fulfilled, (state, action) => {
        state.isLoading = false;
        state.isAuthenticated = true;
        state.user = action.payload.user;
        state.token = action.payload.token;
        state.lastActivity = Date.now();
        state.error = null;
      })
      .addCase(login.rejected, (state, action) => {
        state.isLoading = false;
        state.isAuthenticated = false;
        state.error = action.payload as string || 'Erro ao fazer login';
      })
      // Logout
      .addCase(logout.pending, (state) => {
        state.isLoading = true;
      })
      .addCase(logout.fulfilled, () => initialState)
      .addCase(logout.rejected, () => initialState)
      // Validate Session
      .addCase(validateSession.pending, (state) => {
        state.isLoading = true;
      })
      .addCase(validateSession.fulfilled, (state, action) => {
        state.isLoading = false;
        state.isAuthenticated = true;
        state.user = action.payload.user;
        state.lastActivity = Date.now();
      })
      .addCase(validateSession.rejected, () => initialState)
      // Change Password
      .addCase(changePassword.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(changePassword.fulfilled, (state) => {
        state.isLoading = false;
        state.error = null;
      })
      .addCase(changePassword.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string || 'Erro ao alterar senha';
      });
  },
});

export const { clearError, updateLastActivity, resetAuth } = authSlice.actions;
export default authSlice.reducer;

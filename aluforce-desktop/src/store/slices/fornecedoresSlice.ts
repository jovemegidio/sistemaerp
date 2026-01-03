import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import { invoke } from '@tauri-apps/api/core';

// Types
interface Fornecedor {
  id: number;
  codigo: string;
  razao_social: string;
  nome_fantasia: string | null;
  cpf_cnpj: string;
  tipo_pessoa: string;
  email: string | null;
  telefone: string | null;
  celular: string | null;
  cep: string | null;
  logradouro: string | null;
  numero: string | null;
  complemento: string | null;
  bairro: string | null;
  cidade: string | null;
  uf: string | null;
  ativo: boolean;
  created_at: string;
  updated_at: string;
}

interface FornecedoresState {
  items: Fornecedor[];
  selectedItem: Fornecedor | null;
  isLoading: boolean;
  error: string | null;
  pagination: {
    page: number;
    limit: number;
    total: number;
  };
  filters: {
    search: string;
    ativo: boolean | null;
  };
}

const initialState: FornecedoresState = {
  items: [],
  selectedItem: null,
  isLoading: false,
  error: null,
  pagination: {
    page: 1,
    limit: 50,
    total: 0,
  },
  filters: {
    search: '',
    ativo: true,
  },
};

// Async thunks
export const fetchFornecedores = createAsyncThunk(
  'fornecedores/fetchAll',
  async (_, { getState, rejectWithValue }) => {
    try {
      const state = getState() as { fornecedores: FornecedoresState };
      const { pagination, filters } = state.fornecedores;
      const response = await invoke<{ items: Fornecedor[]; total: number }>('list_fornecedores', {
        page: pagination.page,
        limit: pagination.limit,
        search: filters.search || null,
        ativo: filters.ativo,
      });
      return response;
    } catch (error) {
      return rejectWithValue(error as string);
    }
  }
);

export const fetchFornecedorById = createAsyncThunk(
  'fornecedores/fetchById',
  async (id: number, { rejectWithValue }) => {
    try {
      const fornecedor = await invoke<Fornecedor>('get_fornecedor', { id });
      return fornecedor;
    } catch (error) {
      return rejectWithValue(error as string);
    }
  }
);

export const createFornecedor = createAsyncThunk(
  'fornecedores/create',
  async (fornecedor: Omit<Fornecedor, 'id' | 'created_at' | 'updated_at'>, { rejectWithValue }) => {
    try {
      const newFornecedor = await invoke<Fornecedor>('create_fornecedor', { fornecedor });
      return newFornecedor;
    } catch (error) {
      return rejectWithValue(error as string);
    }
  }
);

export const updateFornecedor = createAsyncThunk(
  'fornecedores/update',
  async ({ id, fornecedor }: { id: number; fornecedor: Partial<Fornecedor> }, { rejectWithValue }) => {
    try {
      const updated = await invoke<Fornecedor>('update_fornecedor', { id, fornecedor });
      return updated;
    } catch (error) {
      return rejectWithValue(error as string);
    }
  }
);

export const deleteFornecedor = createAsyncThunk(
  'fornecedores/delete',
  async (id: number, { rejectWithValue }) => {
    try {
      await invoke('delete_fornecedor', { id });
      return id;
    } catch (error) {
      return rejectWithValue(error as string);
    }
  }
);

// Slice
const fornecedoresSlice = createSlice({
  name: 'fornecedores',
  initialState,
  reducers: {
    setPage: (state, action: PayloadAction<number>) => {
      state.pagination.page = action.payload;
    },
    setLimit: (state, action: PayloadAction<number>) => {
      state.pagination.limit = action.payload;
      state.pagination.page = 1;
    },
    setFilters: (state, action: PayloadAction<Partial<FornecedoresState['filters']>>) => {
      state.filters = { ...state.filters, ...action.payload };
      state.pagination.page = 1;
    },
    clearFilters: (state) => {
      state.filters = initialState.filters;
      state.pagination.page = 1;
    },
    setSelectedItem: (state, action: PayloadAction<Fornecedor | null>) => {
      state.selectedItem = action.payload;
    },
    clearError: (state) => {
      state.error = null;
    },
    resetFornecedores: () => initialState,
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchFornecedores.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(fetchFornecedores.fulfilled, (state, action) => {
        state.isLoading = false;
        state.items = action.payload.items;
        state.pagination.total = action.payload.total;
      })
      .addCase(fetchFornecedores.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      })
      .addCase(fetchFornecedorById.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(fetchFornecedorById.fulfilled, (state, action) => {
        state.isLoading = false;
        state.selectedItem = action.payload;
      })
      .addCase(fetchFornecedorById.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      })
      .addCase(createFornecedor.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(createFornecedor.fulfilled, (state, action) => {
        state.isLoading = false;
        state.items.unshift(action.payload);
        state.pagination.total += 1;
      })
      .addCase(createFornecedor.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      })
      .addCase(updateFornecedor.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(updateFornecedor.fulfilled, (state, action) => {
        state.isLoading = false;
        const index = state.items.findIndex(item => item.id === action.payload.id);
        if (index !== -1) {
          state.items[index] = action.payload;
        }
        if (state.selectedItem?.id === action.payload.id) {
          state.selectedItem = action.payload;
        }
      })
      .addCase(updateFornecedor.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      })
      .addCase(deleteFornecedor.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(deleteFornecedor.fulfilled, (state, action) => {
        state.isLoading = false;
        state.items = state.items.filter(item => item.id !== action.payload);
        state.pagination.total -= 1;
        if (state.selectedItem?.id === action.payload) {
          state.selectedItem = null;
        }
      })
      .addCase(deleteFornecedor.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      });
  },
});

export const {
  setPage,
  setLimit,
  setFilters,
  clearFilters,
  setSelectedItem,
  clearError,
  resetFornecedores,
} = fornecedoresSlice.actions;

export default fornecedoresSlice.reducer;

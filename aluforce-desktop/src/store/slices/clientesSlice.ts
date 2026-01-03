import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import { invoke } from '@tauri-apps/api/core';

// Types
interface Cliente {
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

interface ClientesState {
  items: Cliente[];
  selectedItem: Cliente | null;
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
    tipo_pessoa: string | null;
  };
}

const initialState: ClientesState = {
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
    tipo_pessoa: null,
  },
};

// Async thunks
export const fetchClientes = createAsyncThunk(
  'clientes/fetchAll',
  async (_, { getState, rejectWithValue }) => {
    try {
      const state = getState() as { clientes: ClientesState };
      const { pagination, filters } = state.clientes;
      const response = await invoke<{ items: Cliente[]; total: number }>('list_clientes', {
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

export const fetchClienteById = createAsyncThunk(
  'clientes/fetchById',
  async (id: number, { rejectWithValue }) => {
    try {
      const cliente = await invoke<Cliente>('get_cliente', { id });
      return cliente;
    } catch (error) {
      return rejectWithValue(error as string);
    }
  }
);

export const createCliente = createAsyncThunk(
  'clientes/create',
  async (cliente: Omit<Cliente, 'id' | 'created_at' | 'updated_at'>, { rejectWithValue }) => {
    try {
      const newCliente = await invoke<Cliente>('create_cliente', { cliente });
      return newCliente;
    } catch (error) {
      return rejectWithValue(error as string);
    }
  }
);

export const updateCliente = createAsyncThunk(
  'clientes/update',
  async ({ id, cliente }: { id: number; cliente: Partial<Cliente> }, { rejectWithValue }) => {
    try {
      const updated = await invoke<Cliente>('update_cliente', { id, cliente });
      return updated;
    } catch (error) {
      return rejectWithValue(error as string);
    }
  }
);

export const deleteCliente = createAsyncThunk(
  'clientes/delete',
  async (id: number, { rejectWithValue }) => {
    try {
      await invoke('delete_cliente', { id });
      return id;
    } catch (error) {
      return rejectWithValue(error as string);
    }
  }
);

// Slice
const clientesSlice = createSlice({
  name: 'clientes',
  initialState,
  reducers: {
    setPage: (state, action: PayloadAction<number>) => {
      state.pagination.page = action.payload;
    },
    setLimit: (state, action: PayloadAction<number>) => {
      state.pagination.limit = action.payload;
      state.pagination.page = 1;
    },
    setFilters: (state, action: PayloadAction<Partial<ClientesState['filters']>>) => {
      state.filters = { ...state.filters, ...action.payload };
      state.pagination.page = 1;
    },
    clearFilters: (state) => {
      state.filters = initialState.filters;
      state.pagination.page = 1;
    },
    setSelectedItem: (state, action: PayloadAction<Cliente | null>) => {
      state.selectedItem = action.payload;
    },
    clearError: (state) => {
      state.error = null;
    },
    resetClientes: () => initialState,
  },
  extraReducers: (builder) => {
    builder
      // Fetch All
      .addCase(fetchClientes.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(fetchClientes.fulfilled, (state, action) => {
        state.isLoading = false;
        state.items = action.payload.items;
        state.pagination.total = action.payload.total;
      })
      .addCase(fetchClientes.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      })
      // Fetch By Id
      .addCase(fetchClienteById.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(fetchClienteById.fulfilled, (state, action) => {
        state.isLoading = false;
        state.selectedItem = action.payload;
      })
      .addCase(fetchClienteById.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      })
      // Create
      .addCase(createCliente.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(createCliente.fulfilled, (state, action) => {
        state.isLoading = false;
        state.items.unshift(action.payload);
        state.pagination.total += 1;
      })
      .addCase(createCliente.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      })
      // Update
      .addCase(updateCliente.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(updateCliente.fulfilled, (state, action) => {
        state.isLoading = false;
        const index = state.items.findIndex(item => item.id === action.payload.id);
        if (index !== -1) {
          state.items[index] = action.payload;
        }
        if (state.selectedItem?.id === action.payload.id) {
          state.selectedItem = action.payload;
        }
      })
      .addCase(updateCliente.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      })
      // Delete
      .addCase(deleteCliente.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(deleteCliente.fulfilled, (state, action) => {
        state.isLoading = false;
        state.items = state.items.filter(item => item.id !== action.payload);
        state.pagination.total -= 1;
        if (state.selectedItem?.id === action.payload) {
          state.selectedItem = null;
        }
      })
      .addCase(deleteCliente.rejected, (state, action) => {
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
  resetClientes,
} = clientesSlice.actions;

export default clientesSlice.reducer;

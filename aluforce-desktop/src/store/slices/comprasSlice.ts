import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import { invoke } from '@tauri-apps/api/core';

// Types
interface PedidoCompra {
  id: number;
  numero: string;
  fornecedor_id: number;
  fornecedor_nome?: string;
  data_pedido: string;
  data_entrega: string | null;
  status: string;
  subtotal: number;
  desconto: number;
  frete: number;
  total: number;
  observacoes: string | null;
  created_at: string;
  updated_at: string;
}

interface CompraItem {
  id: number;
  pedido_id: number;
  produto_id: number;
  produto_nome?: string;
  quantidade: number;
  preco_unitario: number;
  desconto: number;
  total: number;
}

interface ComprasState {
  pedidos: PedidoCompra[];
  selectedPedido: PedidoCompra | null;
  pedidoItens: CompraItem[];
  isLoading: boolean;
  error: string | null;
  pagination: {
    page: number;
    limit: number;
    total: number;
  };
  filters: {
    search: string;
    status: string | null;
    fornecedorId: number | null;
    dataInicio: string | null;
    dataFim: string | null;
  };
}

const initialState: ComprasState = {
  pedidos: [],
  selectedPedido: null,
  pedidoItens: [],
  isLoading: false,
  error: null,
  pagination: {
    page: 1,
    limit: 50,
    total: 0,
  },
  filters: {
    search: '',
    status: null,
    fornecedorId: null,
    dataInicio: null,
    dataFim: null,
  },
};

// Async thunks
export const fetchPedidosCompra = createAsyncThunk(
  'compras/fetchPedidos',
  async (_, { getState, rejectWithValue }) => {
    try {
      const state = getState() as { compras: ComprasState };
      const { pagination, filters } = state.compras;
      const response = await invoke<{ items: PedidoCompra[]; total: number }>('list_pedidos_compra', {
        page: pagination.page,
        limit: pagination.limit,
        search: filters.search || null,
        status: filters.status,
        fornecedorId: filters.fornecedorId,
        dataInicio: filters.dataInicio,
        dataFim: filters.dataFim,
      });
      return response;
    } catch (error) {
      return rejectWithValue(error as string);
    }
  }
);

export const fetchPedidoCompraById = createAsyncThunk(
  'compras/fetchPedidoById',
  async (id: number, { rejectWithValue }) => {
    try {
      const pedido = await invoke<{ pedido: PedidoCompra; itens: CompraItem[] }>('get_pedido_compra', { id });
      return pedido;
    } catch (error) {
      return rejectWithValue(error as string);
    }
  }
);

export const createPedidoCompra = createAsyncThunk(
  'compras/createPedido',
  async (data: { pedido: Omit<PedidoCompra, 'id' | 'numero' | 'created_at' | 'updated_at'>; itens: Omit<CompraItem, 'id' | 'pedido_id'>[] }, { rejectWithValue }) => {
    try {
      const newPedido = await invoke<PedidoCompra>('create_pedido_compra', data);
      return newPedido;
    } catch (error) {
      return rejectWithValue(error as string);
    }
  }
);

export const updatePedidoCompra = createAsyncThunk(
  'compras/updatePedido',
  async ({ id, pedido, itens }: { id: number; pedido: Partial<PedidoCompra>; itens?: Omit<CompraItem, 'id' | 'pedido_id'>[] }, { rejectWithValue }) => {
    try {
      const updated = await invoke<PedidoCompra>('update_pedido_compra', { id, pedido, itens });
      return updated;
    } catch (error) {
      return rejectWithValue(error as string);
    }
  }
);

export const deletePedidoCompra = createAsyncThunk(
  'compras/deletePedido',
  async (id: number, { rejectWithValue }) => {
    try {
      await invoke('delete_pedido_compra', { id });
      return id;
    } catch (error) {
      return rejectWithValue(error as string);
    }
  }
);

export const receberPedidoCompra = createAsyncThunk(
  'compras/receberPedido',
  async (id: number, { rejectWithValue }) => {
    try {
      const updated = await invoke<PedidoCompra>('receber_pedido_compra', { id });
      return updated;
    } catch (error) {
      return rejectWithValue(error as string);
    }
  }
);

// Slice
const comprasSlice = createSlice({
  name: 'compras',
  initialState,
  reducers: {
    setPage: (state, action: PayloadAction<number>) => {
      state.pagination.page = action.payload;
    },
    setLimit: (state, action: PayloadAction<number>) => {
      state.pagination.limit = action.payload;
      state.pagination.page = 1;
    },
    setFilters: (state, action: PayloadAction<Partial<ComprasState['filters']>>) => {
      state.filters = { ...state.filters, ...action.payload };
      state.pagination.page = 1;
    },
    clearFilters: (state) => {
      state.filters = initialState.filters;
      state.pagination.page = 1;
    },
    setSelectedPedido: (state, action: PayloadAction<PedidoCompra | null>) => {
      state.selectedPedido = action.payload;
    },
    clearPedidoItens: (state) => {
      state.pedidoItens = [];
    },
    clearError: (state) => {
      state.error = null;
    },
    resetCompras: () => initialState,
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchPedidosCompra.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(fetchPedidosCompra.fulfilled, (state, action) => {
        state.isLoading = false;
        state.pedidos = action.payload.items;
        state.pagination.total = action.payload.total;
      })
      .addCase(fetchPedidosCompra.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      })
      .addCase(fetchPedidoCompraById.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(fetchPedidoCompraById.fulfilled, (state, action) => {
        state.isLoading = false;
        state.selectedPedido = action.payload.pedido;
        state.pedidoItens = action.payload.itens;
      })
      .addCase(fetchPedidoCompraById.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      })
      .addCase(createPedidoCompra.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(createPedidoCompra.fulfilled, (state, action) => {
        state.isLoading = false;
        state.pedidos.unshift(action.payload);
        state.pagination.total += 1;
      })
      .addCase(createPedidoCompra.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      })
      .addCase(updatePedidoCompra.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(updatePedidoCompra.fulfilled, (state, action) => {
        state.isLoading = false;
        const index = state.pedidos.findIndex(p => p.id === action.payload.id);
        if (index !== -1) {
          state.pedidos[index] = action.payload;
        }
        if (state.selectedPedido?.id === action.payload.id) {
          state.selectedPedido = action.payload;
        }
      })
      .addCase(updatePedidoCompra.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      })
      .addCase(deletePedidoCompra.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(deletePedidoCompra.fulfilled, (state, action) => {
        state.isLoading = false;
        state.pedidos = state.pedidos.filter(p => p.id !== action.payload);
        state.pagination.total -= 1;
        if (state.selectedPedido?.id === action.payload) {
          state.selectedPedido = null;
          state.pedidoItens = [];
        }
      })
      .addCase(deletePedidoCompra.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      })
      .addCase(receberPedidoCompra.fulfilled, (state, action) => {
        const index = state.pedidos.findIndex(p => p.id === action.payload.id);
        if (index !== -1) {
          state.pedidos[index] = action.payload;
        }
        if (state.selectedPedido?.id === action.payload.id) {
          state.selectedPedido = action.payload;
        }
      });
  },
});

export const {
  setPage,
  setLimit,
  setFilters,
  clearFilters,
  setSelectedPedido,
  clearPedidoItens,
  clearError,
  resetCompras,
} = comprasSlice.actions;

export default comprasSlice.reducer;

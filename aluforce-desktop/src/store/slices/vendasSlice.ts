import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import { invoke } from '@tauri-apps/api/core';

// Types
interface PedidoVenda {
  id: number;
  numero: string;
  cliente_id: number;
  cliente_nome?: string;
  vendedor_id: number | null;
  vendedor_nome?: string;
  data_pedido: string;
  data_entrega: string | null;
  status: string;
  subtotal: number;
  desconto: number;
  total: number;
  observacoes: string | null;
  created_at: string;
  updated_at: string;
}

interface PedidoItem {
  id: number;
  pedido_id: number;
  produto_id: number;
  produto_nome?: string;
  quantidade: number;
  preco_unitario: number;
  desconto: number;
  total: number;
}

interface DashboardVendas {
  total_pedidos: number;
  total_faturado: number;
  ticket_medio: number;
  pedidos_pendentes: number;
  pedidos_mes: number;
  faturamento_mes: number;
  top_clientes: { cliente_id: number; nome: string; total: number }[];
  top_produtos: { produto_id: number; nome: string; quantidade: number }[];
}

interface VendasState {
  pedidos: PedidoVenda[];
  selectedPedido: PedidoVenda | null;
  pedidoItens: PedidoItem[];
  dashboard: DashboardVendas | null;
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
    clienteId: number | null;
    dataInicio: string | null;
    dataFim: string | null;
  };
}

const initialState: VendasState = {
  pedidos: [],
  selectedPedido: null,
  pedidoItens: [],
  dashboard: null,
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
    clienteId: null,
    dataInicio: null,
    dataFim: null,
  },
};

// Async thunks
export const fetchPedidosVenda = createAsyncThunk(
  'vendas/fetchPedidos',
  async (_, { getState, rejectWithValue }) => {
    try {
      const state = getState() as { vendas: VendasState };
      const { pagination, filters } = state.vendas;
      const response = await invoke<{ items: PedidoVenda[]; total: number }>('list_pedidos_venda', {
        page: pagination.page,
        limit: pagination.limit,
        search: filters.search || null,
        status: filters.status,
        clienteId: filters.clienteId,
        dataInicio: filters.dataInicio,
        dataFim: filters.dataFim,
      });
      return response;
    } catch (error) {
      return rejectWithValue(error as string);
    }
  }
);

export const fetchPedidoById = createAsyncThunk(
  'vendas/fetchPedidoById',
  async (id: number, { rejectWithValue }) => {
    try {
      const pedido = await invoke<{ pedido: PedidoVenda; itens: PedidoItem[] }>('get_pedido_venda', { id });
      return pedido;
    } catch (error) {
      return rejectWithValue(error as string);
    }
  }
);

export const createPedidoVenda = createAsyncThunk(
  'vendas/createPedido',
  async (data: { pedido: Omit<PedidoVenda, 'id' | 'numero' | 'created_at' | 'updated_at'>; itens: Omit<PedidoItem, 'id' | 'pedido_id'>[] }, { rejectWithValue }) => {
    try {
      const newPedido = await invoke<PedidoVenda>('create_pedido_venda', data);
      return newPedido;
    } catch (error) {
      return rejectWithValue(error as string);
    }
  }
);

export const updatePedidoVenda = createAsyncThunk(
  'vendas/updatePedido',
  async ({ id, pedido, itens }: { id: number; pedido: Partial<PedidoVenda>; itens?: Omit<PedidoItem, 'id' | 'pedido_id'>[] }, { rejectWithValue }) => {
    try {
      const updated = await invoke<PedidoVenda>('update_pedido_venda', { id, pedido, itens });
      return updated;
    } catch (error) {
      return rejectWithValue(error as string);
    }
  }
);

export const deletePedidoVenda = createAsyncThunk(
  'vendas/deletePedido',
  async (id: number, { rejectWithValue }) => {
    try {
      await invoke('delete_pedido_venda', { id });
      return id;
    } catch (error) {
      return rejectWithValue(error as string);
    }
  }
);

export const updateStatusPedido = createAsyncThunk(
  'vendas/updateStatus',
  async ({ id, status }: { id: number; status: string }, { rejectWithValue }) => {
    try {
      const updated = await invoke<PedidoVenda>('update_status_pedido_venda', { id, status });
      return updated;
    } catch (error) {
      return rejectWithValue(error as string);
    }
  }
);

export const fetchDashboardVendas = createAsyncThunk(
  'vendas/fetchDashboard',
  async (periodo: { dataInicio: string; dataFim: string } | undefined, { rejectWithValue }) => {
    try {
      const dashboard = await invoke<DashboardVendas>('get_dashboard_vendas', periodo || {});
      return dashboard;
    } catch (error) {
      return rejectWithValue(error as string);
    }
  }
);

// Slice
const vendasSlice = createSlice({
  name: 'vendas',
  initialState,
  reducers: {
    setPage: (state, action: PayloadAction<number>) => {
      state.pagination.page = action.payload;
    },
    setLimit: (state, action: PayloadAction<number>) => {
      state.pagination.limit = action.payload;
      state.pagination.page = 1;
    },
    setFilters: (state, action: PayloadAction<Partial<VendasState['filters']>>) => {
      state.filters = { ...state.filters, ...action.payload };
      state.pagination.page = 1;
    },
    clearFilters: (state) => {
      state.filters = initialState.filters;
      state.pagination.page = 1;
    },
    setSelectedPedido: (state, action: PayloadAction<PedidoVenda | null>) => {
      state.selectedPedido = action.payload;
    },
    clearPedidoItens: (state) => {
      state.pedidoItens = [];
    },
    clearError: (state) => {
      state.error = null;
    },
    resetVendas: () => initialState,
  },
  extraReducers: (builder) => {
    builder
      // Fetch Pedidos
      .addCase(fetchPedidosVenda.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(fetchPedidosVenda.fulfilled, (state, action) => {
        state.isLoading = false;
        state.pedidos = action.payload.items;
        state.pagination.total = action.payload.total;
      })
      .addCase(fetchPedidosVenda.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      })
      // Fetch Pedido By Id
      .addCase(fetchPedidoById.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(fetchPedidoById.fulfilled, (state, action) => {
        state.isLoading = false;
        state.selectedPedido = action.payload.pedido;
        state.pedidoItens = action.payload.itens;
      })
      .addCase(fetchPedidoById.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      })
      // Create Pedido
      .addCase(createPedidoVenda.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(createPedidoVenda.fulfilled, (state, action) => {
        state.isLoading = false;
        state.pedidos.unshift(action.payload);
        state.pagination.total += 1;
      })
      .addCase(createPedidoVenda.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      })
      // Update Pedido
      .addCase(updatePedidoVenda.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(updatePedidoVenda.fulfilled, (state, action) => {
        state.isLoading = false;
        const index = state.pedidos.findIndex(p => p.id === action.payload.id);
        if (index !== -1) {
          state.pedidos[index] = action.payload;
        }
        if (state.selectedPedido?.id === action.payload.id) {
          state.selectedPedido = action.payload;
        }
      })
      .addCase(updatePedidoVenda.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      })
      // Delete Pedido
      .addCase(deletePedidoVenda.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(deletePedidoVenda.fulfilled, (state, action) => {
        state.isLoading = false;
        state.pedidos = state.pedidos.filter(p => p.id !== action.payload);
        state.pagination.total -= 1;
        if (state.selectedPedido?.id === action.payload) {
          state.selectedPedido = null;
          state.pedidoItens = [];
        }
      })
      .addCase(deletePedidoVenda.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      })
      // Update Status
      .addCase(updateStatusPedido.fulfilled, (state, action) => {
        const index = state.pedidos.findIndex(p => p.id === action.payload.id);
        if (index !== -1) {
          state.pedidos[index] = action.payload;
        }
        if (state.selectedPedido?.id === action.payload.id) {
          state.selectedPedido = action.payload;
        }
      })
      // Dashboard
      .addCase(fetchDashboardVendas.pending, (state) => {
        state.isLoading = true;
      })
      .addCase(fetchDashboardVendas.fulfilled, (state, action) => {
        state.isLoading = false;
        state.dashboard = action.payload;
      })
      .addCase(fetchDashboardVendas.rejected, (state, action) => {
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
  setSelectedPedido,
  clearPedidoItens,
  clearError,
  resetVendas,
} = vendasSlice.actions;

export default vendasSlice.reducer;

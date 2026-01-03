import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import { invoke } from '@tauri-apps/api/core';

// Types
interface OrdemProducao {
  id: number;
  numero: string;
  produto_id: number;
  produto_nome?: string;
  quantidade: number;
  quantidade_produzida: number;
  data_inicio: string | null;
  data_previsao: string | null;
  data_conclusao: string | null;
  status: string;
  prioridade: string;
  responsavel_id: number | null;
  responsavel_nome?: string;
  observacoes: string | null;
  created_at: string;
  updated_at: string;
}

interface EtapaProducao {
  id: number;
  ordem_id: number;
  nome: string;
  descricao: string | null;
  sequencia: number;
  tempo_estimado: number;
  tempo_real: number | null;
  status: string;
  data_inicio: string | null;
  data_conclusao: string | null;
}

interface DashboardPCP {
  ordens_total: number;
  ordens_andamento: number;
  ordens_pendentes: number;
  ordens_concluidas_mes: number;
  eficiencia_media: number;
  producao_por_produto: { produto_id: number; nome: string; quantidade: number }[];
  ordens_por_status: { status: string; quantidade: number }[];
}

interface PcpState {
  ordens: OrdemProducao[];
  selectedOrdem: OrdemProducao | null;
  etapas: EtapaProducao[];
  dashboard: DashboardPCP | null;
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
    prioridade: string | null;
    produtoId: number | null;
    dataInicio: string | null;
    dataFim: string | null;
  };
}

const initialState: PcpState = {
  ordens: [],
  selectedOrdem: null,
  etapas: [],
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
    prioridade: null,
    produtoId: null,
    dataInicio: null,
    dataFim: null,
  },
};

// Async thunks
export const fetchOrdensProducao = createAsyncThunk(
  'pcp/fetchOrdens',
  async (_, { getState, rejectWithValue }) => {
    try {
      const state = getState() as { pcp: PcpState };
      const { pagination, filters } = state.pcp;
      const response = await invoke<{ items: OrdemProducao[]; total: number }>('list_ordens_producao', {
        page: pagination.page,
        limit: pagination.limit,
        search: filters.search || null,
        status: filters.status,
        prioridade: filters.prioridade,
        produtoId: filters.produtoId,
        dataInicio: filters.dataInicio,
        dataFim: filters.dataFim,
      });
      return response;
    } catch (error) {
      return rejectWithValue(error as string);
    }
  }
);

export const fetchOrdemById = createAsyncThunk(
  'pcp/fetchOrdemById',
  async (id: number, { rejectWithValue }) => {
    try {
      const ordem = await invoke<{ ordem: OrdemProducao; etapas: EtapaProducao[] }>('get_ordem_producao', { id });
      return ordem;
    } catch (error) {
      return rejectWithValue(error as string);
    }
  }
);

export const createOrdemProducao = createAsyncThunk(
  'pcp/createOrdem',
  async (data: { ordem: Omit<OrdemProducao, 'id' | 'numero' | 'created_at' | 'updated_at'>; etapas?: Omit<EtapaProducao, 'id' | 'ordem_id'>[] }, { rejectWithValue }) => {
    try {
      const newOrdem = await invoke<OrdemProducao>('create_ordem_producao', data);
      return newOrdem;
    } catch (error) {
      return rejectWithValue(error as string);
    }
  }
);

export const updateOrdemProducao = createAsyncThunk(
  'pcp/updateOrdem',
  async ({ id, ordem }: { id: number; ordem: Partial<OrdemProducao> }, { rejectWithValue }) => {
    try {
      const updated = await invoke<OrdemProducao>('update_ordem_producao', { id, ordem });
      return updated;
    } catch (error) {
      return rejectWithValue(error as string);
    }
  }
);

export const deleteOrdemProducao = createAsyncThunk(
  'pcp/deleteOrdem',
  async (id: number, { rejectWithValue }) => {
    try {
      await invoke('delete_ordem_producao', { id });
      return id;
    } catch (error) {
      return rejectWithValue(error as string);
    }
  }
);

export const iniciarOrdem = createAsyncThunk(
  'pcp/iniciarOrdem',
  async (id: number, { rejectWithValue }) => {
    try {
      const updated = await invoke<OrdemProducao>('iniciar_ordem_producao', { id });
      return updated;
    } catch (error) {
      return rejectWithValue(error as string);
    }
  }
);

export const concluirOrdem = createAsyncThunk(
  'pcp/concluirOrdem',
  async ({ id, quantidadeProduzida }: { id: number; quantidadeProduzida: number }, { rejectWithValue }) => {
    try {
      const updated = await invoke<OrdemProducao>('concluir_ordem_producao', { id, quantidadeProduzida });
      return updated;
    } catch (error) {
      return rejectWithValue(error as string);
    }
  }
);

export const apontarProducao = createAsyncThunk(
  'pcp/apontarProducao',
  async ({ ordemId, quantidade }: { ordemId: number; quantidade: number }, { rejectWithValue }) => {
    try {
      const updated = await invoke<OrdemProducao>('apontar_producao', { ordemId, quantidade });
      return updated;
    } catch (error) {
      return rejectWithValue(error as string);
    }
  }
);

export const fetchDashboardPCP = createAsyncThunk(
  'pcp/fetchDashboard',
  async (periodo: { dataInicio: string; dataFim: string } | undefined, { rejectWithValue }) => {
    try {
      const dashboard = await invoke<DashboardPCP>('get_dashboard_pcp', periodo || {});
      return dashboard;
    } catch (error) {
      return rejectWithValue(error as string);
    }
  }
);

// Slice
const pcpSlice = createSlice({
  name: 'pcp',
  initialState,
  reducers: {
    setPage: (state, action: PayloadAction<number>) => {
      state.pagination.page = action.payload;
    },
    setLimit: (state, action: PayloadAction<number>) => {
      state.pagination.limit = action.payload;
      state.pagination.page = 1;
    },
    setFilters: (state, action: PayloadAction<Partial<PcpState['filters']>>) => {
      state.filters = { ...state.filters, ...action.payload };
      state.pagination.page = 1;
    },
    clearFilters: (state) => {
      state.filters = initialState.filters;
      state.pagination.page = 1;
    },
    setSelectedOrdem: (state, action: PayloadAction<OrdemProducao | null>) => {
      state.selectedOrdem = action.payload;
    },
    clearEtapas: (state) => {
      state.etapas = [];
    },
    clearError: (state) => {
      state.error = null;
    },
    resetPcp: () => initialState,
  },
  extraReducers: (builder) => {
    builder
      // Fetch Ordens
      .addCase(fetchOrdensProducao.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(fetchOrdensProducao.fulfilled, (state, action) => {
        state.isLoading = false;
        state.ordens = action.payload.items;
        state.pagination.total = action.payload.total;
      })
      .addCase(fetchOrdensProducao.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      })
      // Fetch By Id
      .addCase(fetchOrdemById.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(fetchOrdemById.fulfilled, (state, action) => {
        state.isLoading = false;
        state.selectedOrdem = action.payload.ordem;
        state.etapas = action.payload.etapas;
      })
      .addCase(fetchOrdemById.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      })
      // Create
      .addCase(createOrdemProducao.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(createOrdemProducao.fulfilled, (state, action) => {
        state.isLoading = false;
        state.ordens.unshift(action.payload);
        state.pagination.total += 1;
      })
      .addCase(createOrdemProducao.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      })
      // Update
      .addCase(updateOrdemProducao.fulfilled, (state, action) => {
        const index = state.ordens.findIndex(o => o.id === action.payload.id);
        if (index !== -1) {
          state.ordens[index] = action.payload;
        }
        if (state.selectedOrdem?.id === action.payload.id) {
          state.selectedOrdem = action.payload;
        }
      })
      // Delete
      .addCase(deleteOrdemProducao.fulfilled, (state, action) => {
        state.ordens = state.ordens.filter(o => o.id !== action.payload);
        state.pagination.total -= 1;
        if (state.selectedOrdem?.id === action.payload) {
          state.selectedOrdem = null;
          state.etapas = [];
        }
      })
      // Iniciar
      .addCase(iniciarOrdem.fulfilled, (state, action) => {
        const index = state.ordens.findIndex(o => o.id === action.payload.id);
        if (index !== -1) {
          state.ordens[index] = action.payload;
        }
        if (state.selectedOrdem?.id === action.payload.id) {
          state.selectedOrdem = action.payload;
        }
      })
      // Concluir
      .addCase(concluirOrdem.fulfilled, (state, action) => {
        const index = state.ordens.findIndex(o => o.id === action.payload.id);
        if (index !== -1) {
          state.ordens[index] = action.payload;
        }
        if (state.selectedOrdem?.id === action.payload.id) {
          state.selectedOrdem = action.payload;
        }
      })
      // Apontar
      .addCase(apontarProducao.fulfilled, (state, action) => {
        const index = state.ordens.findIndex(o => o.id === action.payload.id);
        if (index !== -1) {
          state.ordens[index] = action.payload;
        }
        if (state.selectedOrdem?.id === action.payload.id) {
          state.selectedOrdem = action.payload;
        }
      })
      // Dashboard
      .addCase(fetchDashboardPCP.pending, (state) => {
        state.isLoading = true;
      })
      .addCase(fetchDashboardPCP.fulfilled, (state, action) => {
        state.isLoading = false;
        state.dashboard = action.payload;
      })
      .addCase(fetchDashboardPCP.rejected, (state, action) => {
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
  setSelectedOrdem,
  clearEtapas,
  clearError,
  resetPcp,
} = pcpSlice.actions;

export default pcpSlice.reducer;

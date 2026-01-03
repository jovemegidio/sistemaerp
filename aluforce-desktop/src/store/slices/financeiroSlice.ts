import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import { invoke } from '@tauri-apps/api/core';

// Types
interface ContaPagar {
  id: number;
  numero: string;
  fornecedor_id: number | null;
  fornecedor_nome?: string;
  descricao: string;
  valor: number;
  valor_pago: number;
  data_emissao: string;
  data_vencimento: string;
  data_pagamento: string | null;
  status: string;
  categoria: string | null;
  centro_custo: string | null;
  observacoes: string | null;
  created_at: string;
  updated_at: string;
}

interface ContaReceber {
  id: number;
  numero: string;
  cliente_id: number | null;
  cliente_nome?: string;
  descricao: string;
  valor: number;
  valor_recebido: number;
  data_emissao: string;
  data_vencimento: string;
  data_recebimento: string | null;
  status: string;
  categoria: string | null;
  centro_custo: string | null;
  observacoes: string | null;
  created_at: string;
  updated_at: string;
}

interface ContaBancaria {
  id: number;
  nome: string;
  banco: string;
  agencia: string;
  conta: string;
  tipo: string;
  saldo: number;
  ativo: boolean;
  created_at: string;
  updated_at: string;
}

interface DashboardFinanceiro {
  saldo_total: number;
  total_pagar: number;
  total_receber: number;
  pagar_vencidas: number;
  pagar_vencer: number;
  receber_vencidas: number;
  receber_vencer: number;
  fluxo_caixa: { data: string; entradas: number; saidas: number; saldo: number }[];
}

interface FinanceiroState {
  contasPagar: ContaPagar[];
  contasReceber: ContaReceber[];
  contasBancarias: ContaBancaria[];
  selectedContaPagar: ContaPagar | null;
  selectedContaReceber: ContaReceber | null;
  dashboard: DashboardFinanceiro | null;
  isLoading: boolean;
  error: string | null;
  pagination: {
    page: number;
    limit: number;
    totalPagar: number;
    totalReceber: number;
  };
  filters: {
    search: string;
    status: string | null;
    dataInicio: string | null;
    dataFim: string | null;
    tipo: 'pagar' | 'receber' | 'todos';
  };
}

const initialState: FinanceiroState = {
  contasPagar: [],
  contasReceber: [],
  contasBancarias: [],
  selectedContaPagar: null,
  selectedContaReceber: null,
  dashboard: null,
  isLoading: false,
  error: null,
  pagination: {
    page: 1,
    limit: 50,
    totalPagar: 0,
    totalReceber: 0,
  },
  filters: {
    search: '',
    status: null,
    dataInicio: null,
    dataFim: null,
    tipo: 'todos',
  },
};

// Async thunks - Contas a Pagar
export const fetchContasPagar = createAsyncThunk(
  'financeiro/fetchContasPagar',
  async (_, { getState, rejectWithValue }) => {
    try {
      const state = getState() as { financeiro: FinanceiroState };
      const { pagination, filters } = state.financeiro;
      const response = await invoke<{ items: ContaPagar[]; total: number }>('list_contas_pagar', {
        page: pagination.page,
        limit: pagination.limit,
        search: filters.search || null,
        status: filters.status,
        dataInicio: filters.dataInicio,
        dataFim: filters.dataFim,
      });
      return response;
    } catch (error) {
      return rejectWithValue(error as string);
    }
  }
);

export const createContaPagar = createAsyncThunk(
  'financeiro/createContaPagar',
  async (conta: Omit<ContaPagar, 'id' | 'numero' | 'created_at' | 'updated_at'>, { rejectWithValue }) => {
    try {
      const newConta = await invoke<ContaPagar>('create_conta_pagar', { conta });
      return newConta;
    } catch (error) {
      return rejectWithValue(error as string);
    }
  }
);

export const pagarConta = createAsyncThunk(
  'financeiro/pagarConta',
  async ({ id, valorPago, dataPagamento }: { id: number; valorPago: number; dataPagamento: string }, { rejectWithValue }) => {
    try {
      const updated = await invoke<ContaPagar>('pagar_conta', { id, valorPago, dataPagamento });
      return updated;
    } catch (error) {
      return rejectWithValue(error as string);
    }
  }
);

// Async thunks - Contas a Receber
export const fetchContasReceber = createAsyncThunk(
  'financeiro/fetchContasReceber',
  async (_, { getState, rejectWithValue }) => {
    try {
      const state = getState() as { financeiro: FinanceiroState };
      const { pagination, filters } = state.financeiro;
      const response = await invoke<{ items: ContaReceber[]; total: number }>('list_contas_receber', {
        page: pagination.page,
        limit: pagination.limit,
        search: filters.search || null,
        status: filters.status,
        dataInicio: filters.dataInicio,
        dataFim: filters.dataFim,
      });
      return response;
    } catch (error) {
      return rejectWithValue(error as string);
    }
  }
);

export const createContaReceber = createAsyncThunk(
  'financeiro/createContaReceber',
  async (conta: Omit<ContaReceber, 'id' | 'numero' | 'created_at' | 'updated_at'>, { rejectWithValue }) => {
    try {
      const newConta = await invoke<ContaReceber>('create_conta_receber', { conta });
      return newConta;
    } catch (error) {
      return rejectWithValue(error as string);
    }
  }
);

export const receberConta = createAsyncThunk(
  'financeiro/receberConta',
  async ({ id, valorRecebido, dataRecebimento }: { id: number; valorRecebido: number; dataRecebimento: string }, { rejectWithValue }) => {
    try {
      const updated = await invoke<ContaReceber>('receber_conta', { id, valorRecebido, dataRecebimento });
      return updated;
    } catch (error) {
      return rejectWithValue(error as string);
    }
  }
);

// Contas Bancárias
export const fetchContasBancarias = createAsyncThunk(
  'financeiro/fetchContasBancarias',
  async (_, { rejectWithValue }) => {
    try {
      const contas = await invoke<ContaBancaria[]>('list_contas_bancarias');
      return contas;
    } catch (error) {
      return rejectWithValue(error as string);
    }
  }
);

// Dashboard
export const fetchDashboardFinanceiro = createAsyncThunk(
  'financeiro/fetchDashboard',
  async (periodo: { dataInicio: string; dataFim: string } | undefined, { rejectWithValue }) => {
    try {
      const dashboard = await invoke<DashboardFinanceiro>('get_dashboard_financeiro', periodo || {});
      return dashboard;
    } catch (error) {
      return rejectWithValue(error as string);
    }
  }
);

// Slice
const financeiroSlice = createSlice({
  name: 'financeiro',
  initialState,
  reducers: {
    setPage: (state, action: PayloadAction<number>) => {
      state.pagination.page = action.payload;
    },
    setLimit: (state, action: PayloadAction<number>) => {
      state.pagination.limit = action.payload;
      state.pagination.page = 1;
    },
    setFilters: (state, action: PayloadAction<Partial<FinanceiroState['filters']>>) => {
      state.filters = { ...state.filters, ...action.payload };
      state.pagination.page = 1;
    },
    clearFilters: (state) => {
      state.filters = initialState.filters;
      state.pagination.page = 1;
    },
    setSelectedContaPagar: (state, action: PayloadAction<ContaPagar | null>) => {
      state.selectedContaPagar = action.payload;
    },
    setSelectedContaReceber: (state, action: PayloadAction<ContaReceber | null>) => {
      state.selectedContaReceber = action.payload;
    },
    clearError: (state) => {
      state.error = null;
    },
    resetFinanceiro: () => initialState,
  },
  extraReducers: (builder) => {
    builder
      // Contas a Pagar
      .addCase(fetchContasPagar.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(fetchContasPagar.fulfilled, (state, action) => {
        state.isLoading = false;
        state.contasPagar = action.payload.items;
        state.pagination.totalPagar = action.payload.total;
      })
      .addCase(fetchContasPagar.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      })
      .addCase(createContaPagar.fulfilled, (state, action) => {
        state.contasPagar.unshift(action.payload);
        state.pagination.totalPagar += 1;
      })
      .addCase(pagarConta.fulfilled, (state, action) => {
        const index = state.contasPagar.findIndex(c => c.id === action.payload.id);
        if (index !== -1) {
          state.contasPagar[index] = action.payload;
        }
      })
      // Contas a Receber
      .addCase(fetchContasReceber.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(fetchContasReceber.fulfilled, (state, action) => {
        state.isLoading = false;
        state.contasReceber = action.payload.items;
        state.pagination.totalReceber = action.payload.total;
      })
      .addCase(fetchContasReceber.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      })
      .addCase(createContaReceber.fulfilled, (state, action) => {
        state.contasReceber.unshift(action.payload);
        state.pagination.totalReceber += 1;
      })
      .addCase(receberConta.fulfilled, (state, action) => {
        const index = state.contasReceber.findIndex(c => c.id === action.payload.id);
        if (index !== -1) {
          state.contasReceber[index] = action.payload;
        }
      })
      // Contas Bancárias
      .addCase(fetchContasBancarias.fulfilled, (state, action) => {
        state.contasBancarias = action.payload;
      })
      // Dashboard
      .addCase(fetchDashboardFinanceiro.pending, (state) => {
        state.isLoading = true;
      })
      .addCase(fetchDashboardFinanceiro.fulfilled, (state, action) => {
        state.isLoading = false;
        state.dashboard = action.payload;
      })
      .addCase(fetchDashboardFinanceiro.rejected, (state, action) => {
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
  setSelectedContaPagar,
  setSelectedContaReceber,
  clearError,
  resetFinanceiro,
} = financeiroSlice.actions;

export default financeiroSlice.reducer;

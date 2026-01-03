import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import { invoke } from '@tauri-apps/api/core';

// Types
interface Funcionario {
  id: number;
  codigo: string;
  nome: string;
  cpf: string;
  rg: string | null;
  data_nascimento: string | null;
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
  cargo: string | null;
  departamento: string | null;
  data_admissao: string;
  data_demissao: string | null;
  salario: number | null;
  ativo: boolean;
  created_at: string;
  updated_at: string;
}

interface ControlePonto {
  id: number;
  funcionario_id: number;
  funcionario_nome?: string;
  data: string;
  entrada: string | null;
  saida_almoco: string | null;
  retorno_almoco: string | null;
  saida: string | null;
  horas_trabalhadas: number | null;
  horas_extras: number | null;
  observacoes: string | null;
  created_at: string;
}

interface Ferias {
  id: number;
  funcionario_id: number;
  funcionario_nome?: string;
  data_inicio: string;
  data_fim: string;
  dias: number;
  status: string;
  observacoes: string | null;
}

interface DashboardRH {
  total_funcionarios: number;
  funcionarios_ativos: number;
  admissoes_mes: number;
  demissoes_mes: number;
  funcionarios_por_departamento: { departamento: string; quantidade: number }[];
  aniversariantes_mes: { id: number; nome: string; data: string }[];
  ferias_proximas: { id: number; nome: string; inicio: string; fim: string }[];
}

interface RhState {
  funcionarios: Funcionario[];
  selectedFuncionario: Funcionario | null;
  pontos: ControlePonto[];
  ferias: Ferias[];
  dashboard: DashboardRH | null;
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
    departamento: string | null;
    cargo: string | null;
  };
}

const initialState: RhState = {
  funcionarios: [],
  selectedFuncionario: null,
  pontos: [],
  ferias: [],
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
    ativo: true,
    departamento: null,
    cargo: null,
  },
};

// Async thunks
export const fetchFuncionarios = createAsyncThunk(
  'rh/fetchFuncionarios',
  async (_, { getState, rejectWithValue }) => {
    try {
      const state = getState() as { rh: RhState };
      const { pagination, filters } = state.rh;
      const response = await invoke<{ items: Funcionario[]; total: number }>('list_funcionarios', {
        page: pagination.page,
        limit: pagination.limit,
        search: filters.search || null,
        ativo: filters.ativo,
        departamento: filters.departamento,
        cargo: filters.cargo,
      });
      return response;
    } catch (error) {
      return rejectWithValue(error as string);
    }
  }
);

export const fetchFuncionarioById = createAsyncThunk(
  'rh/fetchFuncionarioById',
  async (id: number, { rejectWithValue }) => {
    try {
      const funcionario = await invoke<Funcionario>('get_funcionario', { id });
      return funcionario;
    } catch (error) {
      return rejectWithValue(error as string);
    }
  }
);

export const createFuncionario = createAsyncThunk(
  'rh/createFuncionario',
  async (funcionario: Omit<Funcionario, 'id' | 'codigo' | 'created_at' | 'updated_at'>, { rejectWithValue }) => {
    try {
      const newFuncionario = await invoke<Funcionario>('create_funcionario', { funcionario });
      return newFuncionario;
    } catch (error) {
      return rejectWithValue(error as string);
    }
  }
);

export const updateFuncionario = createAsyncThunk(
  'rh/updateFuncionario',
  async ({ id, funcionario }: { id: number; funcionario: Partial<Funcionario> }, { rejectWithValue }) => {
    try {
      const updated = await invoke<Funcionario>('update_funcionario', { id, funcionario });
      return updated;
    } catch (error) {
      return rejectWithValue(error as string);
    }
  }
);

export const deleteFuncionario = createAsyncThunk(
  'rh/deleteFuncionario',
  async (id: number, { rejectWithValue }) => {
    try {
      await invoke('delete_funcionario', { id });
      return id;
    } catch (error) {
      return rejectWithValue(error as string);
    }
  }
);

// Ponto
export const registrarPonto = createAsyncThunk(
  'rh/registrarPonto',
  async ({ funcionarioId, tipo }: { funcionarioId: number; tipo: 'entrada' | 'saida_almoco' | 'retorno_almoco' | 'saida' }, { rejectWithValue }) => {
    try {
      const ponto = await invoke<ControlePonto>('registrar_ponto', { funcionarioId, tipo });
      return ponto;
    } catch (error) {
      return rejectWithValue(error as string);
    }
  }
);

export const fetchPontosFuncionario = createAsyncThunk(
  'rh/fetchPontos',
  async ({ funcionarioId, mes, ano }: { funcionarioId: number; mes: number; ano: number }, { rejectWithValue }) => {
    try {
      const pontos = await invoke<ControlePonto[]>('get_pontos_funcionario', { funcionarioId, mes, ano });
      return pontos;
    } catch (error) {
      return rejectWithValue(error as string);
    }
  }
);

// Férias
export const solicitarFerias = createAsyncThunk(
  'rh/solicitarFerias',
  async (ferias: { funcionarioId: number; dataInicio: string; dataFim: string; observacoes?: string }, { rejectWithValue }) => {
    try {
      const novaFerias = await invoke<Ferias>('solicitar_ferias', ferias);
      return novaFerias;
    } catch (error) {
      return rejectWithValue(error as string);
    }
  }
);

export const aprovarFerias = createAsyncThunk(
  'rh/aprovarFerias',
  async (id: number, { rejectWithValue }) => {
    try {
      const ferias = await invoke<Ferias>('aprovar_ferias', { id });
      return ferias;
    } catch (error) {
      return rejectWithValue(error as string);
    }
  }
);

// Dashboard
export const fetchDashboardRH = createAsyncThunk(
  'rh/fetchDashboard',
  async (_, { rejectWithValue }) => {
    try {
      const dashboard = await invoke<DashboardRH>('get_dashboard_rh');
      return dashboard;
    } catch (error) {
      return rejectWithValue(error as string);
    }
  }
);

// Slice
const rhSlice = createSlice({
  name: 'rh',
  initialState,
  reducers: {
    setPage: (state, action: PayloadAction<number>) => {
      state.pagination.page = action.payload;
    },
    setLimit: (state, action: PayloadAction<number>) => {
      state.pagination.limit = action.payload;
      state.pagination.page = 1;
    },
    setFilters: (state, action: PayloadAction<Partial<RhState['filters']>>) => {
      state.filters = { ...state.filters, ...action.payload };
      state.pagination.page = 1;
    },
    clearFilters: (state) => {
      state.filters = initialState.filters;
      state.pagination.page = 1;
    },
    setSelectedFuncionario: (state, action: PayloadAction<Funcionario | null>) => {
      state.selectedFuncionario = action.payload;
    },
    clearPontos: (state) => {
      state.pontos = [];
    },
    clearFerias: (state) => {
      state.ferias = [];
    },
    clearError: (state) => {
      state.error = null;
    },
    resetRh: () => initialState,
  },
  extraReducers: (builder) => {
    builder
      // Funcionarios
      .addCase(fetchFuncionarios.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(fetchFuncionarios.fulfilled, (state, action) => {
        state.isLoading = false;
        state.funcionarios = action.payload.items;
        state.pagination.total = action.payload.total;
      })
      .addCase(fetchFuncionarios.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      })
      .addCase(fetchFuncionarioById.fulfilled, (state, action) => {
        state.selectedFuncionario = action.payload;
      })
      .addCase(createFuncionario.fulfilled, (state, action) => {
        state.funcionarios.unshift(action.payload);
        state.pagination.total += 1;
      })
      .addCase(updateFuncionario.fulfilled, (state, action) => {
        const index = state.funcionarios.findIndex(f => f.id === action.payload.id);
        if (index !== -1) {
          state.funcionarios[index] = action.payload;
        }
        if (state.selectedFuncionario?.id === action.payload.id) {
          state.selectedFuncionario = action.payload;
        }
      })
      .addCase(deleteFuncionario.fulfilled, (state, action) => {
        state.funcionarios = state.funcionarios.filter(f => f.id !== action.payload);
        state.pagination.total -= 1;
        if (state.selectedFuncionario?.id === action.payload) {
          state.selectedFuncionario = null;
        }
      })
      // Ponto
      .addCase(registrarPonto.fulfilled, (state, action) => {
        const index = state.pontos.findIndex(p => p.id === action.payload.id);
        if (index !== -1) {
          state.pontos[index] = action.payload;
        } else {
          state.pontos.push(action.payload);
        }
      })
      .addCase(fetchPontosFuncionario.fulfilled, (state, action) => {
        state.pontos = action.payload;
      })
      // Férias
      .addCase(solicitarFerias.fulfilled, (state, action) => {
        state.ferias.push(action.payload);
      })
      .addCase(aprovarFerias.fulfilled, (state, action) => {
        const index = state.ferias.findIndex(f => f.id === action.payload.id);
        if (index !== -1) {
          state.ferias[index] = action.payload;
        }
      })
      // Dashboard
      .addCase(fetchDashboardRH.pending, (state) => {
        state.isLoading = true;
      })
      .addCase(fetchDashboardRH.fulfilled, (state, action) => {
        state.isLoading = false;
        state.dashboard = action.payload;
      })
      .addCase(fetchDashboardRH.rejected, (state, action) => {
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
  setSelectedFuncionario,
  clearPontos,
  clearFerias,
  clearError,
  resetRh,
} = rhSlice.actions;

export default rhSlice.reducer;

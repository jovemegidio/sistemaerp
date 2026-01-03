import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import { invoke } from '@tauri-apps/api/core';

// Types
interface NotaFiscal {
  id: number;
  numero: string;
  serie: string;
  chave: string | null;
  tipo: string;
  natureza_operacao: string;
  cliente_id: number | null;
  cliente_nome?: string;
  fornecedor_id: number | null;
  fornecedor_nome?: string;
  pedido_id: number | null;
  data_emissao: string;
  data_saida: string | null;
  valor_produtos: number;
  valor_frete: number;
  valor_seguro: number;
  valor_desconto: number;
  valor_ipi: number;
  valor_icms: number;
  valor_total: number;
  status: string;
  protocolo: string | null;
  xml: string | null;
  observacoes: string | null;
  created_at: string;
  updated_at: string;
}

interface ItemNota {
  id: number;
  nota_id: number;
  produto_id: number;
  produto_nome?: string;
  cfop: string;
  ncm: string;
  quantidade: number;
  valor_unitario: number;
  valor_total: number;
  valor_icms: number;
  valor_ipi: number;
}

interface NfeState {
  notas: NotaFiscal[];
  selectedNota: NotaFiscal | null;
  itensNota: ItemNota[];
  isLoading: boolean;
  error: string | null;
  pagination: {
    page: number;
    limit: number;
    total: number;
  };
  filters: {
    search: string;
    tipo: string | null;
    status: string | null;
    clienteId: number | null;
    fornecedorId: number | null;
    dataInicio: string | null;
    dataFim: string | null;
  };
}

const initialState: NfeState = {
  notas: [],
  selectedNota: null,
  itensNota: [],
  isLoading: false,
  error: null,
  pagination: {
    page: 1,
    limit: 50,
    total: 0,
  },
  filters: {
    search: '',
    tipo: null,
    status: null,
    clienteId: null,
    fornecedorId: null,
    dataInicio: null,
    dataFim: null,
  },
};

// Async thunks
export const fetchNotasFiscais = createAsyncThunk(
  'nfe/fetchNotas',
  async (_, { getState, rejectWithValue }) => {
    try {
      const state = getState() as { nfe: NfeState };
      const { pagination, filters } = state.nfe;
      const response = await invoke<{ items: NotaFiscal[]; total: number }>('list_notas_fiscais', {
        page: pagination.page,
        limit: pagination.limit,
        search: filters.search || null,
        tipo: filters.tipo,
        status: filters.status,
        clienteId: filters.clienteId,
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

export const fetchNotaById = createAsyncThunk(
  'nfe/fetchNotaById',
  async (id: number, { rejectWithValue }) => {
    try {
      const nota = await invoke<{ nota: NotaFiscal; itens: ItemNota[] }>('get_nota_fiscal', { id });
      return nota;
    } catch (error) {
      return rejectWithValue(error as string);
    }
  }
);

export const createNotaFiscal = createAsyncThunk(
  'nfe/createNota',
  async (data: { nota: Omit<NotaFiscal, 'id' | 'numero' | 'chave' | 'protocolo' | 'xml' | 'created_at' | 'updated_at'>; itens: Omit<ItemNota, 'id' | 'nota_id'>[] }, { rejectWithValue }) => {
    try {
      const newNota = await invoke<NotaFiscal>('create_nota_fiscal', data);
      return newNota;
    } catch (error) {
      return rejectWithValue(error as string);
    }
  }
);

export const emitirNota = createAsyncThunk(
  'nfe/emitirNota',
  async (id: number, { rejectWithValue }) => {
    try {
      const nota = await invoke<NotaFiscal>('emitir_nota_fiscal', { id });
      return nota;
    } catch (error) {
      return rejectWithValue(error as string);
    }
  }
);

export const cancelarNota = createAsyncThunk(
  'nfe/cancelarNota',
  async ({ id, justificativa }: { id: number; justificativa: string }, { rejectWithValue }) => {
    try {
      const nota = await invoke<NotaFiscal>('cancelar_nota_fiscal', { id, justificativa });
      return nota;
    } catch (error) {
      return rejectWithValue(error as string);
    }
  }
);

export const consultarNota = createAsyncThunk(
  'nfe/consultarNota',
  async (id: number, { rejectWithValue }) => {
    try {
      const nota = await invoke<NotaFiscal>('consultar_nota_fiscal', { id });
      return nota;
    } catch (error) {
      return rejectWithValue(error as string);
    }
  }
);

export const downloadXml = createAsyncThunk(
  'nfe/downloadXml',
  async (id: number, { rejectWithValue }) => {
    try {
      const xml = await invoke<string>('download_xml_nota', { id });
      return { id, xml };
    } catch (error) {
      return rejectWithValue(error as string);
    }
  }
);

export const downloadDanfe = createAsyncThunk(
  'nfe/downloadDanfe',
  async (id: number, { rejectWithValue }) => {
    try {
      await invoke('download_danfe', { id });
      return id;
    } catch (error) {
      return rejectWithValue(error as string);
    }
  }
);

export const importarNfe = createAsyncThunk(
  'nfe/importarNfe',
  async (xml: string, { rejectWithValue }) => {
    try {
      const nota = await invoke<NotaFiscal>('importar_nfe', { xml });
      return nota;
    } catch (error) {
      return rejectWithValue(error as string);
    }
  }
);

// Slice
const nfeSlice = createSlice({
  name: 'nfe',
  initialState,
  reducers: {
    setPage: (state, action: PayloadAction<number>) => {
      state.pagination.page = action.payload;
    },
    setLimit: (state, action: PayloadAction<number>) => {
      state.pagination.limit = action.payload;
      state.pagination.page = 1;
    },
    setFilters: (state, action: PayloadAction<Partial<NfeState['filters']>>) => {
      state.filters = { ...state.filters, ...action.payload };
      state.pagination.page = 1;
    },
    clearFilters: (state) => {
      state.filters = initialState.filters;
      state.pagination.page = 1;
    },
    setSelectedNota: (state, action: PayloadAction<NotaFiscal | null>) => {
      state.selectedNota = action.payload;
    },
    clearItensNota: (state) => {
      state.itensNota = [];
    },
    clearError: (state) => {
      state.error = null;
    },
    resetNfe: () => initialState,
  },
  extraReducers: (builder) => {
    builder
      // Fetch Notas
      .addCase(fetchNotasFiscais.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(fetchNotasFiscais.fulfilled, (state, action) => {
        state.isLoading = false;
        state.notas = action.payload.items;
        state.pagination.total = action.payload.total;
      })
      .addCase(fetchNotasFiscais.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      })
      // Fetch By Id
      .addCase(fetchNotaById.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(fetchNotaById.fulfilled, (state, action) => {
        state.isLoading = false;
        state.selectedNota = action.payload.nota;
        state.itensNota = action.payload.itens;
      })
      .addCase(fetchNotaById.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      })
      // Create
      .addCase(createNotaFiscal.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(createNotaFiscal.fulfilled, (state, action) => {
        state.isLoading = false;
        state.notas.unshift(action.payload);
        state.pagination.total += 1;
      })
      .addCase(createNotaFiscal.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      })
      // Emitir
      .addCase(emitirNota.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(emitirNota.fulfilled, (state, action) => {
        state.isLoading = false;
        const index = state.notas.findIndex(n => n.id === action.payload.id);
        if (index !== -1) {
          state.notas[index] = action.payload;
        }
        if (state.selectedNota?.id === action.payload.id) {
          state.selectedNota = action.payload;
        }
      })
      .addCase(emitirNota.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      })
      // Cancelar
      .addCase(cancelarNota.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(cancelarNota.fulfilled, (state, action) => {
        state.isLoading = false;
        const index = state.notas.findIndex(n => n.id === action.payload.id);
        if (index !== -1) {
          state.notas[index] = action.payload;
        }
        if (state.selectedNota?.id === action.payload.id) {
          state.selectedNota = action.payload;
        }
      })
      .addCase(cancelarNota.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      })
      // Consultar
      .addCase(consultarNota.fulfilled, (state, action) => {
        const index = state.notas.findIndex(n => n.id === action.payload.id);
        if (index !== -1) {
          state.notas[index] = action.payload;
        }
        if (state.selectedNota?.id === action.payload.id) {
          state.selectedNota = action.payload;
        }
      })
      // Importar
      .addCase(importarNfe.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(importarNfe.fulfilled, (state, action) => {
        state.isLoading = false;
        state.notas.unshift(action.payload);
        state.pagination.total += 1;
      })
      .addCase(importarNfe.rejected, (state, action) => {
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
  setSelectedNota,
  clearItensNota,
  clearError,
  resetNfe,
} = nfeSlice.actions;

export default nfeSlice.reducer;

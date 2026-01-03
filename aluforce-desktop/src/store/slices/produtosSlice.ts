import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import { invoke } from '@tauri-apps/api/core';

// Types
interface Produto {
  id: number;
  codigo: string;
  nome: string;
  descricao: string | null;
  unidade: string;
  preco_custo: number;
  preco_venda: number;
  estoque_atual: number;
  estoque_minimo: number;
  categoria: string | null;
  ncm: string | null;
  ativo: boolean;
  created_at: string;
  updated_at: string;
}

interface ProdutosState {
  items: Produto[];
  selectedItem: Produto | null;
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
    categoria: string | null;
    estoqueBaixo: boolean;
  };
}

const initialState: ProdutosState = {
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
    categoria: null,
    estoqueBaixo: false,
  },
};

// Async thunks
export const fetchProdutos = createAsyncThunk(
  'produtos/fetchAll',
  async (_, { getState, rejectWithValue }) => {
    try {
      const state = getState() as { produtos: ProdutosState };
      const { pagination, filters } = state.produtos;
      const response = await invoke<{ items: Produto[]; total: number }>('list_produtos', {
        page: pagination.page,
        limit: pagination.limit,
        search: filters.search || null,
        ativo: filters.ativo,
        categoria: filters.categoria,
        estoqueBaixo: filters.estoqueBaixo,
      });
      return response;
    } catch (error) {
      return rejectWithValue(error as string);
    }
  }
);

export const fetchProdutoById = createAsyncThunk(
  'produtos/fetchById',
  async (id: number, { rejectWithValue }) => {
    try {
      const produto = await invoke<Produto>('get_produto', { id });
      return produto;
    } catch (error) {
      return rejectWithValue(error as string);
    }
  }
);

export const createProduto = createAsyncThunk(
  'produtos/create',
  async (produto: Omit<Produto, 'id' | 'created_at' | 'updated_at'>, { rejectWithValue }) => {
    try {
      const newProduto = await invoke<Produto>('create_produto', { produto });
      return newProduto;
    } catch (error) {
      return rejectWithValue(error as string);
    }
  }
);

export const updateProduto = createAsyncThunk(
  'produtos/update',
  async ({ id, produto }: { id: number; produto: Partial<Produto> }, { rejectWithValue }) => {
    try {
      const updated = await invoke<Produto>('update_produto', { id, produto });
      return updated;
    } catch (error) {
      return rejectWithValue(error as string);
    }
  }
);

export const deleteProduto = createAsyncThunk(
  'produtos/delete',
  async (id: number, { rejectWithValue }) => {
    try {
      await invoke('delete_produto', { id });
      return id;
    } catch (error) {
      return rejectWithValue(error as string);
    }
  }
);

export const updateEstoque = createAsyncThunk(
  'produtos/updateEstoque',
  async ({ id, quantidade, tipo }: { id: number; quantidade: number; tipo: 'entrada' | 'saida' }, { rejectWithValue }) => {
    try {
      const updated = await invoke<Produto>('update_estoque', { produtoId: id, quantidade, tipo });
      return updated;
    } catch (error) {
      return rejectWithValue(error as string);
    }
  }
);

// Slice
const produtosSlice = createSlice({
  name: 'produtos',
  initialState,
  reducers: {
    setPage: (state, action: PayloadAction<number>) => {
      state.pagination.page = action.payload;
    },
    setLimit: (state, action: PayloadAction<number>) => {
      state.pagination.limit = action.payload;
      state.pagination.page = 1;
    },
    setFilters: (state, action: PayloadAction<Partial<ProdutosState['filters']>>) => {
      state.filters = { ...state.filters, ...action.payload };
      state.pagination.page = 1;
    },
    clearFilters: (state) => {
      state.filters = initialState.filters;
      state.pagination.page = 1;
    },
    setSelectedItem: (state, action: PayloadAction<Produto | null>) => {
      state.selectedItem = action.payload;
    },
    clearError: (state) => {
      state.error = null;
    },
    resetProdutos: () => initialState,
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchProdutos.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(fetchProdutos.fulfilled, (state, action) => {
        state.isLoading = false;
        state.items = action.payload.items;
        state.pagination.total = action.payload.total;
      })
      .addCase(fetchProdutos.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      })
      .addCase(fetchProdutoById.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(fetchProdutoById.fulfilled, (state, action) => {
        state.isLoading = false;
        state.selectedItem = action.payload;
      })
      .addCase(fetchProdutoById.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      })
      .addCase(createProduto.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(createProduto.fulfilled, (state, action) => {
        state.isLoading = false;
        state.items.unshift(action.payload);
        state.pagination.total += 1;
      })
      .addCase(createProduto.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      })
      .addCase(updateProduto.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(updateProduto.fulfilled, (state, action) => {
        state.isLoading = false;
        const index = state.items.findIndex(item => item.id === action.payload.id);
        if (index !== -1) {
          state.items[index] = action.payload;
        }
        if (state.selectedItem?.id === action.payload.id) {
          state.selectedItem = action.payload;
        }
      })
      .addCase(updateProduto.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      })
      .addCase(deleteProduto.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(deleteProduto.fulfilled, (state, action) => {
        state.isLoading = false;
        state.items = state.items.filter(item => item.id !== action.payload);
        state.pagination.total -= 1;
        if (state.selectedItem?.id === action.payload) {
          state.selectedItem = null;
        }
      })
      .addCase(deleteProduto.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      })
      .addCase(updateEstoque.fulfilled, (state, action) => {
        const index = state.items.findIndex(item => item.id === action.payload.id);
        if (index !== -1) {
          state.items[index] = action.payload;
        }
        if (state.selectedItem?.id === action.payload.id) {
          state.selectedItem = action.payload;
        }
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
  resetProdutos,
} = produtosSlice.actions;

export default produtosSlice.reducer;

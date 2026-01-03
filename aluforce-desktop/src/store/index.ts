import { configureStore, combineReducers } from '@reduxjs/toolkit';
import { 
  persistStore, 
  persistReducer,
  FLUSH,
  REHYDRATE,
  PAUSE,
  PERSIST,
  PURGE,
  REGISTER,
} from 'redux-persist';
import storage from 'redux-persist/lib/storage';

// Import slices
import authReducer from './slices/authSlice';
import uiReducer from './slices/uiSlice';
import clientesReducer from './slices/clientesSlice';
import fornecedoresReducer from './slices/fornecedoresSlice';
import produtosReducer from './slices/produtosSlice';
import vendasReducer from './slices/vendasSlice';
import comprasReducer from './slices/comprasSlice';
import financeiroReducer from './slices/financeiroSlice';
import pcpReducer from './slices/pcpSlice';
import rhReducer from './slices/rhSlice';
import nfeReducer from './slices/nfeSlice';

// Combine all reducers
const rootReducer = combineReducers({
  auth: authReducer,
  ui: uiReducer,
  clientes: clientesReducer,
  fornecedores: fornecedoresReducer,
  produtos: produtosReducer,
  vendas: vendasReducer,
  compras: comprasReducer,
  financeiro: financeiroReducer,
  pcp: pcpReducer,
  rh: rhReducer,
  nfe: nfeReducer,
});

// Persist configuration
const persistConfig = {
  key: 'aluforce-root',
  version: 1,
  storage,
  whitelist: ['auth', 'ui'], // Only persist auth and ui state
};

// Create persisted reducer
const persistedReducer = persistReducer(persistConfig, rootReducer);

// Configure store
export const store = configureStore({
  reducer: persistedReducer,
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: {
        ignoredActions: [FLUSH, REHYDRATE, PAUSE, PERSIST, PURGE, REGISTER],
      },
    }),
  devTools: process.env.NODE_ENV !== 'production',
});

// Create persistor
export const persistor = persistStore(store);

// Infer types from store
export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;

// Typed hooks
import { TypedUseSelectorHook, useDispatch, useSelector } from 'react-redux';
export const useAppDispatch = () => useDispatch<AppDispatch>();
export const useAppSelector: TypedUseSelectorHook<RootState> = useSelector;

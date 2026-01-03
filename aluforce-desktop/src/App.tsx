import { FC, Suspense, lazy, useEffect, useState } from 'react';
import { Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { Box, CircularProgress, Typography } from '@mui/material';
import { useAppSelector, useAppDispatch } from '@store/index';
import { validateSession } from '@store/slices/authSlice';
import { setCurrentModule, setCurrentPage, setBreadcrumbs } from '@store/slices/uiSlice';

// Layout components
import MainLayout from '@components/layout/MainLayout';
import AuthLayout from '@components/layout/AuthLayout';

// Setup Wizard
import { SetupWizard } from '@pages/setup';

// Lazy load pages for better performance
const LoginPage = lazy(() => import('@pages/auth/LoginPage'));
const DashboardPage = lazy(() => import('@pages/dashboard/DashboardPage'));

// Vendas
const VendasDashboard = lazy(() => import('@modules/vendas/pages/VendasDashboard'));
const ClientesPage = lazy(() => import('@modules/vendas/pages/ClientesPage'));
const PedidosVendaPage = lazy(() => import('@modules/vendas/pages/PedidosVendaPage'));
const ProdutosPage = lazy(() => import('@modules/vendas/pages/ProdutosPage'));

// Compras
const ComprasDashboard = lazy(() => import('@modules/compras/pages/ComprasDashboard'));
const FornecedoresPage = lazy(() => import('@modules/compras/pages/FornecedoresPage'));
const PedidosCompraPage = lazy(() => import('@modules/compras/pages/PedidosCompraPage'));

// Financeiro
const FinanceiroDashboard = lazy(() => import('@modules/financeiro/pages/FinanceiroDashboard'));
const ContasPagarPage = lazy(() => import('@modules/financeiro/pages/ContasPagarPage'));
const ContasReceberPage = lazy(() => import('@modules/financeiro/pages/ContasReceberPage'));
const ContasBancariasPage = lazy(() => import('@modules/financeiro/pages/ContasBancariasPage'));
const FluxoCaixaPage = lazy(() => import('@modules/financeiro/pages/FluxoCaixaPage'));

// PCP
const PcpDashboard = lazy(() => import('@modules/pcp/pages/PcpDashboard'));
const OrdensProducaoPage = lazy(() => import('@modules/pcp/pages/OrdensProducaoPage'));
const ApontamentoPage = lazy(() => import('@modules/pcp/pages/ApontamentoPage'));

// RH
const RhDashboard = lazy(() => import('@modules/rh/pages/RhDashboard'));
const FuncionariosPage = lazy(() => import('@modules/rh/pages/FuncionariosPage'));
const ControlePontoPage = lazy(() => import('@modules/rh/pages/ControlePontoPage'));
const FeriasPage = lazy(() => import('@modules/rh/pages/FeriasPage'));

// NFe
const NfeDashboard = lazy(() => import('@modules/nfe/pages/NfeDashboard'));
const NotasFiscaisPage = lazy(() => import('@modules/nfe/pages/NotasFiscaisPage'));
const EmitirNotaPage = lazy(() => import('@modules/nfe/pages/EmitirNotaPage'));

// Configurações
const ConfiguracoesPage = lazy(() => import('@pages/configuracoes/ConfiguracoesPage'));
const EmpresaPage = lazy(() => import('@pages/configuracoes/EmpresaPage'));
const UsuariosPage = lazy(() => import('@pages/configuracoes/UsuariosPage'));
const BackupPage = lazy(() => import('@pages/configuracoes/BackupPage'));

// Loading component
const LoadingFallback: FC = () => (
  <Box
    sx={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      height: '100%',
      minHeight: 400,
      gap: 2,
    }}
  >
    <CircularProgress size={48} />
    <Typography variant="body2" color="text.secondary">
      Carregando...
    </Typography>
  </Box>
);

// Protected Route component
const ProtectedRoute: FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isAuthenticated, isLoading } = useAppSelector((state) => state.auth);
  const dispatch = useAppDispatch();

  useEffect(() => {
    if (!isAuthenticated && !isLoading) {
      dispatch(validateSession());
    }
  }, [dispatch, isAuthenticated, isLoading]);

  if (isLoading) {
    return <LoadingFallback />;
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
};

// Route tracker for breadcrumbs and current module
const RouteTracker: FC = () => {
  const location = useLocation();
  const dispatch = useAppDispatch();

  useEffect(() => {
    const pathParts = location.pathname.split('/').filter(Boolean);
    
    // Set current module
    const moduleMap: Record<string, string> = {
      vendas: 'Vendas',
      compras: 'Compras',
      financeiro: 'Financeiro',
      pcp: 'PCP',
      rh: 'RH',
      nfe: 'NF-e',
      configuracoes: 'Configurações',
    };
    
    const currentModule = pathParts[0] ? moduleMap[pathParts[0]] || null : null;
    dispatch(setCurrentModule(currentModule));
    dispatch(setCurrentPage(pathParts[pathParts.length - 1] || 'dashboard'));

    // Build breadcrumbs
    const breadcrumbs: { label: string; path: string }[] = [
      { label: 'Início', path: '/' },
    ];

    let currentPath = '';
    pathParts.forEach((part) => {
      currentPath += `/${part}`;
      const label = moduleMap[part] || part.charAt(0).toUpperCase() + part.slice(1).replace(/-/g, ' ');
      breadcrumbs.push({ label, path: currentPath });
    });

    dispatch(setBreadcrumbs(breadcrumbs));
  }, [location.pathname, dispatch]);

  return null;
};

// Setup wizard disabled - go directly to login/system
const App: FC = () => {
  return (
    <>
      <RouteTracker />
      <Suspense fallback={<LoadingFallback />}>
        <Routes>
          {/* Auth Routes */}
          <Route element={<AuthLayout />}>
            <Route path="/login" element={<LoginPage />} />
          </Route>

          {/* Protected Routes */}
          <Route
            element={
              <ProtectedRoute>
                <MainLayout />
              </ProtectedRoute>
            }
          >
            {/* Dashboard */}
            <Route path="/" element={<DashboardPage />} />
            <Route path="/dashboard" element={<Navigate to="/" replace />} />

            {/* Vendas */}
            <Route path="/vendas">
              <Route index element={<VendasDashboard />} />
              <Route path="clientes" element={<ClientesPage />} />
              <Route path="pedidos" element={<PedidosVendaPage />} />
              <Route path="produtos" element={<ProdutosPage />} />
            </Route>

            {/* Compras */}
            <Route path="/compras">
              <Route index element={<ComprasDashboard />} />
              <Route path="fornecedores" element={<FornecedoresPage />} />
              <Route path="pedidos" element={<PedidosCompraPage />} />
            </Route>

            {/* Financeiro */}
            <Route path="/financeiro">
              <Route index element={<FinanceiroDashboard />} />
              <Route path="contas-pagar" element={<ContasPagarPage />} />
              <Route path="contas-receber" element={<ContasReceberPage />} />
              <Route path="contas-bancarias" element={<ContasBancariasPage />} />
              <Route path="fluxo-caixa" element={<FluxoCaixaPage />} />
            </Route>

            {/* PCP */}
            <Route path="/pcp">
              <Route index element={<PcpDashboard />} />
              <Route path="ordens" element={<OrdensProducaoPage />} />
              <Route path="apontamento" element={<ApontamentoPage />} />
            </Route>

            {/* RH */}
            <Route path="/rh">
              <Route index element={<RhDashboard />} />
              <Route path="funcionarios" element={<FuncionariosPage />} />
              <Route path="ponto" element={<ControlePontoPage />} />
              <Route path="ferias" element={<FeriasPage />} />
            </Route>

            {/* NF-e */}
            <Route path="/nfe">
              <Route index element={<NfeDashboard />} />
              <Route path="notas" element={<NotasFiscaisPage />} />
              <Route path="emitir" element={<EmitirNotaPage />} />
            </Route>

            {/* Configurações */}
            <Route path="/configuracoes">
              <Route index element={<ConfiguracoesPage />} />
              <Route path="empresa" element={<EmpresaPage />} />
              <Route path="usuarios" element={<UsuariosPage />} />
              <Route path="backup" element={<BackupPage />} />
            </Route>
          </Route>

          {/* 404 */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Suspense>
    </>
  );
};

export default App;

import { FC } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  Drawer,
  Box,
  List,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Typography,
  Divider,
  Collapse,
  IconButton,
  Tooltip,
  useTheme,
  alpha,
} from '@mui/material';
import {
  Dashboard as DashboardIcon,
  ShoppingCart as VendasIcon,
  ShoppingBasket as ComprasIcon,
  AccountBalance as FinanceiroIcon,
  Factory as PcpIcon,
  People as RhIcon,
  Receipt as NfeIcon,
  Settings as SettingsIcon,
  ExpandLess,
  ExpandMore,
  Person as ClientesIcon,
  Inventory as ProdutosIcon,
  ListAlt as PedidosIcon,
  Store as FornecedoresIcon,
  Payment as ContasPagarIcon,
  MonetizationOn as ContasReceberIcon,
  AccountBalanceWallet as ContasBancariasIcon,
  TrendingUp as FluxoCaixaIcon,
  Assignment as OrdensIcon,
  TouchApp as ApontamentoIcon,
  Badge as FuncionariosIcon,
  AccessTime as PontoIcon,
  BeachAccess as FeriasIcon,
  Description as NotasIcon,
  Send as EmitirIcon,
  Business as EmpresaIcon,
  Group as UsuariosIcon,
  Backup as BackupIcon,
  ChevronLeft as ChevronLeftIcon,
  ChevronRight as ChevronRightIcon,
} from '@mui/icons-material';
import { useState, useEffect } from 'react';
import { useAppSelector } from '@store/index';

interface SidebarProps {
  width: number;
  collapsedWidth: number;
  open: boolean;
  collapsed: boolean;
  isMobile: boolean;
  onClose: () => void;
}

interface MenuItem {
  id: string;
  label: string;
  icon: React.ReactNode;
  path?: string;
  children?: {
    id: string;
    label: string;
    icon: React.ReactNode;
    path: string;
  }[];
}

const menuItems: MenuItem[] = [
  {
    id: 'dashboard',
    label: 'Dashboard',
    icon: <DashboardIcon />,
    path: '/',
  },
  {
    id: 'vendas',
    label: 'Vendas',
    icon: <VendasIcon />,
    children: [
      { id: 'vendas-dashboard', label: 'Dashboard', icon: <DashboardIcon />, path: '/vendas' },
      { id: 'clientes', label: 'Clientes', icon: <ClientesIcon />, path: '/vendas/clientes' },
      { id: 'pedidos-venda', label: 'Pedidos', icon: <PedidosIcon />, path: '/vendas/pedidos' },
      { id: 'produtos', label: 'Produtos', icon: <ProdutosIcon />, path: '/vendas/produtos' },
    ],
  },
  {
    id: 'compras',
    label: 'Compras',
    icon: <ComprasIcon />,
    children: [
      { id: 'compras-dashboard', label: 'Dashboard', icon: <DashboardIcon />, path: '/compras' },
      { id: 'fornecedores', label: 'Fornecedores', icon: <FornecedoresIcon />, path: '/compras/fornecedores' },
      { id: 'pedidos-compra', label: 'Pedidos', icon: <PedidosIcon />, path: '/compras/pedidos' },
    ],
  },
  {
    id: 'financeiro',
    label: 'Financeiro',
    icon: <FinanceiroIcon />,
    children: [
      { id: 'financeiro-dashboard', label: 'Dashboard', icon: <DashboardIcon />, path: '/financeiro' },
      { id: 'contas-pagar', label: 'Contas a Pagar', icon: <ContasPagarIcon />, path: '/financeiro/contas-pagar' },
      { id: 'contas-receber', label: 'Contas a Receber', icon: <ContasReceberIcon />, path: '/financeiro/contas-receber' },
      { id: 'contas-bancarias', label: 'Contas Bancárias', icon: <ContasBancariasIcon />, path: '/financeiro/contas-bancarias' },
      { id: 'fluxo-caixa', label: 'Fluxo de Caixa', icon: <FluxoCaixaIcon />, path: '/financeiro/fluxo-caixa' },
    ],
  },
  {
    id: 'pcp',
    label: 'PCP',
    icon: <PcpIcon />,
    children: [
      { id: 'pcp-dashboard', label: 'Dashboard', icon: <DashboardIcon />, path: '/pcp' },
      { id: 'ordens', label: 'Ordens de Produção', icon: <OrdensIcon />, path: '/pcp/ordens' },
      { id: 'apontamento', label: 'Apontamento', icon: <ApontamentoIcon />, path: '/pcp/apontamento' },
    ],
  },
  {
    id: 'rh',
    label: 'RH',
    icon: <RhIcon />,
    children: [
      { id: 'rh-dashboard', label: 'Dashboard', icon: <DashboardIcon />, path: '/rh' },
      { id: 'funcionarios', label: 'Funcionários', icon: <FuncionariosIcon />, path: '/rh/funcionarios' },
      { id: 'ponto', label: 'Controle de Ponto', icon: <PontoIcon />, path: '/rh/ponto' },
      { id: 'ferias', label: 'Férias', icon: <FeriasIcon />, path: '/rh/ferias' },
    ],
  },
  {
    id: 'nfe',
    label: 'NF-e',
    icon: <NfeIcon />,
    children: [
      { id: 'nfe-dashboard', label: 'Dashboard', icon: <DashboardIcon />, path: '/nfe' },
      { id: 'notas', label: 'Notas Fiscais', icon: <NotasIcon />, path: '/nfe/notas' },
      { id: 'emitir', label: 'Emitir Nota', icon: <EmitirIcon />, path: '/nfe/emitir' },
    ],
  },
  {
    id: 'configuracoes',
    label: 'Configurações',
    icon: <SettingsIcon />,
    children: [
      { id: 'config-geral', label: 'Geral', icon: <SettingsIcon />, path: '/configuracoes' },
      { id: 'empresa', label: 'Empresa', icon: <EmpresaIcon />, path: '/configuracoes/empresa' },
      { id: 'usuarios', label: 'Usuários', icon: <UsuariosIcon />, path: '/configuracoes/usuarios' },
      { id: 'backup', label: 'Backup', icon: <BackupIcon />, path: '/configuracoes/backup' },
    ],
  },
];

const Sidebar: FC<SidebarProps> = ({
  width,
  collapsedWidth,
  open,
  collapsed,
  isMobile,
  onClose,
}) => {
  const theme = useTheme();
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAppSelector((state) => state.auth);
  
  const [expandedItems, setExpandedItems] = useState<string[]>([]);

  // Auto-expand current menu based on location
  useEffect(() => {
    const currentPath = location.pathname;
    const parentItem = menuItems.find(
      (item) => item.children?.some((child) => currentPath.startsWith(child.path))
    );
    if (parentItem && !expandedItems.includes(parentItem.id)) {
      setExpandedItems((prev) => [...prev, parentItem.id]);
    }
  }, [location.pathname]);

  const handleItemClick = (item: MenuItem) => {
    if (item.children) {
      if (collapsed && !isMobile) {
        // On collapsed state, navigate to first child
        navigate(item.children[0].path);
      } else {
        setExpandedItems((prev) =>
          prev.includes(item.id)
            ? prev.filter((id) => id !== item.id)
            : [...prev, item.id]
        );
      }
    } else if (item.path) {
      navigate(item.path);
      if (isMobile) onClose();
    }
  };

  const handleChildClick = (path: string) => {
    navigate(path);
    if (isMobile) onClose();
  };

  const isActive = (path?: string) => {
    if (!path) return false;
    return location.pathname === path || (path !== '/' && location.pathname.startsWith(path));
  };

  const isParentActive = (item: MenuItem) => {
    return item.children?.some((child) => isActive(child.path));
  };

  const drawerContent = (
    <Box
      sx={{
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        overflow: 'hidden',
      }}
    >
      {/* Logo Header */}
      <Box
        sx={{
          height: 64,
          display: 'flex',
          alignItems: 'center',
          justifyContent: collapsed && !isMobile ? 'center' : 'flex-start',
          px: collapsed && !isMobile ? 1 : 3,
          borderBottom: 1,
          borderColor: 'divider',
          backgroundColor: 'primary.main',
        }}
      >
        {collapsed && !isMobile ? (
          <Typography
            variant="h5"
            sx={{ color: 'white', fontWeight: 800 }}
          >
            A
          </Typography>
        ) : (
          <Typography
            variant="h5"
            sx={{
              color: 'white',
              fontWeight: 700,
              letterSpacing: 2,
            }}
          >
            ALUFORCE
          </Typography>
        )}
      </Box>

      {/* Menu Items */}
      <Box sx={{ flexGrow: 1, overflow: 'auto', py: 1 }}>
        <List disablePadding>
          {menuItems.map((item) => (
            <Box key={item.id}>
              {collapsed && !isMobile ? (
                <Tooltip title={item.label} placement="right" arrow>
                  <ListItem disablePadding>
                    <ListItemButton
                      onClick={() => handleItemClick(item)}
                      selected={isActive(item.path) || isParentActive(item)}
                      sx={{
                        minHeight: 48,
                        justifyContent: 'center',
                        px: 2.5,
                        mx: 1,
                        borderRadius: 1,
                        '&.Mui-selected': {
                          backgroundColor: alpha(theme.palette.primary.main, 0.12),
                          '&:hover': {
                            backgroundColor: alpha(theme.palette.primary.main, 0.16),
                          },
                        },
                      }}
                    >
                      <ListItemIcon
                        sx={{
                          minWidth: 0,
                          justifyContent: 'center',
                          color: isActive(item.path) || isParentActive(item)
                            ? 'primary.main'
                            : 'text.secondary',
                        }}
                      >
                        {item.icon}
                      </ListItemIcon>
                    </ListItemButton>
                  </ListItem>
                </Tooltip>
              ) : (
                <>
                  <ListItem disablePadding>
                    <ListItemButton
                      onClick={() => handleItemClick(item)}
                      selected={isActive(item.path) && !item.children}
                      sx={{
                        minHeight: 48,
                        px: 2.5,
                        mx: 1,
                        borderRadius: 1,
                        '&.Mui-selected': {
                          backgroundColor: alpha(theme.palette.primary.main, 0.12),
                          '&:hover': {
                            backgroundColor: alpha(theme.palette.primary.main, 0.16),
                          },
                        },
                      }}
                    >
                      <ListItemIcon
                        sx={{
                          minWidth: 40,
                          color: isActive(item.path) || isParentActive(item)
                            ? 'primary.main'
                            : 'text.secondary',
                        }}
                      >
                        {item.icon}
                      </ListItemIcon>
                      <ListItemText
                        primary={item.label}
                        primaryTypographyProps={{
                          fontWeight: isActive(item.path) || isParentActive(item) ? 600 : 400,
                          fontSize: '0.9rem',
                        }}
                      />
                      {item.children && (
                        expandedItems.includes(item.id) ? <ExpandLess /> : <ExpandMore />
                      )}
                    </ListItemButton>
                  </ListItem>

                  {/* Children */}
                  {item.children && (
                    <Collapse in={expandedItems.includes(item.id)} timeout="auto" unmountOnExit>
                      <List component="div" disablePadding>
                        {item.children.map((child) => (
                          <ListItemButton
                            key={child.id}
                            onClick={() => handleChildClick(child.path)}
                            selected={isActive(child.path)}
                            sx={{
                              minHeight: 40,
                              pl: 6,
                              pr: 2.5,
                              mx: 1,
                              borderRadius: 1,
                              '&.Mui-selected': {
                                backgroundColor: alpha(theme.palette.primary.main, 0.12),
                                '&:hover': {
                                  backgroundColor: alpha(theme.palette.primary.main, 0.16),
                                },
                              },
                            }}
                          >
                            <ListItemIcon
                              sx={{
                                minWidth: 32,
                                color: isActive(child.path) ? 'primary.main' : 'text.disabled',
                              }}
                            >
                              {child.icon}
                            </ListItemIcon>
                            <ListItemText
                              primary={child.label}
                              primaryTypographyProps={{
                                fontSize: '0.85rem',
                                fontWeight: isActive(child.path) ? 600 : 400,
                              }}
                            />
                          </ListItemButton>
                        ))}
                      </List>
                    </Collapse>
                  )}
                </>
              )}
            </Box>
          ))}
        </List>
      </Box>

      {/* Footer */}
      <Box
        sx={{
          p: 2,
          borderTop: 1,
          borderColor: 'divider',
          display: collapsed && !isMobile ? 'none' : 'block',
        }}
      >
        <Typography variant="caption" color="text.secondary" display="block">
          ALUFORCE Desktop v2.0
        </Typography>
        <Typography variant="caption" color="text.disabled">
          © 2025 Todos os direitos reservados
        </Typography>
      </Box>
    </Box>
  );

  return (
    <Drawer
      variant={isMobile ? 'temporary' : 'permanent'}
      open={isMobile ? open : true}
      onClose={onClose}
      ModalProps={{ keepMounted: true }}
      sx={{
        width: isMobile ? width : (collapsed ? collapsedWidth : width),
        flexShrink: 0,
        '& .MuiDrawer-paper': {
          width: isMobile ? width : (collapsed ? collapsedWidth : width),
          boxSizing: 'border-box',
          borderRight: 'none',
          boxShadow: '2px 0 10px rgba(0,0,0,0.05)',
          transition: theme.transitions.create('width', {
            easing: theme.transitions.easing.sharp,
            duration: theme.transitions.duration.enteringScreen,
          }),
        },
      }}
    >
      {drawerContent}
    </Drawer>
  );
};

export default Sidebar;

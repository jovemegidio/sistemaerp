import { FC, useEffect } from 'react';
import {
  Box,
  Grid,
  Card,
  CardContent,
  Typography,
  useTheme,
  alpha,
  Skeleton,
} from '@mui/material';
import {
  TrendingUp as TrendingUpIcon,
  ShoppingCart as VendasIcon,
  People as ClientesIcon,
  Inventory as ProdutosIcon,
  AccountBalance as FinanceiroIcon,
  Warning as WarningIcon,
  CheckCircle as CheckCircleIcon,
  Schedule as ScheduleIcon,
} from '@mui/icons-material';
import { useAppSelector } from '@store/index';

// Stat Card Component
interface StatCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: React.ReactNode;
  color: string;
  trend?: { value: number; positive: boolean };
  loading?: boolean;
}

const StatCard: FC<StatCardProps> = ({
  title,
  value,
  subtitle,
  icon,
  color,
  trend,
  loading = false,
}) => {
  const theme = useTheme();

  if (loading) {
    return (
      <Card sx={{ height: '100%' }}>
        <CardContent>
          <Skeleton variant="text" width="60%" />
          <Skeleton variant="text" width="40%" height={40} />
          <Skeleton variant="text" width="80%" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card
      sx={{
        height: '100%',
        transition: 'transform 0.2s, box-shadow 0.2s',
        '&:hover': {
          transform: 'translateY(-4px)',
          boxShadow: `0 8px 24px ${alpha(color, 0.25)}`,
        },
      }}
    >
      <CardContent sx={{ p: 3 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <Box>
            <Typography variant="body2" color="text.secondary" gutterBottom>
              {title}
            </Typography>
            <Typography variant="h4" fontWeight={700}>
              {value}
            </Typography>
            {subtitle && (
              <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                {subtitle}
              </Typography>
            )}
          </Box>
          <Box
            sx={{
              width: 48,
              height: 48,
              borderRadius: 2,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: alpha(color, 0.1),
              color: color,
            }}
          >
            {icon}
          </Box>
        </Box>
        {trend && (
          <Box sx={{ display: 'flex', alignItems: 'center', mt: 2, gap: 0.5 }}>
            <TrendingUpIcon
              fontSize="small"
              sx={{
                color: trend.positive ? 'success.main' : 'error.main',
                transform: trend.positive ? 'none' : 'rotate(180deg)',
              }}
            />
            <Typography
              variant="body2"
              sx={{ color: trend.positive ? 'success.main' : 'error.main', fontWeight: 500 }}
            >
              {trend.value}%
            </Typography>
            <Typography variant="body2" color="text.secondary">
              vs. mês anterior
            </Typography>
          </Box>
        )}
      </CardContent>
    </Card>
  );
};

// Quick Action Card
interface QuickActionProps {
  title: string;
  description: string;
  icon: React.ReactNode;
  color: string;
  onClick?: () => void;
}

const QuickActionCard: FC<QuickActionProps> = ({ title, description, icon, color, onClick }) => {
  const theme = useTheme();

  return (
    <Card
      onClick={onClick}
      sx={{
        cursor: 'pointer',
        transition: 'all 0.2s',
        '&:hover': {
          transform: 'translateY(-2px)',
          boxShadow: 4,
          borderColor: color,
        },
      }}
    >
      <CardContent sx={{ p: 2.5, display: 'flex', alignItems: 'center', gap: 2 }}>
        <Box
          sx={{
            width: 40,
            height: 40,
            borderRadius: 1.5,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: alpha(color, 0.1),
            color: color,
          }}
        >
          {icon}
        </Box>
        <Box>
          <Typography variant="subtitle2" fontWeight={600}>
            {title}
          </Typography>
          <Typography variant="caption" color="text.secondary">
            {description}
          </Typography>
        </Box>
      </CardContent>
    </Card>
  );
};

const DashboardPage: FC = () => {
  const theme = useTheme();
  const { user } = useAppSelector((state) => state.auth);

  // Mock data - in real app, this would come from Redux/API
  const stats = {
    faturamentoMes: 'R$ 125.430,00',
    pedidosHoje: 12,
    clientesAtivos: 234,
    produtosEstoque: 1567,
    contasVencer: 8,
    ordensProducao: 15,
  };

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Bom dia';
    if (hour < 18) return 'Boa tarde';
    return 'Boa noite';
  };

  return (
    <Box>
      {/* Welcome Header */}
      <Box sx={{ mb: 4 }}>
        <Typography variant="h4" fontWeight={700} gutterBottom>
          {getGreeting()}, {user?.nome?.split(' ')[0] || 'Usuário'}!
        </Typography>
        <Typography variant="body1" color="text.secondary">
          Aqui está um resumo do seu sistema hoje
        </Typography>
      </Box>

      {/* Stats Grid */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid item xs={12} sm={6} md={4} lg={2}>
          <StatCard
            title="Faturamento Mês"
            value={stats.faturamentoMes}
            icon={<TrendingUpIcon />}
            color={theme.palette.success.main}
            trend={{ value: 12.5, positive: true }}
          />
        </Grid>
        <Grid item xs={12} sm={6} md={4} lg={2}>
          <StatCard
            title="Pedidos Hoje"
            value={stats.pedidosHoje}
            subtitle="5 pendentes"
            icon={<VendasIcon />}
            color={theme.palette.primary.main}
          />
        </Grid>
        <Grid item xs={12} sm={6} md={4} lg={2}>
          <StatCard
            title="Clientes Ativos"
            value={stats.clientesAtivos}
            icon={<ClientesIcon />}
            color={theme.palette.info.main}
            trend={{ value: 3.2, positive: true }}
          />
        </Grid>
        <Grid item xs={12} sm={6} md={4} lg={2}>
          <StatCard
            title="Produtos em Estoque"
            value={stats.produtosEstoque}
            subtitle="23 em estoque baixo"
            icon={<ProdutosIcon />}
            color={theme.palette.warning.main}
          />
        </Grid>
        <Grid item xs={12} sm={6} md={4} lg={2}>
          <StatCard
            title="Contas a Vencer"
            value={stats.contasVencer}
            subtitle="Próximos 7 dias"
            icon={<FinanceiroIcon />}
            color={theme.palette.error.main}
          />
        </Grid>
        <Grid item xs={12} sm={6} md={4} lg={2}>
          <StatCard
            title="Ordens em Produção"
            value={stats.ordensProducao}
            subtitle="3 atrasadas"
            icon={<ScheduleIcon />}
            color={theme.palette.secondary.main}
          />
        </Grid>
      </Grid>

      {/* Quick Actions */}
      <Typography variant="h6" fontWeight={600} sx={{ mb: 2 }}>
        Ações Rápidas
      </Typography>
      <Grid container spacing={2} sx={{ mb: 4 }}>
        <Grid item xs={12} sm={6} md={3}>
          <QuickActionCard
            title="Novo Pedido de Venda"
            description="Criar um novo pedido"
            icon={<VendasIcon fontSize="small" />}
            color={theme.palette.primary.main}
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <QuickActionCard
            title="Cadastrar Cliente"
            description="Adicionar novo cliente"
            icon={<ClientesIcon fontSize="small" />}
            color={theme.palette.info.main}
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <QuickActionCard
            title="Lançar Conta a Pagar"
            description="Registrar nova despesa"
            icon={<FinanceiroIcon fontSize="small" />}
            color={theme.palette.warning.main}
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <QuickActionCard
            title="Emitir NF-e"
            description="Gerar nota fiscal"
            icon={<CheckCircleIcon fontSize="small" />}
            color={theme.palette.success.main}
          />
        </Grid>
      </Grid>

      {/* Alerts Section */}
      <Typography variant="h6" fontWeight={600} sx={{ mb: 2 }}>
        Alertas
      </Typography>
      <Grid container spacing={2}>
        <Grid item xs={12} md={6}>
          <Card sx={{ borderLeft: `4px solid ${theme.palette.warning.main}` }}>
            <CardContent sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              <WarningIcon color="warning" />
              <Box>
                <Typography variant="subtitle2" fontWeight={600}>
                  Produtos com Estoque Baixo
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  23 produtos estão abaixo do estoque mínimo
                </Typography>
              </Box>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} md={6}>
          <Card sx={{ borderLeft: `4px solid ${theme.palette.error.main}` }}>
            <CardContent sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              <WarningIcon color="error" />
              <Box>
                <Typography variant="subtitle2" fontWeight={600}>
                  Contas Vencidas
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  3 contas a pagar estão vencidas
                </Typography>
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Box>
  );
};

export default DashboardPage;

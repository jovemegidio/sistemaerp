import { FC } from 'react';
import { Box, Typography, Grid, Card, CardContent, useTheme, alpha } from '@mui/material';
import {
  TrendingUp,
  ShoppingCart,
  People,
  Inventory,
} from '@mui/icons-material';

const VendasDashboard: FC = () => {
  const theme = useTheme();

  const stats = [
    { title: 'Faturamento Mês', value: 'R$ 125.430,00', icon: <TrendingUp />, color: theme.palette.success.main },
    { title: 'Pedidos no Mês', value: '156', icon: <ShoppingCart />, color: theme.palette.primary.main },
    { title: 'Clientes Ativos', value: '234', icon: <People />, color: theme.palette.info.main },
    { title: 'Ticket Médio', value: 'R$ 804,04', icon: <Inventory />, color: theme.palette.warning.main },
  ];

  return (
    <Box>
      <Typography variant="h5" fontWeight={700} gutterBottom>
        Dashboard de Vendas
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 4 }}>
        Acompanhe os indicadores de vendas da empresa
      </Typography>

      <Grid container spacing={3}>
        {stats.map((stat, index) => (
          <Grid item xs={12} sm={6} md={3} key={index}>
            <Card>
              <CardContent sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                <Box
                  sx={{
                    width: 48,
                    height: 48,
                    borderRadius: 2,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    backgroundColor: alpha(stat.color, 0.1),
                    color: stat.color,
                  }}
                >
                  {stat.icon}
                </Box>
                <Box>
                  <Typography variant="body2" color="text.secondary">
                    {stat.title}
                  </Typography>
                  <Typography variant="h6" fontWeight={700}>
                    {stat.value}
                  </Typography>
                </Box>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>
    </Box>
  );
};

export default VendasDashboard;

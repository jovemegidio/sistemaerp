import { FC } from 'react';
import { Box, Typography, Grid, Card, CardContent, useTheme, alpha } from '@mui/material';
import { ShoppingBasket, Store, TrendingDown, LocalShipping } from '@mui/icons-material';

const ComprasDashboard: FC = () => {
  const theme = useTheme();

  const stats = [
    { title: 'Compras no Mês', value: 'R$ 45.230,00', icon: <ShoppingBasket />, color: theme.palette.primary.main },
    { title: 'Fornecedores Ativos', value: '67', icon: <Store />, color: theme.palette.info.main },
    { title: 'Pedidos Pendentes', value: '12', icon: <LocalShipping />, color: theme.palette.warning.main },
    { title: 'Economia Mês', value: 'R$ 3.450,00', icon: <TrendingDown />, color: theme.palette.success.main },
  ];

  return (
    <Box>
      <Typography variant="h5" fontWeight={700} gutterBottom>Dashboard de Compras</Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 4 }}>
        Acompanhe os indicadores de compras
      </Typography>
      <Grid container spacing={3}>
        {stats.map((stat, index) => (
          <Grid item xs={12} sm={6} md={3} key={index}>
            <Card>
              <CardContent sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                <Box sx={{ width: 48, height: 48, borderRadius: 2, display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: alpha(stat.color, 0.1), color: stat.color }}>
                  {stat.icon}
                </Box>
                <Box>
                  <Typography variant="body2" color="text.secondary">{stat.title}</Typography>
                  <Typography variant="h6" fontWeight={700}>{stat.value}</Typography>
                </Box>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>
    </Box>
  );
};

export default ComprasDashboard;

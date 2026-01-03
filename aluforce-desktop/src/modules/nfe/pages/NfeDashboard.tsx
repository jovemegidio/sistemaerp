import { FC } from 'react';
import { Box, Typography, Grid, Card, CardContent, useTheme, alpha } from '@mui/material';
import { Receipt, Send, CheckCircle, Cancel } from '@mui/icons-material';

const NfeDashboard: FC = () => {
  const theme = useTheme();

  const stats = [
    { title: 'Notas Emitidas', value: '156', icon: <Receipt />, color: theme.palette.primary.main },
    { title: 'Pendentes', value: '12', icon: <Send />, color: theme.palette.warning.main },
    { title: 'Autorizadas', value: '140', icon: <CheckCircle />, color: theme.palette.success.main },
    { title: 'Canceladas', value: '4', icon: <Cancel />, color: theme.palette.error.main },
  ];

  return (
    <Box>
      <Typography variant="h5" fontWeight={700} gutterBottom>Dashboard NF-e</Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 4 }}>Acompanhe as notas fiscais eletrônicas</Typography>
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

export default NfeDashboard;

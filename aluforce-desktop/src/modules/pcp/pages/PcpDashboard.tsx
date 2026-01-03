import { FC } from 'react';
import { Box, Typography, Grid, Card, CardContent, useTheme, alpha } from '@mui/material';
import { Factory, Assignment, CheckCircle, Schedule } from '@mui/icons-material';

const PcpDashboard: FC = () => {
  const theme = useTheme();

  const stats = [
    { title: 'Ordens em Produção', value: '15', icon: <Factory />, color: theme.palette.primary.main },
    { title: 'Ordens Pendentes', value: '8', icon: <Assignment />, color: theme.palette.warning.main },
    { title: 'Concluídas Mês', value: '45', icon: <CheckCircle />, color: theme.palette.success.main },
    { title: 'Eficiência', value: '87%', icon: <Schedule />, color: theme.palette.info.main },
  ];

  return (
    <Box>
      <Typography variant="h5" fontWeight={700} gutterBottom>Dashboard PCP</Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 4 }}>Acompanhe o planejamento e controle de produção</Typography>
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

export default PcpDashboard;

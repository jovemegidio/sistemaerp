import { FC } from 'react';
import { Box, Typography, Grid, Card, CardContent, useTheme, alpha } from '@mui/material';
import { People, PersonAdd, PersonOff, Cake } from '@mui/icons-material';

const RhDashboard: FC = () => {
  const theme = useTheme();

  const stats = [
    { title: 'Total Funcionários', value: '45', icon: <People />, color: theme.palette.primary.main },
    { title: 'Admissões Mês', value: '3', icon: <PersonAdd />, color: theme.palette.success.main },
    { title: 'Demissões Mês', value: '1', icon: <PersonOff />, color: theme.palette.error.main },
    { title: 'Aniversariantes', value: '2', icon: <Cake />, color: theme.palette.warning.main },
  ];

  return (
    <Box>
      <Typography variant="h5" fontWeight={700} gutterBottom>Dashboard RH</Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 4 }}>Acompanhe os indicadores de recursos humanos</Typography>
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

export default RhDashboard;

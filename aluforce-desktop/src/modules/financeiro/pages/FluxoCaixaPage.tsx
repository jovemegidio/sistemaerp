import { FC } from 'react';
import { Box, Typography, Card } from '@mui/material';

const FluxoCaixaPage: FC = () => {
  return (
    <Box>
      <Box sx={{ mb: 3 }}>
        <Typography variant="h5" fontWeight={700}>Fluxo de Caixa</Typography>
        <Typography variant="body2" color="text.secondary">Visualize o fluxo de caixa da empresa</Typography>
      </Box>
      <Card sx={{ p: 4, textAlign: 'center' }}>
        <Typography color="text.secondary">Gráfico de fluxo de caixa será exibido aqui</Typography>
      </Card>
    </Box>
  );
};

export default FluxoCaixaPage;

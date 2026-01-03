import { FC } from 'react';
import { Box, Typography, Card } from '@mui/material';

const ControlePontoPage: FC = () => {
  return (
    <Box>
      <Box sx={{ mb: 3 }}>
        <Typography variant="h5" fontWeight={700}>Controle de Ponto</Typography>
        <Typography variant="body2" color="text.secondary">Gerencie o ponto dos funcionários</Typography>
      </Box>
      <Card sx={{ p: 4, textAlign: 'center' }}>
        <Typography color="text.secondary">Controle de ponto será exibido aqui</Typography>
      </Card>
    </Box>
  );
};

export default ControlePontoPage;

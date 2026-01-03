import { FC } from 'react';
import { Box, Typography, Card } from '@mui/material';

const ApontamentoPage: FC = () => {
  return (
    <Box>
      <Box sx={{ mb: 3 }}>
        <Typography variant="h5" fontWeight={700}>Apontamento de Produção</Typography>
        <Typography variant="body2" color="text.secondary">Registre a produção diária</Typography>
      </Box>
      <Card sx={{ p: 4, textAlign: 'center' }}>
        <Typography color="text.secondary">Formulário de apontamento será exibido aqui</Typography>
      </Card>
    </Box>
  );
};

export default ApontamentoPage;

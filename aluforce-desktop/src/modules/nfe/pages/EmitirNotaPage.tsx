import { FC } from 'react';
import { Box, Typography, Card } from '@mui/material';

const EmitirNotaPage: FC = () => {
  return (
    <Box>
      <Box sx={{ mb: 3 }}>
        <Typography variant="h5" fontWeight={700}>Emitir Nota Fiscal</Typography>
        <Typography variant="body2" color="text.secondary">Emita uma nova nota fiscal eletrônica</Typography>
      </Box>
      <Card sx={{ p: 4, textAlign: 'center' }}>
        <Typography color="text.secondary">Formulário de emissão será exibido aqui</Typography>
      </Card>
    </Box>
  );
};

export default EmitirNotaPage;

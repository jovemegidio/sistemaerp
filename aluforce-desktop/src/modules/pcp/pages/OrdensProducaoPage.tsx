import { FC } from 'react';
import { Box, Typography, Button, Card } from '@mui/material';
import { Add as AddIcon } from '@mui/icons-material';

const OrdensProducaoPage: FC = () => {
  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Box>
          <Typography variant="h5" fontWeight={700}>Ordens de Produção</Typography>
          <Typography variant="body2" color="text.secondary">Gerencie as ordens de produção</Typography>
        </Box>
        <Button variant="contained" startIcon={<AddIcon />}>Nova Ordem</Button>
      </Box>
      <Card sx={{ p: 4, textAlign: 'center' }}>
        <Typography color="text.secondary">Lista de ordens de produção será exibida aqui</Typography>
      </Card>
    </Box>
  );
};

export default OrdensProducaoPage;

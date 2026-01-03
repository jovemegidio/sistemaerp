import { FC } from 'react';
import { Box, Typography, Button, Card } from '@mui/material';
import { Add as AddIcon } from '@mui/icons-material';

const FeriasPage: FC = () => {
  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Box>
          <Typography variant="h5" fontWeight={700}>Férias</Typography>
          <Typography variant="body2" color="text.secondary">Gerencie as férias dos funcionários</Typography>
        </Box>
        <Button variant="contained" startIcon={<AddIcon />}>Solicitar Férias</Button>
      </Box>
      <Card sx={{ p: 4, textAlign: 'center' }}>
        <Typography color="text.secondary">Lista de férias será exibida aqui</Typography>
      </Card>
    </Box>
  );
};

export default FeriasPage;

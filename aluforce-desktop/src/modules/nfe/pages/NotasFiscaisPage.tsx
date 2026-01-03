import { FC } from 'react';
import { Box, Typography, Button, Card } from '@mui/material';
import { Search as SearchIcon } from '@mui/icons-material';

const NotasFiscaisPage: FC = () => {
  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Box>
          <Typography variant="h5" fontWeight={700}>Notas Fiscais</Typography>
          <Typography variant="body2" color="text.secondary">Consulte as notas fiscais emitidas</Typography>
        </Box>
        <Button variant="outlined" startIcon={<SearchIcon />}>Consultar SEFAZ</Button>
      </Box>
      <Card sx={{ p: 4, textAlign: 'center' }}>
        <Typography color="text.secondary">Lista de notas fiscais será exibida aqui</Typography>
      </Card>
    </Box>
  );
};

export default NotasFiscaisPage;

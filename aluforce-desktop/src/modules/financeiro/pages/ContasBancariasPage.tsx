import { FC } from 'react';
import { Box, Typography, Button, Card } from '@mui/material';
import { Add as AddIcon } from '@mui/icons-material';

const ContasBancariasPage: FC = () => {
  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Box>
          <Typography variant="h5" fontWeight={700}>Contas Bancárias</Typography>
          <Typography variant="body2" color="text.secondary">Gerencie as contas bancárias</Typography>
        </Box>
        <Button variant="contained" startIcon={<AddIcon />}>Nova Conta</Button>
      </Box>
      <Card sx={{ p: 4, textAlign: 'center' }}>
        <Typography color="text.secondary">Lista de contas bancárias será exibida aqui</Typography>
      </Card>
    </Box>
  );
};

export default ContasBancariasPage;

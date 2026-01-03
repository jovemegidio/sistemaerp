import { FC } from 'react';
import { Box, Typography, Button, Card } from '@mui/material';
import { Add as AddIcon } from '@mui/icons-material';

const PedidosCompraPage: FC = () => {
  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Box>
          <Typography variant="h5" fontWeight={700}>Pedidos de Compra</Typography>
          <Typography variant="body2" color="text.secondary">Gerencie os pedidos de compra</Typography>
        </Box>
        <Button variant="contained" startIcon={<AddIcon />}>Novo Pedido</Button>
      </Box>
      <Card sx={{ p: 4, textAlign: 'center' }}>
        <Typography color="text.secondary">Lista de pedidos será exibida aqui</Typography>
      </Card>
    </Box>
  );
};

export default PedidosCompraPage;

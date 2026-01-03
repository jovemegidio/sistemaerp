import { FC } from 'react';
import { Box, Typography, Card, TextField, Button, Grid } from '@mui/material';
import { Save as SaveIcon } from '@mui/icons-material';

const EmpresaPage: FC = () => {
  return (
    <Box>
      <Box sx={{ mb: 3 }}>
        <Typography variant="h5" fontWeight={700}>Dados da Empresa</Typography>
        <Typography variant="body2" color="text.secondary">Configure os dados cadastrais da empresa</Typography>
      </Box>
      <Card sx={{ p: 3 }}>
        <Grid container spacing={3}>
          <Grid item xs={12} md={6}>
            <TextField fullWidth label="Razão Social" />
          </Grid>
          <Grid item xs={12} md={6}>
            <TextField fullWidth label="Nome Fantasia" />
          </Grid>
          <Grid item xs={12} md={4}>
            <TextField fullWidth label="CNPJ" />
          </Grid>
          <Grid item xs={12} md={4}>
            <TextField fullWidth label="Inscrição Estadual" />
          </Grid>
          <Grid item xs={12} md={4}>
            <TextField fullWidth label="Inscrição Municipal" />
          </Grid>
          <Grid item xs={12}>
            <Button variant="contained" startIcon={<SaveIcon />}>Salvar Alterações</Button>
          </Grid>
        </Grid>
      </Card>
    </Box>
  );
};

export default EmpresaPage;

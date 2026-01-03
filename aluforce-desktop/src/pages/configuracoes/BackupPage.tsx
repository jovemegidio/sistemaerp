import { FC } from 'react';
import { Box, Typography, Card, Button, Grid, Alert } from '@mui/material';
import { Backup as BackupIcon, Restore as RestoreIcon } from '@mui/icons-material';

const BackupPage: FC = () => {
  return (
    <Box>
      <Box sx={{ mb: 3 }}>
        <Typography variant="h5" fontWeight={700}>Backup e Restauração</Typography>
        <Typography variant="body2" color="text.secondary">Gerencie os backups do banco de dados</Typography>
      </Box>
      
      <Alert severity="info" sx={{ mb: 3 }}>
        Recomendamos fazer backup regularmente para evitar perda de dados.
      </Alert>

      <Grid container spacing={3}>
        <Grid item xs={12} md={6}>
          <Card sx={{ p: 3 }}>
            <Typography variant="h6" gutterBottom>Criar Backup</Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              Crie uma cópia de segurança de todos os dados do sistema.
            </Typography>
            <Button variant="contained" startIcon={<BackupIcon />}>
              Fazer Backup Agora
            </Button>
          </Card>
        </Grid>
        <Grid item xs={12} md={6}>
          <Card sx={{ p: 3 }}>
            <Typography variant="h6" gutterBottom>Restaurar Backup</Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              Restaure os dados a partir de um arquivo de backup.
            </Typography>
            <Button variant="outlined" startIcon={<RestoreIcon />}>
              Selecionar Arquivo
            </Button>
          </Card>
        </Grid>
      </Grid>
    </Box>
  );
};

export default BackupPage;

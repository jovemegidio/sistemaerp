import { FC } from 'react';
import { Box, Typography, Grid, Card, CardContent, CardActionArea } from '@mui/material';
import { useNavigate } from 'react-router-dom';
import {
  Business as EmpresaIcon,
  Group as UsuariosIcon,
  Backup as BackupIcon,
  Settings as SettingsIcon,
} from '@mui/icons-material';

const ConfiguracoesPage: FC = () => {
  const navigate = useNavigate();

  const options = [
    { title: 'Dados da Empresa', description: 'Configure os dados cadastrais', icon: <EmpresaIcon />, path: '/configuracoes/empresa' },
    { title: 'Usuários', description: 'Gerencie os usuários do sistema', icon: <UsuariosIcon />, path: '/configuracoes/usuarios' },
    { title: 'Backup', description: 'Backup e restauração de dados', icon: <BackupIcon />, path: '/configuracoes/backup' },
  ];

  return (
    <Box>
      <Box sx={{ mb: 4 }}>
        <Typography variant="h5" fontWeight={700}>Configurações</Typography>
        <Typography variant="body2" color="text.secondary">Configure o sistema de acordo com suas necessidades</Typography>
      </Box>
      <Grid container spacing={3}>
        {options.map((option, index) => (
          <Grid item xs={12} sm={6} md={4} key={index}>
            <Card>
              <CardActionArea onClick={() => navigate(option.path)} sx={{ p: 3 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                  <Box sx={{ color: 'primary.main' }}>{option.icon}</Box>
                  <Box>
                    <Typography variant="subtitle1" fontWeight={600}>{option.title}</Typography>
                    <Typography variant="body2" color="text.secondary">{option.description}</Typography>
                  </Box>
                </Box>
              </CardActionArea>
            </Card>
          </Grid>
        ))}
      </Grid>
    </Box>
  );
};

export default ConfiguracoesPage;

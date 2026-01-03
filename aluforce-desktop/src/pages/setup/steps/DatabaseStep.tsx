import { useState } from 'react';
import {
  Box,
  Typography,
  TextField,
  Button,
  Paper,
  Stack,
  Alert,
  Chip,
} from '@mui/material';
import {
  Storage,
  FolderOpen,
  CheckCircle,
  Info,
} from '@mui/icons-material';

interface DatabaseStepProps {
  databasePath: string;
  onPathChange: (path: string) => void;
}

export default function DatabaseStep({ databasePath, onPathChange }: DatabaseStepProps) {
  const [useDefault, setUseDefault] = useState(true);
  const defaultPath = '%APPDATA%\\ALUFORCE\\aluforce.db';

  const handleBrowse = async () => {
    // In real implementation, this would use Tauri's dialog API
    // For simulation, we just show an alert
    try {
      // const { open } = await import('@tauri-apps/plugin-dialog');
      // const selected = await open({ directory: true });
      // if (selected) onPathChange(selected as string);
      alert('Em uma instalação real, abriria o seletor de diretórios');
    } catch {
      console.log('Dialog not available in simulation');
    }
  };

  return (
    <Box>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 3 }}>
        <Storage color="primary" />
        <Typography variant="h6" fontWeight="bold">
          Configuração do Banco de Dados
        </Typography>
      </Box>

      <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
        O ALUFORCE utiliza SQLite como banco de dados local. Escolha onde os dados
        serão armazenados.
      </Typography>

      <Stack spacing={3}>
        {/* Default option */}
        <Paper
          variant="outlined"
          sx={{
            p: 2,
            cursor: 'pointer',
            borderWidth: 2,
            borderColor: useDefault ? 'primary.main' : 'grey.300',
            bgcolor: useDefault ? 'primary.50' : 'transparent',
          }}
          onClick={() => {
            setUseDefault(true);
            onPathChange('');
          }}
        >
          <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 2 }}>
            <Box
              sx={{
                width: 50,
                height: 50,
                borderRadius: '50%',
                bgcolor: useDefault ? 'primary.100' : 'grey.100',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: useDefault ? 'primary.main' : 'grey.500',
              }}
            >
              <Storage />
            </Box>
            <Box sx={{ flex: 1 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <Typography variant="subtitle1" fontWeight="bold">
                  Local Padrão (Recomendado)
                </Typography>
                {useDefault && <CheckCircle color="primary" fontSize="small" />}
                <Chip label="Recomendado" size="small" color="primary" />
              </Box>
              <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                O banco será criado na pasta de dados do aplicativo.
              </Typography>
              <Typography
                variant="caption"
                sx={{
                  display: 'block',
                  mt: 1,
                  p: 1,
                  bgcolor: 'grey.100',
                  borderRadius: 1,
                  fontFamily: 'monospace',
                }}
              >
                {defaultPath}
              </Typography>
            </Box>
          </Box>
        </Paper>

        {/* Custom option */}
        <Paper
          variant="outlined"
          sx={{
            p: 2,
            cursor: 'pointer',
            borderWidth: 2,
            borderColor: !useDefault ? 'primary.main' : 'grey.300',
            bgcolor: !useDefault ? 'primary.50' : 'transparent',
          }}
          onClick={() => setUseDefault(false)}
        >
          <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 2 }}>
            <Box
              sx={{
                width: 50,
                height: 50,
                borderRadius: '50%',
                bgcolor: !useDefault ? 'primary.100' : 'grey.100',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: !useDefault ? 'primary.main' : 'grey.500',
              }}
            >
              <FolderOpen />
            </Box>
            <Box sx={{ flex: 1 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <Typography variant="subtitle1" fontWeight="bold">
                  Local Personalizado
                </Typography>
                {!useDefault && <CheckCircle color="primary" fontSize="small" />}
              </Box>
              <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5, mb: 2 }}>
                Escolha um local personalizado para o banco de dados.
              </Typography>

              {!useDefault && (
                <Box sx={{ display: 'flex', gap: 1 }}>
                  <TextField
                    size="small"
                    fullWidth
                    placeholder="C:\MeusDados\ALUFORCE"
                    value={databasePath}
                    onChange={(e) => onPathChange(e.target.value)}
                    disabled={useDefault}
                  />
                  <Button
                    variant="outlined"
                    onClick={handleBrowse}
                    startIcon={<FolderOpen />}
                    disabled={useDefault}
                  >
                    Procurar
                  </Button>
                </Box>
              )}
            </Box>
          </Box>
        </Paper>

        {/* Info box */}
        <Alert severity="info" icon={<Info />}>
          <Typography variant="body2">
            <strong>Importante:</strong> O banco de dados contém todas as informações do
            sistema. Certifique-se de fazer backup regularmente. O local escolhido deve
            ter pelo menos 500MB de espaço disponível.
          </Typography>
        </Alert>
      </Stack>
    </Box>
  );
}

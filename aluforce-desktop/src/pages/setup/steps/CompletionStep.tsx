import { Box, Typography, Button, Stack, Divider, Chip } from '@mui/material';
import {
  CheckCircle,
  Rocket,
  MenuBook,
  Support,
  Update,
} from '@mui/icons-material';

interface CompletionStepProps {
  onFinish: () => void;
}

export default function CompletionStep({ onFinish }: CompletionStepProps) {
  return (
    <Box sx={{ textAlign: 'center' }}>
      {/* Success icon */}
      <Box
        sx={{
          width: 100,
          height: 100,
          borderRadius: '50%',
          bgcolor: 'success.100',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          mx: 'auto',
          mb: 3,
          animation: 'pulse 2s infinite',
          '@keyframes pulse': {
            '0%': { transform: 'scale(1)', opacity: 1 },
            '50%': { transform: 'scale(1.05)', opacity: 0.8 },
            '100%': { transform: 'scale(1)', opacity: 1 },
          },
        }}
      >
        <CheckCircle sx={{ fontSize: 60, color: 'success.main' }} />
      </Box>

      <Typography variant="h4" fontWeight="bold" gutterBottom color="success.main">
        Instalação Concluída!
      </Typography>

      <Typography variant="body1" color="text.secondary" sx={{ mb: 4, maxWidth: 450, mx: 'auto' }}>
        O ALUFORCE foi instalado e configurado com sucesso. O sistema está pronto para uso.
      </Typography>

      <Divider sx={{ my: 3 }}>
        <Chip label="O que foi configurado" size="small" />
      </Divider>

      {/* Summary */}
      <Stack
        direction="row"
        justifyContent="center"
        flexWrap="wrap"
        gap={2}
        sx={{ mb: 4 }}
      >
        {[
          { icon: '🗄️', label: 'Banco de dados SQLite' },
          { icon: '🏢', label: 'Dados da empresa' },
          { icon: '👤', label: 'Usuário administrador' },
          { icon: '🔒', label: 'Segurança configurada' },
          { icon: '💾', label: 'Backup automático' },
          { icon: '⚙️', label: 'Configurações do sistema' },
        ].map((item, index) => (
          <Chip
            key={index}
            icon={<span>{item.icon}</span>}
            label={item.label}
            variant="outlined"
            color="success"
          />
        ))}
      </Stack>

      {/* Quick links */}
      <Box
        sx={{
          display: 'flex',
          justifyContent: 'center',
          gap: 2,
          mb: 4,
        }}
      >
        <Box
          sx={{
            p: 2,
            borderRadius: 2,
            bgcolor: 'grey.50',
            border: '1px solid',
            borderColor: 'grey.200',
            textAlign: 'center',
            minWidth: 140,
          }}
        >
          <MenuBook color="primary" sx={{ mb: 1 }} />
          <Typography variant="body2" fontWeight="medium">
            Documentação
          </Typography>
          <Typography variant="caption" color="text.secondary">
            Manual do usuário
          </Typography>
        </Box>

        <Box
          sx={{
            p: 2,
            borderRadius: 2,
            bgcolor: 'grey.50',
            border: '1px solid',
            borderColor: 'grey.200',
            textAlign: 'center',
            minWidth: 140,
          }}
        >
          <Support color="primary" sx={{ mb: 1 }} />
          <Typography variant="body2" fontWeight="medium">
            Suporte
          </Typography>
          <Typography variant="caption" color="text.secondary">
            Central de ajuda
          </Typography>
        </Box>

        <Box
          sx={{
            p: 2,
            borderRadius: 2,
            bgcolor: 'grey.50',
            border: '1px solid',
            borderColor: 'grey.200',
            textAlign: 'center',
            minWidth: 140,
          }}
        >
          <Update color="primary" sx={{ mb: 1 }} />
          <Typography variant="body2" fontWeight="medium">
            Atualizações
          </Typography>
          <Typography variant="caption" color="text.secondary">
            Versão 2.5.0
          </Typography>
        </Box>
      </Box>

      {/* Start button */}
      <Button
        variant="contained"
        size="large"
        startIcon={<Rocket />}
        onClick={onFinish}
        sx={{
          px: 6,
          py: 1.5,
          fontSize: '1.1rem',
          borderRadius: 3,
          background: 'linear-gradient(90deg, #1565c0 0%, #0d47a1 100%)',
          boxShadow: '0 4px 20px rgba(21, 101, 192, 0.3)',
          '&:hover': {
            background: 'linear-gradient(90deg, #1976d2 0%, #1565c0 100%)',
            boxShadow: '0 6px 25px rgba(21, 101, 192, 0.4)',
            transform: 'translateY(-2px)',
          },
          transition: 'all 0.3s',
        }}
      >
        Iniciar ALUFORCE
      </Button>

      <Typography variant="caption" color="text.secondary" display="block" sx={{ mt: 2 }}>
        Use as credenciais de administrador que você configurou para fazer login.
      </Typography>
    </Box>
  );
}

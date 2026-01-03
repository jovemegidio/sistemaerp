import { Box, Typography, Divider, Chip, Stack } from '@mui/material';
import {
  Business,
  Speed,
  Security,
  Storage,
  CloudOff,
  Support,
} from '@mui/icons-material';

const features = [
  { icon: <Business />, label: 'Gestão Completa', desc: 'Vendas, Compras, Financeiro, PCP, RH' },
  { icon: <Speed />, label: 'Alta Performance', desc: 'Backend em Rust otimizado' },
  { icon: <Security />, label: 'Segurança', desc: 'Dados criptografados localmente' },
  { icon: <Storage />, label: 'Banco Local', desc: 'SQLite sem dependências externas' },
  { icon: <CloudOff />, label: 'Offline First', desc: 'Funciona sem internet' },
  { icon: <Support />, label: 'Suporte', desc: 'Atualizações e suporte técnico' },
];

export default function WelcomeStep() {
  return (
    <Box>
      <Box sx={{ textAlign: 'center', mb: 4 }}>
        <Typography variant="h5" gutterBottom fontWeight="bold" color="primary">
          Bem-vindo ao ALUFORCE
        </Typography>
        <Typography variant="body1" color="text.secondary" sx={{ maxWidth: 500, mx: 'auto' }}>
          Este assistente irá guiá-lo através do processo de instalação e
          configuração inicial do sistema ALUFORCE - Sistema de Gestão Empresarial.
        </Typography>
      </Box>

      <Divider sx={{ my: 3 }}>
        <Chip label="Recursos do Sistema" size="small" />
      </Divider>

      <Stack
        direction="row"
        flexWrap="wrap"
        justifyContent="center"
        gap={2}
        sx={{ mb: 3 }}
      >
        {features.map((feature, index) => (
          <Box
            key={index}
            sx={{
              display: 'flex',
              alignItems: 'center',
              gap: 1.5,
              p: 2,
              borderRadius: 2,
              bgcolor: 'grey.50',
              border: '1px solid',
              borderColor: 'grey.200',
              minWidth: 220,
              transition: 'all 0.2s',
              '&:hover': {
                bgcolor: 'primary.50',
                borderColor: 'primary.200',
                transform: 'translateY(-2px)',
              },
            }}
          >
            <Box
              sx={{
                color: 'primary.main',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                width: 40,
                height: 40,
                borderRadius: '50%',
                bgcolor: 'primary.100',
              }}
            >
              {feature.icon}
            </Box>
            <Box>
              <Typography variant="subtitle2" fontWeight="bold">
                {feature.label}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                {feature.desc}
              </Typography>
            </Box>
          </Box>
        ))}
      </Stack>

      <Box
        sx={{
          mt: 4,
          p: 2,
          borderRadius: 2,
          bgcolor: 'info.50',
          border: '1px solid',
          borderColor: 'info.200',
        }}
      >
        <Typography variant="body2" color="info.dark">
          <strong>💡 Dica:</strong> Este processo de configuração só será executado
          uma vez. Após a conclusão, o sistema estará pronto para uso.
        </Typography>
      </Box>

      <Box sx={{ textAlign: 'center', mt: 4 }}>
        <Typography variant="body2" color="text.secondary">
          Clique em <strong>"Próximo"</strong> para continuar
        </Typography>
      </Box>
    </Box>
  );
}

import {
  Box,
  Typography,
  Card,
  CardContent,
  CardActionArea,
  Stack,
  Chip,
} from '@mui/material';
import {
  AllInclusive,
  Tune,
  Dns,
  CheckCircle,
  Star,
} from '@mui/icons-material';

type InstallType = 'completa' | 'personalizada' | 'servidor';

interface InstallTypeStepProps {
  installType: InstallType;
  onTypeChange: (type: InstallType) => void;
}

const installOptions = [
  {
    type: 'completa' as InstallType,
    icon: <AllInclusive sx={{ fontSize: 48 }} />,
    title: 'Instalação Completa',
    subtitle: 'Recomendado para a maioria dos usuários',
    description: 'Instala todos os módulos do sistema com configurações padrão otimizadas.',
    features: [
      'Todos os módulos incluídos',
      'Configuração automática',
      'Banco de dados local',
      'Backup automático',
    ],
    recommended: true,
  },
  {
    type: 'personalizada' as InstallType,
    icon: <Tune sx={{ fontSize: 48 }} />,
    title: 'Instalação Personalizada',
    subtitle: 'Para usuários avançados',
    description: 'Permite escolher quais módulos instalar e personalizar configurações.',
    features: [
      'Escolha de módulos',
      'Configurações personalizadas',
      'Local do banco customizado',
      'Opções avançadas',
    ],
    recommended: false,
  },
  {
    type: 'servidor' as InstallType,
    icon: <Dns sx={{ fontSize: 48 }} />,
    title: 'Instalação Servidor',
    subtitle: 'Para ambientes corporativos',
    description: 'Configura o sistema para uso em rede com múltiplos usuários.',
    features: [
      'Multi-usuário',
      'Banco centralizado',
      'Controle de acesso',
      'Auditoria completa',
    ],
    recommended: false,
  },
];

export default function InstallTypeStep({ installType, onTypeChange }: InstallTypeStepProps) {
  return (
    <Box>
      <Typography variant="h6" fontWeight="bold" gutterBottom>
        Selecione o Tipo de Instalação
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
        Escolha o tipo de instalação que melhor atende às suas necessidades.
      </Typography>

      <Stack spacing={2}>
        {installOptions.map((option) => (
          <Card
            key={option.type}
            variant="outlined"
            sx={{
              borderWidth: 2,
              borderColor: installType === option.type ? 'primary.main' : 'grey.300',
              bgcolor: installType === option.type ? 'primary.50' : 'transparent',
              transition: 'all 0.2s',
              position: 'relative',
              overflow: 'visible',
            }}
          >
            {option.recommended && (
              <Chip
                icon={<Star />}
                label="Recomendado"
                color="primary"
                size="small"
                sx={{
                  position: 'absolute',
                  top: -12,
                  right: 16,
                }}
              />
            )}
            <CardActionArea onClick={() => onTypeChange(option.type)}>
              <CardContent sx={{ display: 'flex', gap: 3, alignItems: 'flex-start' }}>
                <Box
                  sx={{
                    color: installType === option.type ? 'primary.main' : 'grey.500',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    width: 80,
                    height: 80,
                    borderRadius: 2,
                    bgcolor: installType === option.type ? 'primary.100' : 'grey.100',
                    flexShrink: 0,
                  }}
                >
                  {option.icon}
                </Box>

                <Box sx={{ flex: 1 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Typography variant="h6" fontWeight="bold">
                      {option.title}
                    </Typography>
                    {installType === option.type && (
                      <CheckCircle color="primary" fontSize="small" />
                    )}
                  </Box>
                  <Typography variant="caption" color="text.secondary" display="block">
                    {option.subtitle}
                  </Typography>
                  <Typography variant="body2" sx={{ mt: 1, mb: 1.5 }}>
                    {option.description}
                  </Typography>

                  <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                    {option.features.map((feature, idx) => (
                      <Chip
                        key={idx}
                        label={feature}
                        size="small"
                        variant={installType === option.type ? 'filled' : 'outlined'}
                        color={installType === option.type ? 'primary' : 'default'}
                        sx={{ fontSize: '0.7rem' }}
                      />
                    ))}
                  </Box>
                </Box>
              </CardContent>
            </CardActionArea>
          </Card>
        ))}
      </Stack>
    </Box>
  );
}

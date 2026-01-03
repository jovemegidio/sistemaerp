import { useEffect, useState } from 'react';
import {
  Box,
  Typography,
  LinearProgress,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Fade,
  CircularProgress,
} from '@mui/material';
import {
  CheckCircle,
  HourglassEmpty,
  Storage,
  TableChart,
  Person,
  Business,
  Settings,
  Security,
  Backup,
} from '@mui/icons-material';
import type { SetupData } from '../SetupWizard';

interface InstallProgressStepProps {
  setupData: SetupData;
  isInstalling: boolean;
  onComplete: () => void;
}

interface InstallStep {
  id: string;
  label: string;
  description: string;
  icon: React.ReactNode;
  duration: number; // ms
}

const installSteps: InstallStep[] = [
  {
    id: 'database',
    label: 'Criando banco de dados',
    description: 'Inicializando SQLite e estruturas de dados...',
    icon: <Storage />,
    duration: 1500,
  },
  {
    id: 'tables',
    label: 'Criando tabelas',
    description: 'Configurando tabelas do sistema (15 tabelas)...',
    icon: <TableChart />,
    duration: 2000,
  },
  {
    id: 'indexes',
    label: 'Criando índices',
    description: 'Otimizando performance com índices...',
    icon: <Settings />,
    duration: 1000,
  },
  {
    id: 'company',
    label: 'Cadastrando empresa',
    description: 'Salvando dados da empresa no sistema...',
    icon: <Business />,
    duration: 800,
  },
  {
    id: 'admin',
    label: 'Criando usuário administrador',
    description: 'Configurando credenciais de acesso...',
    icon: <Person />,
    duration: 1200,
  },
  {
    id: 'security',
    label: 'Configurando segurança',
    description: 'Habilitando criptografia e permissões...',
    icon: <Security />,
    duration: 1000,
  },
  {
    id: 'config',
    label: 'Aplicando configurações',
    description: 'Salvando preferências do sistema...',
    icon: <Settings />,
    duration: 800,
  },
  {
    id: 'backup',
    label: 'Configurando backup automático',
    description: 'Ativando rotinas de backup...',
    icon: <Backup />,
    duration: 600,
  },
];

export default function InstallProgressStep({
  setupData,
  isInstalling,
  onComplete,
}: InstallProgressStepProps) {
  const [currentStepIndex, setCurrentStepIndex] = useState(-1);
  const [completedSteps, setCompletedSteps] = useState<string[]>([]);
  const [overallProgress, setOverallProgress] = useState(0);

  useEffect(() => {
    if (!isInstalling) return;

    const runInstallation = async () => {
      const totalDuration = installSteps.reduce((acc, step) => acc + step.duration, 0);
      let elapsedTime = 0;

      for (let i = 0; i < installSteps.length; i++) {
        const step = installSteps[i];
        setCurrentStepIndex(i);

        // Simulate step progress
        const stepStartTime = elapsedTime;
        const stepInterval = 50; // Update every 50ms
        const iterations = step.duration / stepInterval;

        for (let j = 0; j < iterations; j++) {
          await new Promise((resolve) => setTimeout(resolve, stepInterval));
          elapsedTime += stepInterval;
          setOverallProgress(Math.min(100, (elapsedTime / totalDuration) * 100));
        }

        setCompletedSteps((prev) => [...prev, step.id]);
      }

      // Complete installation
      setOverallProgress(100);
      setTimeout(() => {
        onComplete();
      }, 500);
    };

    runInstallation();
  }, [isInstalling, onComplete]);

  const getStepStatus = (stepId: string, index: number) => {
    if (completedSteps.includes(stepId)) return 'completed';
    if (index === currentStepIndex) return 'running';
    return 'pending';
  };

  return (
    <Box>
      <Typography variant="h6" fontWeight="bold" gutterBottom textAlign="center">
        {completedSteps.length === installSteps.length
          ? '✅ Instalação Concluída!'
          : '⏳ Instalando ALUFORCE...'}
      </Typography>

      <Typography variant="body2" color="text.secondary" textAlign="center" sx={{ mb: 3 }}>
        {completedSteps.length === installSteps.length
          ? 'Todos os componentes foram instalados com sucesso.'
          : 'Por favor, aguarde enquanto configuramos o sistema.'}
      </Typography>

      {/* Overall progress */}
      <Box sx={{ mb: 4 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
          <Typography variant="body2" fontWeight="medium">
            Progresso geral
          </Typography>
          <Typography variant="body2" fontWeight="bold" color="primary">
            {Math.round(overallProgress)}%
          </Typography>
        </Box>
        <LinearProgress
          variant="determinate"
          value={overallProgress}
          sx={{
            height: 12,
            borderRadius: 6,
            bgcolor: 'grey.200',
            '& .MuiLinearProgress-bar': {
              borderRadius: 6,
              background: 'linear-gradient(90deg, #1565c0 0%, #42a5f5 100%)',
            },
          }}
        />
      </Box>

      {/* Steps list */}
      <List dense sx={{ bgcolor: 'grey.50', borderRadius: 2, p: 1 }}>
        {installSteps.map((step, index) => {
          const status = getStepStatus(step.id, index);

          return (
            <Fade in key={step.id} timeout={300}>
              <ListItem
                sx={{
                  borderRadius: 1,
                  mb: 0.5,
                  bgcolor:
                    status === 'running'
                      ? 'primary.50'
                      : status === 'completed'
                      ? 'success.50'
                      : 'transparent',
                  border: status === 'running' ? '1px solid' : 'none',
                  borderColor: 'primary.200',
                }}
              >
                <ListItemIcon sx={{ minWidth: 40 }}>
                  {status === 'completed' ? (
                    <CheckCircle color="success" />
                  ) : status === 'running' ? (
                    <CircularProgress size={24} color="primary" />
                  ) : (
                    <HourglassEmpty color="disabled" />
                  )}
                </ListItemIcon>
                <ListItemText
                  primary={
                    <Typography
                      variant="body2"
                      fontWeight={status === 'running' ? 'bold' : 'normal'}
                      color={
                        status === 'completed'
                          ? 'success.main'
                          : status === 'running'
                          ? 'primary.main'
                          : 'text.secondary'
                      }
                    >
                      {step.label}
                    </Typography>
                  }
                  secondary={
                    status === 'running' && (
                      <Typography variant="caption" color="text.secondary">
                        {step.description}
                      </Typography>
                    )
                  }
                />
                <Box
                  sx={{
                    color:
                      status === 'completed'
                        ? 'success.main'
                        : status === 'running'
                        ? 'primary.main'
                        : 'grey.400',
                  }}
                >
                  {step.icon}
                </Box>
              </ListItem>
            </Fade>
          );
        })}
      </List>

      {/* Installation summary */}
      {isInstalling && currentStepIndex >= 0 && (
        <Box
          sx={{
            mt: 3,
            p: 2,
            bgcolor: 'info.50',
            borderRadius: 2,
            border: '1px solid',
            borderColor: 'info.200',
          }}
        >
          <Typography variant="caption" color="info.dark">
            <strong>Configuração:</strong> {setupData.installType.toUpperCase()} •{' '}
            <strong>Empresa:</strong> {setupData.company.razaoSocial || 'N/A'} •{' '}
            <strong>Admin:</strong> {setupData.admin.email}
          </Typography>
        </Box>
      )}
    </Box>
  );
}

import { useState } from 'react';
import {
  Box,
  Stepper,
  Step,
  StepLabel,
  Button,
  Typography,
  Paper,
  Container,
  LinearProgress,
  Fade,
} from '@mui/material';
import WelcomeStep from './steps/WelcomeStep';
import LicenseStep from './steps/LicenseStep';
import InstallTypeStep from './steps/InstallTypeStep';
import DatabaseStep from './steps/DatabaseStep';
import CompanyStep from './steps/CompanyStep';
import AdminUserStep from './steps/AdminUserStep';
import InstallProgressStep from './steps/InstallProgressStep';
import CompletionStep from './steps/CompletionStep';

const steps = [
  'Bem-vindo',
  'Licença',
  'Tipo de Instalação',
  'Banco de Dados',
  'Dados da Empresa',
  'Usuário Admin',
  'Instalação',
  'Conclusão',
];

export interface SetupData {
  licenseAccepted: boolean;
  installType: 'completa' | 'personalizada' | 'servidor';
  databasePath: string;
  company: {
    razaoSocial: string;
    nomeFantasia: string;
    cnpj: string;
    inscricaoEstadual: string;
    endereco: string;
    numero: string;
    bairro: string;
    cidade: string;
    uf: string;
    cep: string;
    telefone: string;
    email: string;
  };
  admin: {
    nome: string;
    email: string;
    senha: string;
  };
}

const initialSetupData: SetupData = {
  licenseAccepted: false,
  installType: 'completa',
  databasePath: '',
  company: {
    razaoSocial: '',
    nomeFantasia: '',
    cnpj: '',
    inscricaoEstadual: '',
    endereco: '',
    numero: '',
    bairro: '',
    cidade: '',
    uf: '',
    cep: '',
    telefone: '',
    email: '',
  },
  admin: {
    nome: 'Administrador',
    email: 'admin@empresa.com.br',
    senha: '',
  },
};

interface SetupWizardProps {
  onComplete: () => void;
}

export default function SetupWizard({ onComplete }: SetupWizardProps) {
  const [activeStep, setActiveStep] = useState(0);
  const [setupData, setSetupData] = useState<SetupData>(initialSetupData);
  const [isInstalling, setIsInstalling] = useState(false);
  const [installComplete, setInstallComplete] = useState(false);

  const handleNext = () => {
    if (activeStep === 6 && !isInstalling) {
      // Start installation
      setIsInstalling(true);
      return;
    }
    setActiveStep((prev) => prev + 1);
  };

  const handleBack = () => {
    setActiveStep((prev) => prev - 1);
  };

  const handleDataChange = (data: Partial<SetupData>) => {
    setSetupData((prev) => ({ ...prev, ...data }));
  };

  const handleInstallComplete = () => {
    setIsInstalling(false);
    setInstallComplete(true);
    setActiveStep(7);
  };

  const canProceed = (): boolean => {
    switch (activeStep) {
      case 0:
        return true;
      case 1:
        return setupData.licenseAccepted;
      case 2:
        return !!setupData.installType;
      case 3:
        return true;
      case 4:
        return !!(
          setupData.company.razaoSocial &&
          setupData.company.cnpj &&
          setupData.company.cidade &&
          setupData.company.uf
        );
      case 5:
        return !!(
          setupData.admin.nome &&
          setupData.admin.email &&
          setupData.admin.senha &&
          setupData.admin.senha.length >= 6
        );
      case 6:
        return installComplete;
      case 7:
        return true;
      default:
        return false;
    }
  };

  const renderStep = () => {
    switch (activeStep) {
      case 0:
        return <WelcomeStep />;
      case 1:
        return (
          <LicenseStep
            accepted={setupData.licenseAccepted}
            onAcceptChange={(accepted) =>
              handleDataChange({ licenseAccepted: accepted })
            }
          />
        );
      case 2:
        return (
          <InstallTypeStep
            installType={setupData.installType}
            onTypeChange={(type) => handleDataChange({ installType: type })}
          />
        );
      case 3:
        return (
          <DatabaseStep
            databasePath={setupData.databasePath}
            onPathChange={(path) => handleDataChange({ databasePath: path })}
          />
        );
      case 4:
        return (
          <CompanyStep
            company={setupData.company}
            onCompanyChange={(company) => handleDataChange({ company })}
          />
        );
      case 5:
        return (
          <AdminUserStep
            admin={setupData.admin}
            onAdminChange={(admin) => handleDataChange({ admin })}
          />
        );
      case 6:
        return (
          <InstallProgressStep
            setupData={setupData}
            isInstalling={isInstalling}
            onComplete={handleInstallComplete}
          />
        );
      case 7:
        return <CompletionStep onFinish={onComplete} />;
      default:
        return null;
    }
  };

  return (
    <Box
      sx={{
        minHeight: '100vh',
        background: 'linear-gradient(135deg, #0d47a1 0%, #1565c0 50%, #1976d2 100%)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        py: 4,
      }}
    >
      <Container maxWidth="md">
        <Paper
          elevation={24}
          sx={{
            borderRadius: 3,
            overflow: 'hidden',
            minHeight: 600,
            display: 'flex',
            flexDirection: 'column',
          }}
        >
          {/* Header */}
          <Box
            sx={{
              background: 'linear-gradient(90deg, #1565c0 0%, #0d47a1 100%)',
              color: 'white',
              p: 3,
              textAlign: 'center',
            }}
          >
            <Typography variant="h4" fontWeight="bold" gutterBottom>
              ALUFORCE
            </Typography>
            <Typography variant="subtitle1" sx={{ opacity: 0.9 }}>
              Sistema de Gestão Empresarial
            </Typography>
            <Typography variant="caption" sx={{ opacity: 0.7 }}>
              Assistente de Instalação e Configuração
            </Typography>
          </Box>

          {/* Stepper */}
          <Box sx={{ px: 3, pt: 3 }}>
            <Stepper activeStep={activeStep} alternativeLabel>
              {steps.map((label, index) => (
                <Step key={label} completed={index < activeStep}>
                  <StepLabel
                    sx={{
                      '& .MuiStepLabel-label': {
                        fontSize: '0.7rem',
                        mt: 0.5,
                      },
                    }}
                  >
                    {label}
                  </StepLabel>
                </Step>
              ))}
            </Stepper>
          </Box>

          {/* Progress bar */}
          <LinearProgress
            variant="determinate"
            value={(activeStep / (steps.length - 1)) * 100}
            sx={{ height: 4, mt: 2 }}
          />

          {/* Content */}
          <Box sx={{ flex: 1, p: 4, minHeight: 350 }}>
            <Fade in key={activeStep}>
              <Box>{renderStep()}</Box>
            </Fade>
          </Box>

          {/* Footer buttons */}
          <Box
            sx={{
              display: 'flex',
              justifyContent: 'space-between',
              p: 3,
              borderTop: '1px solid',
              borderColor: 'divider',
              bgcolor: 'grey.50',
            }}
          >
            <Button
              onClick={handleBack}
              disabled={activeStep === 0 || activeStep === 7 || isInstalling}
              variant="outlined"
              sx={{ minWidth: 120 }}
            >
              Voltar
            </Button>

            <Box sx={{ display: 'flex', gap: 2 }}>
              {activeStep < 7 && (
                <Button
                  onClick={handleNext}
                  disabled={!canProceed() || (activeStep === 6 && isInstalling)}
                  variant="contained"
                  sx={{ minWidth: 120 }}
                >
                  {activeStep === 6
                    ? isInstalling
                      ? 'Instalando...'
                      : 'Instalar'
                    : activeStep === 5
                    ? 'Iniciar Instalação'
                    : 'Próximo'}
                </Button>
              )}
              {activeStep === 7 && (
                <Button
                  onClick={onComplete}
                  variant="contained"
                  color="success"
                  sx={{ minWidth: 150 }}
                >
                  Iniciar Sistema
                </Button>
              )}
            </Box>
          </Box>

          {/* Version footer */}
          <Box
            sx={{
              textAlign: 'center',
              py: 1,
              bgcolor: 'grey.100',
              borderTop: '1px solid',
              borderColor: 'divider',
            }}
          >
            <Typography variant="caption" color="text.secondary">
              ALUFORCE Desktop v2.5.0 • © 2025 Todos os direitos reservados
            </Typography>
          </Box>
        </Paper>
      </Container>
    </Box>
  );
}

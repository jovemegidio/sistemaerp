import { useState } from 'react';
import {
  Box,
  Typography,
  TextField,
  Grid,
  InputAdornment,
  IconButton,
  Alert,
  LinearProgress,
  Chip,
} from '@mui/material';
import {
  Person,
  Email,
  Lock,
  Visibility,
  VisibilityOff,
  CheckCircle,
  Cancel,
} from '@mui/icons-material';

interface AdminData {
  nome: string;
  email: string;
  senha: string;
}

interface AdminUserStepProps {
  admin: AdminData;
  onAdminChange: (admin: AdminData) => void;
}

const getPasswordStrength = (password: string): { strength: number; label: string; color: string } => {
  let strength = 0;

  if (password.length >= 6) strength += 20;
  if (password.length >= 8) strength += 20;
  if (/[a-z]/.test(password)) strength += 15;
  if (/[A-Z]/.test(password)) strength += 15;
  if (/[0-9]/.test(password)) strength += 15;
  if (/[^a-zA-Z0-9]/.test(password)) strength += 15;

  if (strength < 40) return { strength, label: 'Fraca', color: 'error' };
  if (strength < 70) return { strength, label: 'Média', color: 'warning' };
  return { strength, label: 'Forte', color: 'success' };
};

export default function AdminUserStep({ admin, onAdminChange }: AdminUserStepProps) {
  const [showPassword, setShowPassword] = useState(false);
  const [confirmPassword, setConfirmPassword] = useState('');

  const handleChange = (field: keyof AdminData) => (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    onAdminChange({ ...admin, [field]: e.target.value });
  };

  const passwordStrength = getPasswordStrength(admin.senha);
  const passwordsMatch = admin.senha === confirmPassword && admin.senha.length > 0;

  const passwordRequirements = [
    { met: admin.senha.length >= 6, label: 'Mínimo 6 caracteres' },
    { met: /[a-z]/.test(admin.senha), label: 'Letra minúscula' },
    { met: /[A-Z]/.test(admin.senha), label: 'Letra maiúscula' },
    { met: /[0-9]/.test(admin.senha), label: 'Número' },
    { met: /[^a-zA-Z0-9]/.test(admin.senha), label: 'Caractere especial' },
  ];

  return (
    <Box>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
        <Person color="primary" />
        <Typography variant="h6" fontWeight="bold">
          Criar Usuário Administrador
        </Typography>
      </Box>

      <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
        Configure o usuário administrador principal do sistema. Este usuário terá
        acesso total a todas as funcionalidades.
      </Typography>

      <Alert severity="info" sx={{ mb: 3 }}>
        <Typography variant="body2">
          <strong>Importante:</strong> Guarde estas credenciais em local seguro.
          O administrador poderá criar outros usuários após a instalação.
        </Typography>
      </Alert>

      <Grid container spacing={3}>
        <Grid item xs={12}>
          <TextField
            fullWidth
            required
            label="Nome Completo"
            value={admin.nome}
            onChange={handleChange('nome')}
            placeholder="Nome do administrador"
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <Person color="action" />
                </InputAdornment>
              ),
            }}
          />
        </Grid>

        <Grid item xs={12}>
          <TextField
            fullWidth
            required
            type="email"
            label="E-mail de Acesso"
            value={admin.email}
            onChange={handleChange('email')}
            placeholder="admin@empresa.com.br"
            helperText="Este e-mail será usado para fazer login no sistema"
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <Email color="action" />
                </InputAdornment>
              ),
            }}
          />
        </Grid>

        <Grid item xs={12} md={6}>
          <TextField
            fullWidth
            required
            type={showPassword ? 'text' : 'password'}
            label="Senha"
            value={admin.senha}
            onChange={handleChange('senha')}
            placeholder="Crie uma senha forte"
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <Lock color="action" />
                </InputAdornment>
              ),
              endAdornment: (
                <InputAdornment position="end">
                  <IconButton
                    onClick={() => setShowPassword(!showPassword)}
                    edge="end"
                    size="small"
                  >
                    {showPassword ? <VisibilityOff /> : <Visibility />}
                  </IconButton>
                </InputAdornment>
              ),
            }}
          />

          {admin.senha && (
            <Box sx={{ mt: 1 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
                <LinearProgress
                  variant="determinate"
                  value={passwordStrength.strength}
                  color={passwordStrength.color as 'error' | 'warning' | 'success'}
                  sx={{ flex: 1, height: 6, borderRadius: 3 }}
                />
                <Typography
                  variant="caption"
                  fontWeight="bold"
                  color={`${passwordStrength.color}.main`}
                >
                  {passwordStrength.label}
                </Typography>
              </Box>
            </Box>
          )}
        </Grid>

        <Grid item xs={12} md={6}>
          <TextField
            fullWidth
            required
            type={showPassword ? 'text' : 'password'}
            label="Confirmar Senha"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            placeholder="Repita a senha"
            error={confirmPassword.length > 0 && !passwordsMatch}
            helperText={
              confirmPassword.length > 0 && !passwordsMatch
                ? 'As senhas não conferem'
                : ''
            }
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <Lock color="action" />
                </InputAdornment>
              ),
              endAdornment: confirmPassword.length > 0 && (
                <InputAdornment position="end">
                  {passwordsMatch ? (
                    <CheckCircle color="success" />
                  ) : (
                    <Cancel color="error" />
                  )}
                </InputAdornment>
              ),
            }}
          />
        </Grid>

        <Grid item xs={12}>
          <Typography variant="caption" color="text.secondary" sx={{ mb: 1, display: 'block' }}>
            Requisitos da senha:
          </Typography>
          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
            {passwordRequirements.map((req, idx) => (
              <Chip
                key={idx}
                size="small"
                icon={req.met ? <CheckCircle /> : <Cancel />}
                label={req.label}
                color={req.met ? 'success' : 'default'}
                variant={req.met ? 'filled' : 'outlined'}
                sx={{ fontSize: '0.7rem' }}
              />
            ))}
          </Box>
        </Grid>
      </Grid>

      <Box
        sx={{
          mt: 3,
          p: 2,
          bgcolor: 'warning.50',
          borderRadius: 2,
          border: '1px solid',
          borderColor: 'warning.200',
        }}
      >
        <Typography variant="body2" color="warning.dark">
          <strong>⚠️ Atenção:</strong> A senha deve ter no mínimo 6 caracteres.
          Recomendamos usar uma combinação de letras, números e caracteres especiais
          para maior segurança.
        </Typography>
      </Box>
    </Box>
  );
}

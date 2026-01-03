import { FC, useState } from 'react';


import {
  Box,
  TextField,
  Button,
  Typography,
  InputAdornment,
  IconButton,
  Alert,
  CircularProgress,
} from '@mui/material';
import {
  Email as EmailIcon,
  Lock as LockIcon,
  Visibility,
  VisibilityOff,
  Login as LoginIcon,
} from '@mui/icons-material';
import { useAppDispatch, useAppSelector } from '@store/index';
import { login, clearError } from '@store/slices/authSlice';

const LoginPage: FC = () => {
  const dispatch = useAppDispatch();
  const { isLoading, error } = useAppSelector((state) => state.auth);

  const [email, setEmail] = useState('');
  const [senha, setSenha] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [validationErrors, setValidationErrors] = useState<{ email?: string; senha?: string }>({});

  const validateForm = () => {
    const errors: { email?: string; senha?: string } = {};

    if (!email) {
      errors.email = 'E-mail é obrigatório';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      errors.email = 'E-mail inválido';
    }

    if (!senha) {
      errors.senha = 'Senha é obrigatória';
    } else if (senha.length < 6) {
      errors.senha = 'Senha deve ter no mínimo 6 caracteres';
    }

    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (error) {
      dispatch(clearError());
    }

    if (!validateForm()) {
      return;
    }

    dispatch(login({ email, senha }));
  };

  const handleTogglePassword = () => {
    setShowPassword(!showPassword);
  };

  return (
    <Box component="form" onSubmit={handleSubmit} noValidate>
      {/* Header */}
      <Box sx={{ textAlign: 'center', mb: 4 }}>
        <Typography variant="h4" component="h1" fontWeight={700} gutterBottom>
          Bem-vindo
        </Typography>
        <Typography variant="body1" color="text.secondary">
          Faça login para acessar o sistema
        </Typography>
      </Box>

      {/* Error Alert */}
      {error && (
        <Alert severity="error" sx={{ mb: 3 }} onClose={() => dispatch(clearError())}>
          {error}
        </Alert>
      )}

      {/* Form Fields */}
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.5 }}>
        <TextField
          fullWidth
          label="E-mail"
          type="email"
          value={email}
          onChange={(e) => {
            setEmail(e.target.value);
            if (validationErrors.email) {
              setValidationErrors((prev) => ({ ...prev, email: undefined }));
            }
          }}
          error={!!validationErrors.email}
          helperText={validationErrors.email}
          disabled={isLoading}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <EmailIcon color="action" />
              </InputAdornment>
            ),
          }}
          placeholder="seu@email.com"
          autoComplete="email"
          autoFocus
        />

        <TextField
          fullWidth
          label="Senha"
          type={showPassword ? 'text' : 'password'}
          value={senha}
          onChange={(e) => {
            setSenha(e.target.value);
            if (validationErrors.senha) {
              setValidationErrors((prev) => ({ ...prev, senha: undefined }));
            }
          }}
          error={!!validationErrors.senha}
          helperText={validationErrors.senha}
          disabled={isLoading}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <LockIcon color="action" />
              </InputAdornment>
            ),
            endAdornment: (
              <InputAdornment position="end">
                <IconButton
                  onClick={handleTogglePassword}
                  edge="end"
                  disabled={isLoading}
                >
                  {showPassword ? <VisibilityOff /> : <Visibility />}
                </IconButton>
              </InputAdornment>
            ),
          }}
          placeholder="••••••••"
          autoComplete="current-password"
        />
      </Box>

      {/* Submit Button */}
      <Button
        type="submit"
        fullWidth
        variant="contained"
        size="large"
        disabled={isLoading}
        sx={{
          mt: 4,
          py: 1.5,
          fontSize: '1rem',
          fontWeight: 600,
        }}
        startIcon={
          isLoading ? (
            <CircularProgress size={20} color="inherit" />
          ) : (
            <LoginIcon />
          )
        }
      >
        {isLoading ? 'Entrando...' : 'Entrar'}
      </Button>

      {/* Help text */}
      <Typography
        variant="body2"
        color="text.secondary"
        align="center"
        sx={{ mt: 3 }}
      >
        Esqueceu sua senha? Entre em contato com o administrador.
      </Typography>
    </Box>
  );
};

export default LoginPage;

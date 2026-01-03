import {
  Box,
  Typography,
  TextField,
  Grid,
  Divider,
  InputAdornment,
} from '@mui/material';
import {
  Business,
  Badge,
  LocationOn,
  Phone,
  Email,
} from '@mui/icons-material';

interface CompanyData {
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
}

interface CompanyStepProps {
  company: CompanyData;
  onCompanyChange: (company: CompanyData) => void;
}

const formatCNPJ = (value: string) => {
  const numbers = value.replace(/\D/g, '').slice(0, 14);
  return numbers.replace(
    /^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/,
    '$1.$2.$3/$4-$5'
  );
};

const formatCEP = (value: string) => {
  const numbers = value.replace(/\D/g, '').slice(0, 8);
  return numbers.replace(/^(\d{5})(\d{3})$/, '$1-$2');
};

const formatPhone = (value: string) => {
  const numbers = value.replace(/\D/g, '').slice(0, 11);
  if (numbers.length <= 10) {
    return numbers.replace(/^(\d{2})(\d{4})(\d{4})$/, '($1) $2-$3');
  }
  return numbers.replace(/^(\d{2})(\d{5})(\d{4})$/, '($1) $2-$3');
};

const UF_OPTIONS = [
  'AC', 'AL', 'AP', 'AM', 'BA', 'CE', 'DF', 'ES', 'GO', 'MA', 'MT', 'MS',
  'MG', 'PA', 'PB', 'PR', 'PE', 'PI', 'RJ', 'RN', 'RS', 'RO', 'RR', 'SC',
  'SP', 'SE', 'TO',
];

export default function CompanyStep({ company, onCompanyChange }: CompanyStepProps) {
  const handleChange = (field: keyof CompanyData) => (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    let value = e.target.value;

    // Apply formatting
    if (field === 'cnpj') value = formatCNPJ(value);
    if (field === 'cep') value = formatCEP(value);
    if (field === 'telefone') value = formatPhone(value);
    if (field === 'uf') value = value.toUpperCase().slice(0, 2);

    onCompanyChange({ ...company, [field]: value });
  };

  return (
    <Box>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
        <Business color="primary" />
        <Typography variant="h6" fontWeight="bold">
          Dados da Empresa
        </Typography>
      </Box>

      <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
        Informe os dados da empresa. Estas informações serão utilizadas em documentos,
        notas fiscais e relatórios.
      </Typography>

      <Grid container spacing={2}>
        {/* Identification Section */}
        <Grid item xs={12}>
          <Divider textAlign="left" sx={{ mb: 2 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
              <Badge fontSize="small" color="action" />
              <Typography variant="caption" color="text.secondary">
                Identificação
              </Typography>
            </Box>
          </Divider>
        </Grid>

        <Grid item xs={12}>
          <TextField
            fullWidth
            required
            size="small"
            label="Razão Social"
            value={company.razaoSocial}
            onChange={handleChange('razaoSocial')}
            placeholder="Nome completo da empresa"
          />
        </Grid>

        <Grid item xs={12} md={6}>
          <TextField
            fullWidth
            size="small"
            label="Nome Fantasia"
            value={company.nomeFantasia}
            onChange={handleChange('nomeFantasia')}
            placeholder="Nome comercial"
          />
        </Grid>

        <Grid item xs={12} md={6}>
          <TextField
            fullWidth
            required
            size="small"
            label="CNPJ"
            value={company.cnpj}
            onChange={handleChange('cnpj')}
            placeholder="00.000.000/0000-00"
            inputProps={{ maxLength: 18 }}
          />
        </Grid>

        <Grid item xs={12} md={6}>
          <TextField
            fullWidth
            size="small"
            label="Inscrição Estadual"
            value={company.inscricaoEstadual}
            onChange={handleChange('inscricaoEstadual')}
            placeholder="Número da IE"
          />
        </Grid>

        {/* Address Section */}
        <Grid item xs={12}>
          <Divider textAlign="left" sx={{ mt: 2, mb: 2 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
              <LocationOn fontSize="small" color="action" />
              <Typography variant="caption" color="text.secondary">
                Endereço
              </Typography>
            </Box>
          </Divider>
        </Grid>

        <Grid item xs={12} md={8}>
          <TextField
            fullWidth
            size="small"
            label="Endereço"
            value={company.endereco}
            onChange={handleChange('endereco')}
            placeholder="Rua, Avenida, etc."
          />
        </Grid>

        <Grid item xs={12} md={4}>
          <TextField
            fullWidth
            size="small"
            label="Número"
            value={company.numero}
            onChange={handleChange('numero')}
            placeholder="Nº"
          />
        </Grid>

        <Grid item xs={12} md={4}>
          <TextField
            fullWidth
            size="small"
            label="Bairro"
            value={company.bairro}
            onChange={handleChange('bairro')}
          />
        </Grid>

        <Grid item xs={12} md={4}>
          <TextField
            fullWidth
            required
            size="small"
            label="Cidade"
            value={company.cidade}
            onChange={handleChange('cidade')}
          />
        </Grid>

        <Grid item xs={6} md={2}>
          <TextField
            fullWidth
            required
            size="small"
            label="UF"
            value={company.uf}
            onChange={handleChange('uf')}
            placeholder="SP"
            inputProps={{ maxLength: 2 }}
            select
            SelectProps={{ native: true }}
          >
            <option value=""></option>
            {UF_OPTIONS.map((uf) => (
              <option key={uf} value={uf}>
                {uf}
              </option>
            ))}
          </TextField>
        </Grid>

        <Grid item xs={6} md={2}>
          <TextField
            fullWidth
            size="small"
            label="CEP"
            value={company.cep}
            onChange={handleChange('cep')}
            placeholder="00000-000"
            inputProps={{ maxLength: 9 }}
          />
        </Grid>

        {/* Contact Section */}
        <Grid item xs={12}>
          <Divider textAlign="left" sx={{ mt: 2, mb: 2 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
              <Phone fontSize="small" color="action" />
              <Typography variant="caption" color="text.secondary">
                Contato
              </Typography>
            </Box>
          </Divider>
        </Grid>

        <Grid item xs={12} md={6}>
          <TextField
            fullWidth
            size="small"
            label="Telefone"
            value={company.telefone}
            onChange={handleChange('telefone')}
            placeholder="(00) 00000-0000"
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <Phone fontSize="small" color="action" />
                </InputAdornment>
              ),
            }}
          />
        </Grid>

        <Grid item xs={12} md={6}>
          <TextField
            fullWidth
            size="small"
            label="E-mail"
            type="email"
            value={company.email}
            onChange={handleChange('email')}
            placeholder="empresa@email.com"
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <Email fontSize="small" color="action" />
                </InputAdornment>
              ),
            }}
          />
        </Grid>
      </Grid>

      <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 2 }}>
        * Campos obrigatórios. Você poderá alterar estas informações posteriormente em
        Configurações → Empresa.
      </Typography>
    </Box>
  );
}

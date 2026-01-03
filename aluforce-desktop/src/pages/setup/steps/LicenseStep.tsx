import {
  Box,
  Typography,
  FormControlLabel,
  Checkbox,
  Paper,
} from '@mui/material';
import { Gavel } from '@mui/icons-material';

interface LicenseStepProps {
  accepted: boolean;
  onAcceptChange: (accepted: boolean) => void;
}

const licenseText = `CONTRATO DE LICENÇA DE USO DO SOFTWARE ALUFORCE

IMPORTANTE: LEIA ATENTAMENTE ESTE CONTRATO DE LICENÇA ANTES DE INSTALAR OU USAR O SOFTWARE.

1. CONCESSÃO DE LICENÇA
Este Contrato de Licença ("Licença") é um acordo legal entre você (pessoa física ou jurídica) e ALUFORCE para o uso do software ALUFORCE Desktop ("Software").

Ao instalar, copiar ou usar o Software, você concorda em vincular-se aos termos desta Licença. Se você não concordar com os termos desta Licença, não instale ou use o Software.

2. DIREITOS DE USO
Sujeito aos termos e condições desta Licença, a ALUFORCE concede a você uma licença não exclusiva e intransferível para:
a) Instalar e usar o Software em um único computador;
b) Fazer uma cópia de backup do Software;
c) Usar o Software para fins comerciais legítimos de gestão empresarial.

3. RESTRIÇÕES
Você não pode:
a) Sublicenciar, vender, revender ou transferir o Software;
b) Modificar, adaptar, traduzir ou criar trabalhos derivados do Software;
c) Fazer engenharia reversa, descompilar ou desmontar o Software;
d) Remover avisos de direitos autorais ou outras marcas proprietárias;
e) Usar o Software para fins ilegais ou não autorizados.

4. PROPRIEDADE INTELECTUAL
O Software é protegido por leis de direitos autorais e tratados internacionais. A ALUFORCE ou seus licenciadores retêm todos os direitos, títulos e interesses sobre o Software.

5. DADOS E PRIVACIDADE
O Software armazena dados localmente em seu computador. Você é responsável por:
a) Fazer backup regular dos seus dados;
b) Manter a segurança de acesso ao sistema;
c) Cumprir com as leis de proteção de dados aplicáveis (LGPD).

6. GARANTIA LIMITADA
O Software é fornecido "como está". A ALUFORCE não garante que o Software atenderá às suas necessidades específicas ou que operará sem interrupções ou erros.

7. LIMITAÇÃO DE RESPONSABILIDADE
Em nenhuma circunstância a ALUFORCE será responsável por danos indiretos, incidentais, especiais ou consequentes decorrentes do uso ou incapacidade de uso do Software.

8. SUPORTE E ATUALIZAÇÕES
A ALUFORCE fornecerá suporte técnico e atualizações de acordo com o plano de suporte contratado. Atualizações podem incluir correções de bugs e novas funcionalidades.

9. RESCISÃO
Esta Licença é efetiva até ser rescindida. A ALUFORCE pode rescindir esta Licença se você não cumprir com qualquer termo. Após a rescisão, você deve destruir todas as cópias do Software.

10. DISPOSIÇÕES GERAIS
a) Este Contrato constitui o acordo integral entre as partes;
b) Qualquer modificação deve ser feita por escrito;
c) Este Contrato será regido pelas leis do Brasil;
d) Disputas serão resolvidas no foro da comarca de São Paulo/SP.

11. CONTATO
Para questões sobre esta Licença, entre em contato através do e-mail: suporte@aluforce.com.br

Ao clicar em "Aceito os termos da licença", você reconhece que leu e compreendeu este Contrato e concorda em vincular-se a seus termos.

ALUFORCE © 2025 - Todos os direitos reservados.`;

export default function LicenseStep({ accepted, onAcceptChange }: LicenseStepProps) {
  return (
    <Box>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 3 }}>
        <Gavel color="primary" />
        <Typography variant="h6" fontWeight="bold">
          Contrato de Licença de Uso
        </Typography>
      </Box>

      <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
        Por favor, leia atentamente o contrato de licença abaixo antes de prosseguir
        com a instalação.
      </Typography>

      <Paper
        variant="outlined"
        sx={{
          height: 280,
          overflow: 'auto',
          p: 2,
          bgcolor: 'grey.50',
          fontFamily: 'monospace',
          fontSize: '0.75rem',
          lineHeight: 1.6,
          whiteSpace: 'pre-wrap',
          mb: 3,
        }}
      >
        {licenseText}
      </Paper>

      <Box
        sx={{
          p: 2,
          borderRadius: 2,
          bgcolor: accepted ? 'success.50' : 'warning.50',
          border: '2px solid',
          borderColor: accepted ? 'success.main' : 'warning.main',
        }}
      >
        <FormControlLabel
          control={
            <Checkbox
              checked={accepted}
              onChange={(e) => onAcceptChange(e.target.checked)}
              color="success"
              size="medium"
            />
          }
          label={
            <Typography variant="body1" fontWeight="medium">
              Li e aceito os termos do Contrato de Licença de Uso
            </Typography>
          }
        />
      </Box>

      {!accepted && (
        <Typography variant="caption" color="warning.dark" sx={{ display: 'block', mt: 1 }}>
          * Você deve aceitar os termos da licença para continuar a instalação
        </Typography>
      )}
    </Box>
  );
}

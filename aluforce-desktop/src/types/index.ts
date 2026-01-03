// Tipos principais do sistema ALUFORCE

// ===== USUÁRIOS E AUTENTICAÇÃO =====

export interface Usuario {
  id: number;
  nome: string;
  email: string;
  senha_hash?: string;
  cargo: string;
  ativo: boolean;
  criado_em: string;
  atualizado_em: string;
}

export interface LoginCredentials {
  email: string;
  senha: string;
}

export interface AuthResponse {
  usuario: Usuario;
  token?: string;
}

// ===== EMPRESA =====

export interface Empresa {
  id: number;
  razao_social: string;
  nome_fantasia: string;
  cnpj: string;
  inscricao_estadual?: string;
  inscricao_municipal?: string;
  endereco: string;
  numero: string;
  complemento?: string;
  bairro: string;
  cidade: string;
  uf: string;
  cep: string;
  telefone?: string;
  email?: string;
  logo?: string;
  criado_em: string;
  atualizado_em: string;
}

// ===== CLIENTES =====

export interface Cliente {
  id: number;
  tipo_pessoa: 'F' | 'J';
  nome: string;
  razao_social?: string;
  cpf_cnpj: string;
  inscricao_estadual?: string;
  email?: string;
  telefone?: string;
  celular?: string;
  endereco?: string;
  numero?: string;
  complemento?: string;
  bairro?: string;
  cidade?: string;
  uf?: string;
  cep?: string;
  limite_credito: number;
  observacoes?: string;
  ativo: boolean;
  criado_em: string;
  atualizado_em: string;
}

// ===== FORNECEDORES =====

export interface Fornecedor {
  id: number;
  tipo_pessoa: 'F' | 'J';
  nome: string;
  razao_social?: string;
  cpf_cnpj: string;
  inscricao_estadual?: string;
  email?: string;
  telefone?: string;
  celular?: string;
  contato?: string;
  endereco?: string;
  numero?: string;
  complemento?: string;
  bairro?: string;
  cidade?: string;
  uf?: string;
  cep?: string;
  observacoes?: string;
  ativo: boolean;
  criado_em: string;
  atualizado_em: string;
}

// ===== PRODUTOS =====

export interface Produto {
  id: number;
  codigo: string;
  nome: string;
  descricao?: string;
  categoria?: string;
  unidade: string;
  preco_custo: number;
  preco_venda: number;
  margem_lucro: number;
  estoque_atual: number;
  estoque_minimo: number;
  estoque_maximo?: number;
  localizacao?: string;
  ncm?: string;
  cest?: string;
  origem: string;
  peso_bruto?: number;
  peso_liquido?: number;
  ativo: boolean;
  criado_em: string;
  atualizado_em: string;
}

// ===== VENDAS =====

export type StatusPedidoVenda = 'rascunho' | 'pendente' | 'aprovado' | 'faturado' | 'entregue' | 'cancelado';

export interface PedidoVenda {
  id: number;
  numero: string;
  cliente_id: number;
  cliente?: Cliente;
  vendedor_id?: number;
  vendedor?: Usuario;
  data_pedido: string;
  data_entrega?: string;
  status: StatusPedidoVenda;
  subtotal: number;
  desconto: number;
  acrescimo: number;
  total: number;
  observacoes?: string;
  itens?: ItemPedidoVenda[];
  criado_em: string;
  atualizado_em: string;
}

export interface ItemPedidoVenda {
  id: number;
  pedido_id: number;
  produto_id: number;
  produto?: Produto;
  quantidade: number;
  preco_unitario: number;
  desconto: number;
  total: number;
}

// ===== COMPRAS =====

export type StatusPedidoCompra = 'rascunho' | 'pendente' | 'aprovado' | 'recebido' | 'cancelado';

export interface PedidoCompra {
  id: number;
  numero: string;
  fornecedor_id: number;
  fornecedor?: Fornecedor;
  comprador_id?: number;
  comprador?: Usuario;
  data_pedido: string;
  data_previsao?: string;
  data_recebimento?: string;
  status: StatusPedidoCompra;
  subtotal: number;
  desconto: number;
  frete: number;
  outras_despesas: number;
  total: number;
  observacoes?: string;
  itens?: ItemPedidoCompra[];
  criado_em: string;
  atualizado_em: string;
}

export interface ItemPedidoCompra {
  id: number;
  pedido_id: number;
  produto_id: number;
  produto?: Produto;
  quantidade: number;
  quantidade_recebida: number;
  preco_unitario: number;
  desconto: number;
  total: number;
}

// ===== FINANCEIRO =====

export type StatusConta = 'aberta' | 'paga' | 'vencida' | 'cancelada';

export interface ContaPagar {
  id: number;
  descricao: string;
  fornecedor_id?: number;
  fornecedor?: Fornecedor;
  pedido_compra_id?: number;
  nota_fiscal?: string;
  categoria?: string;
  valor: number;
  valor_pago: number;
  data_emissao: string;
  data_vencimento: string;
  data_pagamento?: string;
  conta_bancaria_id?: number;
  forma_pagamento?: string;
  status: StatusConta;
  observacoes?: string;
  criado_em: string;
  atualizado_em: string;
}

export interface ContaReceber {
  id: number;
  descricao: string;
  cliente_id?: number;
  cliente?: Cliente;
  pedido_venda_id?: number;
  nota_fiscal?: string;
  categoria?: string;
  valor: number;
  valor_recebido: number;
  data_emissao: string;
  data_vencimento: string;
  data_recebimento?: string;
  conta_bancaria_id?: number;
  forma_pagamento?: string;
  status: StatusConta;
  observacoes?: string;
  criado_em: string;
  atualizado_em: string;
}

export interface ContaBancaria {
  id: number;
  nome: string;
  banco: string;
  agencia: string;
  conta: string;
  tipo: 'corrente' | 'poupanca' | 'investimento';
  saldo_inicial: number;
  saldo_atual: number;
  ativa: boolean;
  criado_em: string;
  atualizado_em: string;
}

// ===== PCP =====

export type StatusOrdemProducao = 'planejada' | 'aguardando' | 'em_andamento' | 'pausada' | 'concluida' | 'cancelada';

export interface OrdemProducao {
  id: number;
  numero: string;
  produto_id: number;
  produto?: Produto;
  quantidade_planejada: number;
  quantidade_produzida: number;
  data_inicio_planejado: string;
  data_fim_planejado: string;
  data_inicio_real?: string;
  data_fim_real?: string;
  status: StatusOrdemProducao;
  prioridade: 'baixa' | 'normal' | 'alta' | 'urgente';
  responsavel_id?: number;
  responsavel?: Usuario;
  observacoes?: string;
  apontamentos?: ApontamentoProducao[];
  criado_em: string;
  atualizado_em: string;
}

export interface ApontamentoProducao {
  id: number;
  ordem_id: number;
  funcionario_id: number;
  funcionario?: Funcionario;
  data: string;
  hora_inicio: string;
  hora_fim?: string;
  quantidade_produzida: number;
  quantidade_refugo: number;
  observacoes?: string;
  criado_em: string;
}

// ===== RH =====

export interface Funcionario {
  id: number;
  codigo: string;
  nome: string;
  cpf: string;
  rg?: string;
  data_nascimento?: string;
  sexo?: 'M' | 'F';
  estado_civil?: string;
  email?: string;
  telefone?: string;
  celular?: string;
  endereco?: string;
  numero?: string;
  complemento?: string;
  bairro?: string;
  cidade?: string;
  uf?: string;
  cep?: string;
  cargo: string;
  departamento?: string;
  data_admissao: string;
  data_demissao?: string;
  salario: number;
  banco?: string;
  agencia?: string;
  conta?: string;
  pis?: string;
  ctps?: string;
  ativo: boolean;
  criado_em: string;
  atualizado_em: string;
}

export interface RegistroPonto {
  id: number;
  funcionario_id: number;
  funcionario?: Funcionario;
  data: string;
  entrada_1?: string;
  saida_1?: string;
  entrada_2?: string;
  saida_2?: string;
  horas_trabalhadas?: number;
  horas_extras?: number;
  observacoes?: string;
  criado_em: string;
}

export interface Ferias {
  id: number;
  funcionario_id: number;
  funcionario?: Funcionario;
  periodo_aquisitivo_inicio: string;
  periodo_aquisitivo_fim: string;
  data_inicio: string;
  data_fim: string;
  dias_gozados: number;
  dias_abono: number;
  valor?: number;
  status: 'pendente' | 'aprovada' | 'em_gozo' | 'concluida' | 'cancelada';
  observacoes?: string;
  criado_em: string;
  atualizado_em: string;
}

// ===== NFE =====

export type StatusNfe = 'rascunho' | 'validada' | 'autorizada' | 'cancelada' | 'denegada' | 'inutilizada';
export type TipoNfe = 'entrada' | 'saida';

export interface NotaFiscal {
  id: number;
  numero: string;
  serie: string;
  tipo: TipoNfe;
  modelo: '55' | '65';
  chave_acesso?: string;
  protocolo?: string;
  data_emissao: string;
  data_saida_entrada?: string;
  natureza_operacao: string;
  cfop: string;
  cliente_id?: number;
  cliente?: Cliente;
  fornecedor_id?: number;
  fornecedor?: Fornecedor;
  valor_produtos: number;
  valor_frete: number;
  valor_seguro: number;
  valor_desconto: number;
  valor_outras_despesas: number;
  valor_ipi: number;
  valor_icms: number;
  valor_pis: number;
  valor_cofins: number;
  valor_total: number;
  status: StatusNfe;
  xml?: string;
  pdf_danfe?: string;
  observacoes?: string;
  criado_em: string;
  atualizado_em: string;
}

// ===== CONFIGURAÇÕES =====

export interface Configuracao {
  chave: string;
  valor: string;
  descricao?: string;
}

// ===== PAGINAÇÃO E FILTROS =====

export interface PaginationParams {
  page: number;
  limit: number;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface SortParams {
  field: string;
  order: 'asc' | 'desc';
}

// ===== API RESPONSE =====

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

// ===== DASHBOARD =====

export interface DashboardStats {
  totalClientes: number;
  totalProdutos: number;
  totalPedidosVenda: number;
  totalPedidosCompra: number;
  vendasMes: number;
  comprasMes: number;
  contasReceberVencidas: number;
  contasPagarVencidas: number;
  ordensProducaoAtivas: number;
  funcionariosAtivos: number;
}

export interface VendasDashboardStats {
  totalPedidos: number;
  pedidosPendentes: number;
  pedidosFaturados: number;
  valorTotalMes: number;
  ticketMedio: number;
  topClientes: { cliente: string; valor: number }[];
  topProdutos: { produto: string; quantidade: number }[];
  vendasPorDia: { data: string; valor: number }[];
}

export interface FinanceiroDashboardStats {
  saldoTotal: number;
  totalReceber: number;
  totalPagar: number;
  receberVencido: number;
  pagarVencido: number;
  receberHoje: number;
  pagarHoje: number;
  fluxoCaixa: { data: string; entradas: number; saidas: number }[];
}

export interface PcpDashboardStats {
  ordensTotal: number;
  ordensEmAndamento: number;
  ordensConcluidas: number;
  ordensAtrasadas: number;
  producaoMes: number;
  eficiencia: number;
}

export interface RhDashboardStats {
  totalFuncionarios: number;
  funcionariosAtivos: number;
  funcionariosFerias: number;
  horasTrabalhadasMes: number;
  horasExtrasMes: number;
  feriasProximas: Ferias[];
  aniversariantesMes: Funcionario[];
}

export interface NfeDashboardStats {
  totalNotas: number;
  notasAutorizadas: number;
  notasCanceladas: number;
  valorTotalMes: number;
  ultimasNotas: NotaFiscal[];
}

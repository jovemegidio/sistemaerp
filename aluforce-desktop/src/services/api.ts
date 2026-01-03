import { invoke } from '@tauri-apps/api/core';
import type {
  Usuario,
  Cliente,
  Fornecedor,
  Produto,
  PedidoVenda,
  PedidoCompra,
  ContaPagar,
  ContaReceber,
  ContaBancaria,
  OrdemProducao,
  Funcionario,
  NotaFiscal,
  Empresa,
  Configuracao,
  PaginatedResponse,
} from '@/types';

// ===== AUTENTICAÇÃO =====

export const authApi = {
  login: (email: string, senha: string) =>
    invoke<Usuario>('login', { email, senha }),

  validateSession: (userId: number) =>
    invoke<boolean>('validate_session', { userId }),

  changePassword: (userId: number, senhaAtual: string, novaSenha: string) =>
    invoke<boolean>('change_password', { userId, senhaAtual, novaSenha }),

  logout: () => invoke<void>('logout'),
};

// ===== CLIENTES =====

export const clientesApi = {
  list: (page?: number, limit?: number, search?: string) =>
    invoke<PaginatedResponse<Cliente>>('list_clientes', { page, limit, search }),

  get: (id: number) =>
    invoke<Cliente>('get_cliente', { id }),

  create: (cliente: Omit<Cliente, 'id' | 'criado_em' | 'atualizado_em'>) =>
    invoke<Cliente>('create_cliente', { cliente }),

  update: (id: number, cliente: Partial<Cliente>) =>
    invoke<Cliente>('update_cliente', { id, cliente }),

  delete: (id: number) =>
    invoke<boolean>('delete_cliente', { id }),
};

// ===== FORNECEDORES =====

export const fornecedoresApi = {
  list: (page?: number, limit?: number, search?: string) =>
    invoke<PaginatedResponse<Fornecedor>>('list_fornecedores', { page, limit, search }),

  get: (id: number) =>
    invoke<Fornecedor>('get_fornecedor', { id }),

  create: (fornecedor: Omit<Fornecedor, 'id' | 'criado_em' | 'atualizado_em'>) =>
    invoke<Fornecedor>('create_fornecedor', { fornecedor }),

  update: (id: number, fornecedor: Partial<Fornecedor>) =>
    invoke<Fornecedor>('update_fornecedor', { id, fornecedor }),

  delete: (id: number) =>
    invoke<boolean>('delete_fornecedor', { id }),
};

// ===== PRODUTOS =====

export const produtosApi = {
  list: (page?: number, limit?: number, search?: string, categoria?: string) =>
    invoke<PaginatedResponse<Produto>>('list_produtos', { page, limit, search, categoria }),

  get: (id: number) =>
    invoke<Produto>('get_produto', { id }),

  create: (produto: Omit<Produto, 'id' | 'criado_em' | 'atualizado_em'>) =>
    invoke<Produto>('create_produto', { produto }),

  update: (id: number, produto: Partial<Produto>) =>
    invoke<Produto>('update_produto', { id, produto }),

  delete: (id: number) =>
    invoke<boolean>('delete_produto', { id }),

  updateEstoque: (id: number, quantidade: number, tipo: 'entrada' | 'saida') =>
    invoke<Produto>('update_estoque', { id, quantidade, tipo }),

  getCategorias: () =>
    invoke<string[]>('get_categorias'),

  getProdutosBaixoEstoque: () =>
    invoke<Produto[]>('get_produtos_baixo_estoque'),
};

// ===== PEDIDOS DE VENDA =====

export const pedidosVendaApi = {
  list: (page?: number, limit?: number, status?: string, clienteId?: number) =>
    invoke<PaginatedResponse<PedidoVenda>>('list_pedidos_venda', { page, limit, status, clienteId }),

  get: (id: number) =>
    invoke<PedidoVenda>('get_pedido_venda', { id }),

  create: (pedido: Omit<PedidoVenda, 'id' | 'numero' | 'criado_em' | 'atualizado_em'>) =>
    invoke<PedidoVenda>('create_pedido_venda', { pedido }),

  update: (id: number, pedido: Partial<PedidoVenda>) =>
    invoke<PedidoVenda>('update_pedido_venda', { id, pedido }),

  delete: (id: number) =>
    invoke<boolean>('delete_pedido_venda', { id }),

  updateStatus: (id: number, status: string) =>
    invoke<PedidoVenda>('update_status_pedido_venda', { id, status }),

  getDashboard: () =>
    invoke<{
      totalPedidos: number;
      pedidosPendentes: number;
      valorTotal: number;
    }>('get_vendas_dashboard'),
};

// ===== PEDIDOS DE COMPRA =====

export const pedidosCompraApi = {
  list: (page?: number, limit?: number, status?: string, fornecedorId?: number) =>
    invoke<PaginatedResponse<PedidoCompra>>('list_pedidos_compra', { page, limit, status, fornecedorId }),

  get: (id: number) =>
    invoke<PedidoCompra>('get_pedido_compra', { id }),

  create: (pedido: Omit<PedidoCompra, 'id' | 'numero' | 'criado_em' | 'atualizado_em'>) =>
    invoke<PedidoCompra>('create_pedido_compra', { pedido }),

  update: (id: number, pedido: Partial<PedidoCompra>) =>
    invoke<PedidoCompra>('update_pedido_compra', { id, pedido }),

  delete: (id: number) =>
    invoke<boolean>('delete_pedido_compra', { id }),

  receber: (id: number, itensRecebidos: { itemId: number; quantidade: number }[]) =>
    invoke<PedidoCompra>('receber_pedido_compra', { id, itensRecebidos }),
};

// ===== CONTAS A PAGAR =====

export const contasPagarApi = {
  list: (page?: number, limit?: number, status?: string, fornecedorId?: number) =>
    invoke<PaginatedResponse<ContaPagar>>('list_contas_pagar', { page, limit, status, fornecedorId }),

  get: (id: number) =>
    invoke<ContaPagar>('get_conta_pagar', { id }),

  create: (conta: Omit<ContaPagar, 'id' | 'criado_em' | 'atualizado_em'>) =>
    invoke<ContaPagar>('create_conta_pagar', { conta }),

  update: (id: number, conta: Partial<ContaPagar>) =>
    invoke<ContaPagar>('update_conta_pagar', { id, conta }),

  delete: (id: number) =>
    invoke<boolean>('delete_conta_pagar', { id }),

  pagar: (id: number, valor: number, contaBancariaId?: number) =>
    invoke<ContaPagar>('pagar_conta', { id, valor, contaBancariaId }),

  getVencidas: () =>
    invoke<ContaPagar[]>('get_contas_pagar_vencidas'),
};

// ===== CONTAS A RECEBER =====

export const contasReceberApi = {
  list: (page?: number, limit?: number, status?: string, clienteId?: number) =>
    invoke<PaginatedResponse<ContaReceber>>('list_contas_receber', { page, limit, status, clienteId }),

  get: (id: number) =>
    invoke<ContaReceber>('get_conta_receber', { id }),

  create: (conta: Omit<ContaReceber, 'id' | 'criado_em' | 'atualizado_em'>) =>
    invoke<ContaReceber>('create_conta_receber', { conta }),

  update: (id: number, conta: Partial<ContaReceber>) =>
    invoke<ContaReceber>('update_conta_receber', { id, conta }),

  delete: (id: number) =>
    invoke<boolean>('delete_conta_receber', { id }),

  receber: (id: number, valor: number, contaBancariaId?: number) =>
    invoke<ContaReceber>('receber_conta', { id, valor, contaBancariaId }),

  getVencidas: () =>
    invoke<ContaReceber[]>('get_contas_receber_vencidas'),
};

// ===== CONTAS BANCÁRIAS =====

export const contasBancariasApi = {
  list: () =>
    invoke<ContaBancaria[]>('list_contas_bancarias'),

  get: (id: number) =>
    invoke<ContaBancaria>('get_conta_bancaria', { id }),

  create: (conta: Omit<ContaBancaria, 'id' | 'saldo_atual' | 'criado_em' | 'atualizado_em'>) =>
    invoke<ContaBancaria>('create_conta_bancaria', { conta }),

  update: (id: number, conta: Partial<ContaBancaria>) =>
    invoke<ContaBancaria>('update_conta_bancaria', { id, conta }),

  delete: (id: number) =>
    invoke<boolean>('delete_conta_bancaria', { id }),

  getSaldoTotal: () =>
    invoke<number>('get_saldo_total'),
};

// ===== ORDENS DE PRODUÇÃO =====

export const ordensProducaoApi = {
  list: (page?: number, limit?: number, status?: string) =>
    invoke<PaginatedResponse<OrdemProducao>>('list_ordens_producao', { page, limit, status }),

  get: (id: number) =>
    invoke<OrdemProducao>('get_ordem_producao', { id }),

  create: (ordem: Omit<OrdemProducao, 'id' | 'numero' | 'criado_em' | 'atualizado_em'>) =>
    invoke<OrdemProducao>('create_ordem_producao', { ordem }),

  update: (id: number, ordem: Partial<OrdemProducao>) =>
    invoke<OrdemProducao>('update_ordem_producao', { id, ordem }),

  delete: (id: number) =>
    invoke<boolean>('delete_ordem_producao', { id }),

  iniciar: (id: number) =>
    invoke<OrdemProducao>('iniciar_ordem_producao', { id }),

  pausar: (id: number) =>
    invoke<OrdemProducao>('pausar_ordem_producao', { id }),

  retomar: (id: number) =>
    invoke<OrdemProducao>('retomar_ordem_producao', { id }),

  concluir: (id: number) =>
    invoke<OrdemProducao>('concluir_ordem_producao', { id }),

  apontar: (id: number, apontamento: {
    funcionarioId: number;
    quantidade: number;
    quantidadeRefugo?: number;
    observacoes?: string;
  }) =>
    invoke<OrdemProducao>('apontar_producao', { id, apontamento }),
};

// ===== FUNCIONÁRIOS =====

export const funcionariosApi = {
  list: (page?: number, limit?: number, search?: string, departamento?: string) =>
    invoke<PaginatedResponse<Funcionario>>('list_funcionarios', { page, limit, search, departamento }),

  get: (id: number) =>
    invoke<Funcionario>('get_funcionario', { id }),

  create: (funcionario: Omit<Funcionario, 'id' | 'criado_em' | 'atualizado_em'>) =>
    invoke<Funcionario>('create_funcionario', { funcionario }),

  update: (id: number, funcionario: Partial<Funcionario>) =>
    invoke<Funcionario>('update_funcionario', { id, funcionario }),

  delete: (id: number) =>
    invoke<boolean>('delete_funcionario', { id }),

  getDepartamentos: () =>
    invoke<string[]>('get_departamentos'),

  getCargos: () =>
    invoke<string[]>('get_cargos'),
};

// ===== PONTO ELETRÔNICO =====

export const pontoApi = {
  registrar: (funcionarioId: number, tipo: 'entrada' | 'saida') =>
    invoke<{ sucesso: boolean; hora: string }>('registrar_ponto', { funcionarioId, tipo }),

  list: (funcionarioId?: number, dataInicio?: string, dataFim?: string) =>
    invoke<{ data: string; entrada1: string; saida1: string; entrada2: string; saida2: string }[]>(
      'list_registros_ponto',
      { funcionarioId, dataInicio, dataFim }
    ),

  getResumo: (funcionarioId: number, mes: number, ano: number) =>
    invoke<{
      horasTrabalhadas: number;
      horasExtras: number;
      faltas: number;
      atrasos: number;
    }>('get_resumo_ponto', { funcionarioId, mes, ano }),
};

// ===== FÉRIAS =====

export const feriasApi = {
  list: (funcionarioId?: number, status?: string) =>
    invoke<{ id: number; funcionario: string; inicio: string; fim: string; status: string }[]>(
      'list_ferias',
      { funcionarioId, status }
    ),

  solicitar: (funcionarioId: number, dataInicio: string, dataFim: string, diasAbono?: number) =>
    invoke<boolean>('solicitar_ferias', { funcionarioId, dataInicio, dataFim, diasAbono }),

  aprovar: (id: number) =>
    invoke<boolean>('aprovar_ferias', { id }),

  cancelar: (id: number, motivo?: string) =>
    invoke<boolean>('cancelar_ferias', { id, motivo }),
};

// ===== NOTAS FISCAIS =====

export const notasFiscaisApi = {
  list: (page?: number, limit?: number, tipo?: string, status?: string) =>
    invoke<PaginatedResponse<NotaFiscal>>('list_notas_fiscais', { page, limit, tipo, status }),

  get: (id: number) =>
    invoke<NotaFiscal>('get_nota_fiscal', { id }),

  create: (nota: Omit<NotaFiscal, 'id' | 'numero' | 'chave_acesso' | 'protocolo' | 'criado_em' | 'atualizado_em'>) =>
    invoke<NotaFiscal>('create_nota_fiscal', { nota }),

  emitir: (id: number) =>
    invoke<{ sucesso: boolean; protocolo: string; chaveAcesso: string }>('emitir_nota_fiscal', { id }),

  cancelar: (id: number, justificativa: string) =>
    invoke<{ sucesso: boolean; protocolo: string }>('cancelar_nota_fiscal', { id, justificativa }),

  consultar: (chaveAcesso: string) =>
    invoke<{ status: string; descricao: string }>('consultar_nota_fiscal', { chaveAcesso }),

  importarXml: (xmlContent: string) =>
    invoke<NotaFiscal>('importar_xml_nfe', { xmlContent }),

  baixarPdf: (id: number) =>
    invoke<string>('baixar_danfe', { id }),

  baixarXml: (id: number) =>
    invoke<string>('baixar_xml_nfe', { id }),
};

// ===== EMPRESA =====

export const empresaApi = {
  get: () =>
    invoke<Empresa>('get_empresa'),

  update: (empresa: Partial<Empresa>) =>
    invoke<Empresa>('update_empresa', { empresa }),
};

// ===== CONFIGURAÇÕES =====

export const configuracoesApi = {
  get: (chave: string) =>
    invoke<string>('get_configuracao', { chave }),

  set: (chave: string, valor: string) =>
    invoke<boolean>('set_configuracao', { chave, valor }),

  list: () =>
    invoke<Configuracao[]>('list_configuracoes'),
};

// ===== BACKUP =====

export const backupApi = {
  criar: (destino?: string) =>
    invoke<string>('criar_backup', { destino }),

  restaurar: (arquivo: string) =>
    invoke<boolean>('restaurar_backup', { arquivo }),

  listar: () =>
    invoke<{ nome: string; data: string; tamanho: number }[]>('listar_backups'),
};

// ===== DASHBOARD =====

export const dashboardApi = {
  getStats: () =>
    invoke<{
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
    }>('get_dashboard_stats'),

  getAlertas: () =>
    invoke<{ tipo: string; mensagem: string; prioridade: string }[]>('get_alertas'),
};

// ===== USUÁRIOS =====

export const usuariosApi = {
  list: () =>
    invoke<Usuario[]>('list_usuarios'),

  get: (id: number) =>
    invoke<Usuario>('get_usuario', { id }),

  create: (usuario: Omit<Usuario, 'id' | 'criado_em' | 'atualizado_em'>) =>
    invoke<Usuario>('create_usuario', { usuario }),

  update: (id: number, usuario: Partial<Usuario>) =>
    invoke<Usuario>('update_usuario', { id, usuario }),

  delete: (id: number) =>
    invoke<boolean>('delete_usuario', { id }),

  resetPassword: (id: number) =>
    invoke<string>('reset_password_usuario', { id }),
};

//! Modelos de dados da aplicação

use serde::{Deserialize, Serialize};
use chrono::{DateTime, Utc};

/// Usuário do sistema
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Usuario {
    pub id: i64,
    pub nome: String,
    pub email: String,
    #[serde(skip_serializing)]
    pub senha_hash: String,
    pub cargo: Option<String>,
    pub departamento: Option<String>,
    pub avatar: Option<String>,
    pub ativo: bool,
    pub permissoes: serde_json::Value,
    pub ultimo_acesso: Option<String>,
    pub created_at: String,
    pub updated_at: String,
}

/// Dados para login
#[derive(Debug, Deserialize)]
pub struct LoginRequest {
    pub email: String,
    pub senha: String,
}

/// Resposta de login
#[derive(Debug, Serialize)]
pub struct LoginResponse {
    pub success: bool,
    pub token: Option<String>,
    pub usuario: Option<UsuarioPublico>,
    pub message: Option<String>,
}

/// Dados públicos do usuário (sem senha)
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct UsuarioPublico {
    pub id: i64,
    pub nome: String,
    pub email: String,
    pub cargo: Option<String>,
    pub departamento: Option<String>,
    pub avatar: Option<String>,
    pub permissoes: serde_json::Value,
}

impl From<Usuario> for UsuarioPublico {
    fn from(u: Usuario) -> Self {
        Self {
            id: u.id,
            nome: u.nome,
            email: u.email,
            cargo: u.cargo,
            departamento: u.departamento,
            avatar: u.avatar,
            permissoes: u.permissoes,
        }
    }
}

/// Empresa
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Empresa {
    pub id: i64,
    pub razao_social: String,
    pub nome_fantasia: Option<String>,
    pub cnpj: Option<String>,
    pub inscricao_estadual: Option<String>,
    pub inscricao_municipal: Option<String>,
    pub telefone: Option<String>,
    pub email: Option<String>,
    pub cep: Option<String>,
    pub endereco: Option<String>,
    pub numero: Option<String>,
    pub complemento: Option<String>,
    pub bairro: Option<String>,
    pub cidade: Option<String>,
    pub estado: Option<String>,
    pub logo_path: Option<String>,
}

/// Cliente
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Cliente {
    pub id: i64,
    pub nome: String,
    pub razao_social: Option<String>,
    pub nome_fantasia: Option<String>,
    pub cnpj: Option<String>,
    pub cpf: Option<String>,
    pub inscricao_estadual: Option<String>,
    pub inscricao_municipal: Option<String>,
    pub email: Option<String>,
    pub telefone: Option<String>,
    pub celular: Option<String>,
    pub cep: Option<String>,
    pub endereco: Option<String>,
    pub numero: Option<String>,
    pub complemento: Option<String>,
    pub bairro: Option<String>,
    pub cidade: Option<String>,
    pub estado: Option<String>,
    pub observacoes: Option<String>,
    pub limite_credito: f64,
    pub vendedor_id: Option<i64>,
    pub ativo: bool,
    pub created_at: String,
    pub updated_at: String,
}

/// Dados para criar/atualizar cliente
#[derive(Debug, Deserialize)]
pub struct ClienteInput {
    pub nome: String,
    pub razao_social: Option<String>,
    pub nome_fantasia: Option<String>,
    pub cnpj: Option<String>,
    pub cpf: Option<String>,
    pub inscricao_estadual: Option<String>,
    pub inscricao_municipal: Option<String>,
    pub email: Option<String>,
    pub telefone: Option<String>,
    pub celular: Option<String>,
    pub cep: Option<String>,
    pub endereco: Option<String>,
    pub numero: Option<String>,
    pub complemento: Option<String>,
    pub bairro: Option<String>,
    pub cidade: Option<String>,
    pub estado: Option<String>,
    pub observacoes: Option<String>,
    pub limite_credito: Option<f64>,
    pub vendedor_id: Option<i64>,
}

/// Fornecedor
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Fornecedor {
    pub id: i64,
    pub nome: String,
    pub razao_social: Option<String>,
    pub nome_fantasia: Option<String>,
    pub cnpj: Option<String>,
    pub cpf: Option<String>,
    pub inscricao_estadual: Option<String>,
    pub email: Option<String>,
    pub telefone: Option<String>,
    pub cep: Option<String>,
    pub endereco: Option<String>,
    pub numero: Option<String>,
    pub bairro: Option<String>,
    pub cidade: Option<String>,
    pub estado: Option<String>,
    pub observacoes: Option<String>,
    pub ativo: bool,
    pub created_at: String,
    pub updated_at: String,
}

/// Produto
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Produto {
    pub id: i64,
    pub codigo: Option<String>,
    pub nome: String,
    pub descricao: Option<String>,
    pub categoria: Option<String>,
    pub unidade: String,
    pub preco_custo: f64,
    pub preco_venda: f64,
    pub margem: f64,
    pub estoque_minimo: f64,
    pub estoque_atual: f64,
    pub ncm: Option<String>,
    pub cest: Option<String>,
    pub origem: Option<String>,
    pub cfop: Option<String>,
    pub cst_icms: Option<String>,
    pub cst_pis: Option<String>,
    pub cst_cofins: Option<String>,
    pub ativo: bool,
    pub created_at: String,
    pub updated_at: String,
}

/// Pedido de Venda
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PedidoVenda {
    pub id: i64,
    pub numero: String,
    pub cliente_id: Option<i64>,
    pub cliente_nome: Option<String>,
    pub vendedor_id: Option<i64>,
    pub vendedor_nome: Option<String>,
    pub data_pedido: String,
    pub data_entrega: Option<String>,
    pub status: String,
    pub subtotal: f64,
    pub desconto: f64,
    pub acrescimo: f64,
    pub total: f64,
    pub forma_pagamento: Option<String>,
    pub condicao_pagamento: Option<String>,
    pub observacoes: Option<String>,
    pub itens: Vec<PedidoItem>,
    pub created_at: String,
    pub updated_at: String,
}

/// Item de Pedido
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PedidoItem {
    pub id: i64,
    pub pedido_id: i64,
    pub produto_id: i64,
    pub produto_nome: Option<String>,
    pub quantidade: f64,
    pub preco_unitario: f64,
    pub desconto: f64,
    pub total: f64,
}

/// Conta a Pagar
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ContaPagar {
    pub id: i64,
    pub descricao: String,
    pub fornecedor_id: Option<i64>,
    pub fornecedor_nome: Option<String>,
    pub valor: f64,
    pub data_vencimento: String,
    pub data_pagamento: Option<String>,
    pub status: String,
    pub categoria: Option<String>,
    pub forma_pagamento: Option<String>,
    pub observacoes: Option<String>,
    pub created_at: String,
    pub updated_at: String,
}

/// Conta a Receber
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ContaReceber {
    pub id: i64,
    pub descricao: String,
    pub cliente_id: Option<i64>,
    pub cliente_nome: Option<String>,
    pub pedido_id: Option<i64>,
    pub valor: f64,
    pub data_vencimento: String,
    pub data_recebimento: Option<String>,
    pub status: String,
    pub categoria: Option<String>,
    pub forma_recebimento: Option<String>,
    pub observacoes: Option<String>,
    pub created_at: String,
    pub updated_at: String,
}

/// Conta Bancária
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ContaBancaria {
    pub id: i64,
    pub nome: String,
    pub banco: Option<String>,
    pub agencia: Option<String>,
    pub conta: Option<String>,
    pub tipo: String,
    pub saldo_inicial: f64,
    pub saldo_atual: f64,
    pub ativo: bool,
}

/// Funcionário
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Funcionario {
    pub id: i64,
    pub usuario_id: Option<i64>,
    pub nome: String,
    pub cpf: Option<String>,
    pub rg: Option<String>,
    pub data_nascimento: Option<String>,
    pub data_admissao: Option<String>,
    pub data_demissao: Option<String>,
    pub cargo: Option<String>,
    pub departamento: Option<String>,
    pub salario: f64,
    pub email: Option<String>,
    pub telefone: Option<String>,
    pub cep: Option<String>,
    pub endereco: Option<String>,
    pub numero: Option<String>,
    pub bairro: Option<String>,
    pub cidade: Option<String>,
    pub estado: Option<String>,
    pub ativo: bool,
}

/// Registro de Ponto
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct RegistroPonto {
    pub id: i64,
    pub funcionario_id: i64,
    pub funcionario_nome: Option<String>,
    pub data: String,
    pub entrada: Option<String>,
    pub saida_almoco: Option<String>,
    pub retorno_almoco: Option<String>,
    pub saida: Option<String>,
    pub horas_trabalhadas: f64,
    pub observacoes: Option<String>,
}

/// Ordem de Produção
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct OrdemProducao {
    pub id: i64,
    pub numero: String,
    pub produto_id: Option<i64>,
    pub produto_nome: Option<String>,
    pub quantidade: f64,
    pub data_inicio: Option<String>,
    pub data_prevista: Option<String>,
    pub data_conclusao: Option<String>,
    pub status: String,
    pub prioridade: String,
    pub responsavel_id: Option<i64>,
    pub responsavel_nome: Option<String>,
    pub observacoes: Option<String>,
}

/// Nota Fiscal
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct NotaFiscal {
    pub id: i64,
    pub numero: Option<String>,
    pub serie: Option<String>,
    pub chave: Option<String>,
    pub tipo: String,
    pub natureza_operacao: Option<String>,
    pub data_emissao: String,
    pub data_saida: Option<String>,
    pub cliente_id: Option<i64>,
    pub cliente_nome: Option<String>,
    pub fornecedor_id: Option<i64>,
    pub pedido_id: Option<i64>,
    pub valor_produtos: f64,
    pub valor_frete: f64,
    pub valor_seguro: f64,
    pub valor_desconto: f64,
    pub valor_total: f64,
    pub status: String,
    pub protocolo: Option<String>,
    pub observacoes: Option<String>,
}

/// Dashboard de Vendas
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DashboardVendas {
    pub total_vendas_mes: f64,
    pub total_pedidos_mes: i64,
    pub ticket_medio: f64,
    pub vendas_por_vendedor: Vec<VendasPorVendedor>,
    pub vendas_por_dia: Vec<VendasPorDia>,
    pub top_produtos: Vec<TopProduto>,
    pub top_clientes: Vec<TopCliente>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct VendasPorVendedor {
    pub vendedor: String,
    pub total: f64,
    pub quantidade: i64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct VendasPorDia {
    pub data: String,
    pub total: f64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TopProduto {
    pub produto: String,
    pub quantidade: f64,
    pub total: f64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TopCliente {
    pub cliente: String,
    pub total: f64,
    pub pedidos: i64,
}

/// Dashboard Financeiro
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DashboardFinanceiro {
    pub saldo_total: f64,
    pub a_receber: f64,
    pub a_pagar: f64,
    pub recebido_mes: f64,
    pub pago_mes: f64,
    pub vencidas: i64,
    pub vencer_hoje: i64,
    pub fluxo_caixa: Vec<FluxoCaixaDia>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct FluxoCaixaDia {
    pub data: String,
    pub entradas: f64,
    pub saidas: f64,
    pub saldo: f64,
}

/// Informações do App
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AppInfo {
    pub name: String,
    pub version: String,
    pub tauri_version: String,
    pub os: String,
    pub arch: String,
}

/// Configuração
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Config {
    pub chave: String,
    pub valor: serde_json::Value,
}

/// Resposta paginada
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PaginatedResponse<T> {
    pub data: Vec<T>,
    pub total: i64,
    pub page: i64,
    pub per_page: i64,
    pub total_pages: i64,
}

impl<T> PaginatedResponse<T> {
    pub fn new(data: Vec<T>, total: i64, page: i64, per_page: i64) -> Self {
        let total_pages = (total as f64 / per_page as f64).ceil() as i64;
        Self {
            data,
            total,
            page,
            per_page,
            total_pages,
        }
    }
}

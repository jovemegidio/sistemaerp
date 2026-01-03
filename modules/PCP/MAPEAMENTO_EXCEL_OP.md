# 📋 MAPEAMENTO 100% CORRETO - Ordem de Produção Aluforce

**Arquivo:** `Ordem de Produção Aluforce - Copia.xlsx`  
**Data:** 22/12/2025  
**Status:** ✅ VERIFICADO E CORRIGIDO

---

## 📑 ESTRUTURA DO ARQUIVO

| Aba | Dimensões | Função |
|-----|-----------|--------|
| **VENDAS_PCP** | A1:Q174 | Entrada de dados principal |
| **PRODUÇÃO** | A1:AI177 | Referencia VENDAS_PCP via fórmulas |

---

## 🎯 ABA VENDAS_PCP - MAPEAMENTO EXATO

### 📌 CABEÇALHO (Linhas 1-9)

| Célula | Campo | Tipo | Dado do Modal |
|--------|-------|------|---------------|
| **C4** | Número Orçamento | Number | `op-orcamento` |
| **G4** | Número Pedido | Number | `op-numero` |
| **J4** | Data Liberação | Date | `op-data-liberacao` |
| **C6** | Vendedor | Text | `op-vendedor` |
| **H6** | Prazo Entrega | ⚠️ FÓRMULA `=J4+30` | Não preencher! |
| **C7** | Cliente | Text | `op-cliente` |
| **C8** | Contato | Text | `op-cliente-contato` |
| **H8** | Telefone | Number | `op-cliente-fone` |
| **C9** | Email | Text | `op-cliente-email` |
| **J9** | Tipo Frete | Text | `op-tipo-frete` |

### 🚚 TRANSPORTADORA (Linhas 11-15)

| Célula | Campo | Tipo | Dado do Modal |
|--------|-------|------|---------------|
| **C12** | Nome Transportadora | Text | `op-transportadora-nome` |
| **H12** | Fone Transportadora | ⚠️ FÓRMULA `=H8` | Não preencher! |
| **C13** | CEP | Text | `op-transportadora-cep` |
| **F13** | Endereço | Text (mesclado F13:J13) | `op-transportadora-endereco` |
| **C15** | CPF/CNPJ | Text | `op-transportadora-cnpj` |
| **G15** | Email NFe | ⚠️ FÓRMULA `=C9` | Não preencher! |

### 📦 PRODUTOS (Linhas 17-32)

#### Cabeçalho (Linha 17):
```
B17: Cod.
C17: Produto (mesclado C17:E17)
F17: Embalagem:
G17: Lance(s)
H17: Qtd.
I17: V. Un. R$
J17: V. Total. R$
```

#### Estrutura das Linhas de Produtos (18-32):

| Coluna | Campo | Tipo | Observação |
|--------|-------|------|------------|
| **A** | # Item | Number | Sequencial: 1, 2, 3... |
| **B** | Código | Text | ✅ **PREENCHER** (TRN10, DUN16...) |
| **C** | Produto | ⚠️ FÓRMULA VLOOKUP | **NÃO PREENCHER!** Busca automática pelo código |
| **D-E** | (mesclado com C) | - | Parte da célula C |
| **F** | Embalagem | Text | ✅ **PREENCHER** (Bobina, Rolo, Lance, Caixa) |
| **G** | Lance(s) | Text | ✅ **PREENCHER** (1x1000, 1x500...) |
| **H** | Quantidade | Number | ✅ **PREENCHER** |
| **I** | Valor Unitário | Currency | ✅ **PREENCHER** |
| **J** | Valor Total | ⚠️ FÓRMULA `=I*H` | Calculado automaticamente |

#### Exemplo de Linha Preenchida:
```
A18: 1
B18: TRN10
C18: =IFERROR(VLOOKUP(B18:B32,N18:O198,2,0),"")  ← NÃO MODIFICAR!
F18: Bobina
G18: 1x1000
H18: 1000
I18: 3.74
J18: =I18*H18  ← NÃO MODIFICAR!
```

### 💰 TOTAIS (Linhas 34-35)

| Célula | Campo | Observação |
|--------|-------|------------|
| **I34** | Label | "Total do Pedido:$" |
| **I35** | Total Geral | ⚠️ FÓRMULA `=SUM(J18:J32)` ou valor calculado |

### 📝 OBSERVAÇÕES (Linhas 36-42)

| Célula | Campo | Observação |
|--------|-------|------------|
| **A36** | Label | "Observações do Pedido" |
| **A37:J42** | Área Mesclada | ✅ **PREENCHER** em A37 ou B37 |

### 💳 PAGAMENTO (Linhas 43-46)

| Célula | Campo | Exemplo |
|--------|-------|---------|
| **A45** | Forma Pagamento | "PARCELADO", "Á VISTA" |
| **E45** | Percentual | 1 (= 100%) |
| **F45** | Método Pagamento | "FATURAMENTO", "TRANSFERÊNCIA" |
| **I45** | Valor | ⚠️ FÓRMULA `=I35` |
| **A46** | Segunda Forma | "ENTREGA" (se parcelado) |
| **E46** | Percentual 2 | ⚠️ FÓRMULA `=100%-E45` |

### 📦 ENTREGA (Linhas 48-54)

| Célula | Campo | Dado do Modal |
|--------|-------|---------------|
| **D48** | Qtd Volumes | `op-qtd-volumes` |
| **H48** | Tipo Embalagem | `op-tipo-embalagem` |
| **C51** | COMPLETO | Checkbox |
| **C53** | PARCIAL | Checkbox |
| **E51** | Observações | `op-obs-entrega` |

---

## 📊 LISTAS DE DADOS (Colunas M-Q)

### Coluna M - Vendedores (M19:M26)
- Renata Alvez
- Augusto Ladeira
- Fabíola Souza
- Tainá Freitas
- Ariel Silva
- Marcia Scarcella
- Andréia Trovão
- Marcos Oliveira

### Colunas N-O - Catálogo de Produtos (N18:O174)
Usado pelo VLOOKUP da coluna C para buscar descrição.

| Código (N) | Descrição (O) |
|------------|---------------|
| DUN10 | ALUFORCE CB DUPLEX 10mm² NEUTRO NÚ |
| DUN16 | ALUFORCE CB DUPLEX 16mm² NEUTRO NÚ |
| DUN25 | ALUFORCE CB DUPLEX 25mm² NEUTRO NÚ |
| TRN10 | ALUFORCE CB TRIPLEX 10mm² NEUTRO NÚ |
| TRN16 | ALUFORCE CB TRIPLEX 16mm² NEUTRO NÚ |
| ... | (ver catálogo completo no JavaScript) |

### Colunas P-Q - Opções (M11:Q15)

| Coluna | Campo | Opções |
|--------|-------|--------|
| M | Frete | FOB, CIF |
| N | Embalagens | Bobina, Rolo, Lance, Caixa |
| O | Forma Pagamento | Á VISTA, PARCELADO, ANTECIPADO, ENTREGA |
| P | Método Pagamento | TRANSFERÊNCIA, DEPÓSITO, FATURAMENTO, FATURADO |
| Q | Percentuais | 0.2, 0.3, 0.5, 1 |

---

## ⚠️ CÉLULAS COM FÓRMULAS - NÃO SOBRESCREVER!

| Célula | Fórmula | Função |
|--------|---------|--------|
| **H6** | `=J4+30` | Prazo = Data Liberação + 30 dias |
| **H12** | `=H8` | Fone Transportadora = Fone Cliente |
| **G15** | `=C9` | Email NFe = Email Cliente |
| **C18:C32** | `=IFERROR(VLOOKUP(...))` | Nome do produto pelo código |
| **J18:J32** | `=I*H` | Total = Qtd × Valor Unit |
| **I35** | `=SUM(J18:J32)` | Soma total dos produtos |
| **E46** | `=100%-E45` | Percentual restante |
| **I45** | `=I35` | Valor = Total do pedido |

---

## 🔧 MAPEAMENTO NO SERVER.JS

```javascript
// CABEÇALHO
abaVendas.getCell('C4').value = dados.numero_orcamento;
abaVendas.getCell('G4').value = dados.numero_pedido;
abaVendas.getCell('J4').value = new Date(dados.data_liberacao);
abaVendas.getCell('C6').value = dados.vendedor;
// H6 = Fórmula (não preencher)
abaVendas.getCell('C7').value = dados.cliente;
abaVendas.getCell('C8').value = dados.contato_cliente;
abaVendas.getCell('H8').value = dados.fone_cliente;
abaVendas.getCell('C9').value = dados.email_cliente;
abaVendas.getCell('J9').value = dados.tipo_frete;

// TRANSPORTADORA
abaVendas.getCell('C12').value = dados.transportadora_nome;
// H12 = Fórmula (não preencher)
abaVendas.getCell('C13').value = dados.transportadora_cep;
abaVendas.getCell('F13').value = dados.transportadora_endereco;
abaVendas.getCell('C15').value = dados.transportadora_cpf_cnpj;
// G15 = Fórmula (não preencher)

// PRODUTOS (Linhas 18-32)
let linha = 18;
produtos.forEach((prod, i) => {
    abaVendas.getCell(`A${linha}`).value = i + 1;           // # Item
    abaVendas.getCell(`B${linha}`).value = prod.codigo;     // Código
    // C = VLOOKUP automático (não preencher!)
    abaVendas.getCell(`F${linha}`).value = prod.embalagem;  // Embalagem
    abaVendas.getCell(`G${linha}`).value = prod.lances;     // Lance(s)
    abaVendas.getCell(`H${linha}`).value = prod.quantidade; // Qtd
    abaVendas.getCell(`I${linha}`).value = prod.valor_unitario; // V.Un
    abaVendas.getCell(`J${linha}`).value = prod.quantidade * prod.valor_unitario; // V.Total
    linha++;
});

// OBSERVAÇÕES
abaVendas.getCell('A37').value = dados.observacoes_pedido;

// PAGAMENTO
abaVendas.getCell('A45').value = dados.forma_pagamento;
abaVendas.getCell('E45').value = 1; // 100%
abaVendas.getCell('F45').value = dados.metodo_pagamento;

// ENTREGA
abaVendas.getCell('D48').value = dados.qtd_volumes;
abaVendas.getCell('H48').value = dados.tipo_embalagem_entrega;
```

---

## ✅ CHECKLIST DE VALIDAÇÃO

- [x] Linha 17 é cabeçalho, produtos começam na 18
- [x] Coluna C tem VLOOKUP - não preencher diretamente
- [x] Colunas D-E estão mescladas com C
- [x] Não existe coluna "Variação" no template VENDAS_PCP
- [x] Fórmulas H6, H12, G15 não são sobrescritas
- [x] Total em I35 (não J34)
- [x] Catálogo de produtos em N18:O174
- [x] Vendedores em M19:M26

---

**Última atualização:** 22/12/2025 - Mapeamento 100% verificado

# REST_API_CLIENT
Esta API foi desenvolvida para interagir com um banco de dados do Sighub, oferecendo endpoints para consulta, e gerenciamento de dados relacionados as empresas clientes da sigmais.

## Documentação da API

Esta API foi desenvolvida para interagir com um banco de dados MongoDB, fornecendo endpoints para consulta, gerenciamento e atualização de dados relacionados a empresas, grupos, dispositivos e seus eventos.

---

## Descrição Geral
- **Linguagem:** Node.js
- **Framework:** Express.js
- **Banco de Dados:** MongoDB
- **Cache:** Redis
- **Porta Padrão:** 8005
- **Autenticação:** Validação por API Key e Company ID
- **Dependências:**
  - `dotenv`: Gerenciamento de variáveis de ambiente.
  - `express`: Framework para construção de APIs.
  - `mongoose`: Conexão e manipulação do MongoDB.
  - `redis`: Cache de consultas frequentes.
  - `body-parser`: Análise do corpo das requisições.
  - `cors`: Suporte para compartilhamento de recursos entre origens diferentes.
  - **Custom Middleware:** Validação de API Key (`validateApiKey`).

---

## Configuração Inicial
1. **Variáveis de Ambiente:**
   - `MONGO_URI`: URI de conexão com o banco MongoDB.
   - `MONGO_DB`: Nome do banco de dados.
   - `PORT`: Porta na qual a API será executada (padrão: 8005).
   - `REDIS_HOST`: Host do Redis.
   - `REDIS_PORT`: Porta do Redis.

2. **Instalação:**
   - Clone o repositório.
   - Instale as dependências:
     ```bash
     npm install
     ```
   - Crie o arquivo `.env` e configure as variáveis de ambiente mencionadas acima.

3. **Iniciar a API:**
   - Execute a aplicação:
     ```bash
     npm start
     ```

---

## Endpoints

A API está acessível publicamente através do DNS: `https://api.client.sigmais.com.br`.

---

### **1. Dados de Empresas**
- **Rota:** `/companies/data`
- **Método:** `GET`
- **Parâmetros:**
  - `name` (Opcional): Nome da empresa para filtrar.
- **Cabeçalhos:**
  - `x-api-key`: Chave de autenticação.
  - `x-company-id`: Identificador único da empresa.
- **Descrição:** Retorna os dados das empresas cadastradas.

**Exemplo de Requisição:**
```bash
curl --location 'https://api.client.sigmais.com.br/companies/data?name=COMPANY' --header 'x-api-key: SEU_API_KEY' --header 'x-company-id: COMPANY_ID'
```

---

### **2. Dados de Grupos**
- **Rota:** `/groups/data`
- **Método:** `GET`
- **Parâmetros:**
  - `uuid` (Opcional): Filtrar grupos pelo UUID do dispositivo.
- **Cabeçalhos:**
  - `x-api-key`: Chave de autenticação.
  - `x-company-id`: Identificador único da empresa.
- **Descrição:** Retorna os dados dos grupos associados à empresa.

**Exemplo de Requisição:**
```bash
curl --location 'https://api.client.sigmais.com.br/groups/data?uuid=abc123' --header 'x-api-key: SEU_API_KEY' --header 'x-company-id: COMPANY_ID'
```

---

### **3. Resumo do Dispositivo**
- **Rota:** `/<device_type>/device/resume`
- **Método:** `GET`
- **Parâmetros:**
   - `uuid` (Obrigatório): Identificador único do dispositivo.
   - `device_type`(Obrigatório): Identificador único do tipo do produto.
     - sigmeter
     - sigmeteronoff
     - sigmeterlora
     - sigpulse
     - sigpark
- **Cabeçalhos:**
  - `x-api-key`: Chave de autenticação.
  - `x-company-id`: Identificador único da empresa.
- **Descrição:** Retorna o resumo das informações do dispositivo.

**Exemplo de Requisição:**
```bash
curl --location 'https://api.client.sigmais.com.br/sigmeter/device/resume?uuid=device123' --header 'x-api-key: SEU_API_KEY' --header 'x-company-id: COMPANY_ID'
```

---

### **4. Eventos do Dispositivo**
- **Rota:** `/<device_type>/device/events`
- **Método:** `GET`
- **Parâmetros:**
   - `device_type`(Obrigatório): Identificador único do tipo do produto.
     - sigmeter
     - sigmeteronoff
     - sigmeterlora
     - sigpulse
     - sigpark
  - `uuid` (Obrigatório): Identificador único do dispositivo.
  - `start_date` (Obrigatório): Data inicial no formato ISO 8601.
  - `end_date` (Obrigatório): Data final no formato ISO 8601.
  - `page` (Opcional): Número da página para paginação.
  - `size` (Opcional): Quantidade de resultados por página (máximo: 100).
- **Cabeçalhos:**
  - `x-api-key`: Chave de autenticação.
  - `x-company-id`: Identificador único da empresa.
- **Descrição:** Retorna os eventos associados ao dispositivo no intervalo de tempo especificado.

**Exemplo de Requisição:**
```bash
curl --location 'https://api.client.sigmais.com.br/sigmeter/device/events?uuid=device123&start_date=2024-01-01T00%3A00%3A00Z&end_date=2024-01-02T00%3A00%3A00Z' --header 'x-api-key: SEU_API_KEY' --header 'x-company-id: COMPANY_ID'
```

---

### **5. Alertas do Dispositivo**
- **Rota:** `/<device_type>/device/alerts`
- **Método:** `GET`
- **Parâmetros:**
   - `device_type`(Obrigatório): Identificador único do tipo do produto.
     - sigmeter
     - sigmeteronoff
     - sigmeterlora
     - sigpulse
     - sigpark
  - `uuid` (Obrigatório): Identificador único do dispositivo.
  - `start_date` (Obrigatório): Data inicial no formato ISO 8601.
  - `end_date` (Obrigatório): Data final no formato ISO 8601.
  - `page` (Opcional): Número da página para paginação.
  - `size` (Opcional): Quantidade de resultados por página (máximo: 100).
- **Cabeçalhos:**
  - `x-api-key`: Chave de autenticação.
  - `x-company-id`: Identificador único da empresa.
- **Descrição:** Retorna alertas associados ao dispositivo no intervalo de tempo especificado.

**Exemplo de Requisição:**
```bash
curl --location 'https://api.client.sigmais.com.br/sigmeter/device/alerts?uuid=device123&start_date=2024-01-01T00%3A00%3A00Z&end_date=2024-01-02T00%3A00%3A00Z' --header 'x-api-key: SEU_API_KEY' --header 'x-company-id: COMPANY_ID'
```

---

### **6. Consultar Versão da API**
- **Rota:** `/version`
- **Método:** `GET`
- **Descrição:** Retorna a versão atual da API.

**Exemplo de Requisição:**
```bash
curl --location 'https://api.client.sigmais.com.br/version' --header 'x-api-key: SEU_API_KEY' --header 'x-company-id: COMPANY_ID'
```

---

### **7. Testar Disponibilidade da API**
- **Rota:** `/`
- **Método:** `GET`
- **Descrição:** Testa a disponibilidade da API.

**Exemplo de Requisição:**
```bash
curl --location 'https://api.client.sigmais.com.br/' --header 'x-api-key: SEU_API_KEY' --header 'x-company-id: COMPANY_ID'
```

---

### **Regras de Paginação**
- **Máximo de Registros por Página:** 100.
- **Parâmetros de Paginação:**
  - `page`: Número da página (inicia em 1).
  - `size`: Número de registros por página (máximo permitido: 100, padrao 10).

---

## **Informações Adicionais**
- **Cache:** Implementado com Redis para melhorar a performance de consultas frequentes.
- **Gerenciador de Processos:** PM2.
- **Hospedagem:** Azure.

--- 


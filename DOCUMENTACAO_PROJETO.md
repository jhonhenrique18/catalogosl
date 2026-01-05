# 📦 Catálogo Santa Lolla - Documentação Técnica

## 🎯 Visão Geral do Projeto

Este é um **catálogo digital de bolsas** inspirado no e-commerce Santa Lolla, focado no mercado paraguaio. O sistema permite que clientes visualizem produtos com suas variações de cores e preços em Guaraníes (₲), enquanto administradores podem gerenciar todo o catálogo através de um painel protegido por senha.

---

## 🏗️ Arquitetura do Sistema

### Stack Tecnológico

| Camada | Tecnologia | Justificativa |
|--------|------------|---------------|
| **Frontend** | HTML5, CSS3, JavaScript Vanilla | Simplicidade, performance, sem dependências |
| **Backend** | Node.js + Express.js | Rápido, leve, fácil deploy |
| **Banco de Dados** | SQLite (sql.js) | Portátil, sem configuração, ideal para Railway |
| **Upload de Imagens** | Multer | Biblioteca padrão para uploads em Node.js |
| **Autenticação** | express-session + bcryptjs | Sessões seguras com hash de senha |

### Estrutura de Diretórios

```
Catalogosanta/
├── server.js                 # Servidor Express + API REST
├── package.json              # Dependências e scripts
├── database.sqlite           # Banco de dados SQLite (gerado automaticamente)
├── .gitignore               # Arquivos ignorados pelo Git
├── README.md                # Instruções básicas
│
├── public/                  # Arquivos públicos (catálogo)
│   ├── index.html           # Página principal do catálogo
│   ├── css/
│   │   └── style.css        # Estilos do catálogo público
│   ├── js/
│   │   └── app.js           # Lógica do catálogo (filtros, modal, etc.)
│   ├── img/
│   │   └── placeholder.svg  # Imagem placeholder para produtos
│   └── uploads/             # Imagens dos produtos (gerado automaticamente)
│       └── .gitkeep
│
└── admin/                   # Painel administrativo
    ├── index.html           # Dashboard do admin
    ├── login.html           # Página de login
    ├── css/
    │   └── admin.css        # Estilos do painel admin
    └── js/
        └── admin.js         # Lógica do painel (CRUD, upload)
```

---

## 📊 Modelo de Dados

### Tabelas do Banco de Dados

#### 1. `productos` - Produtos principais
```sql
CREATE TABLE productos (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    nombre TEXT NOT NULL,           -- Nome do produto
    descripcion TEXT,               -- Descrição opcional
    precio INTEGER NOT NULL,        -- Preço em Guaraníes (sem decimais)
    categoria TEXT DEFAULT 'Bolsa', -- Categoria: Bolsa, Grande, Mediana, etc.
    activo INTEGER DEFAULT 1,       -- 1 = visível, 0 = oculto
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

#### 2. `variaciones` - Variações de cor
```sql
CREATE TABLE variaciones (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    producto_id INTEGER NOT NULL,   -- FK para productos
    color TEXT NOT NULL,            -- Nome da cor (Negro, Marrón, etc.)
    imagen TEXT,                    -- Nome do arquivo da imagem principal
    stock INTEGER DEFAULT 0,        -- Estoque (opcional)
    FOREIGN KEY (producto_id) REFERENCES productos(id)
);
```

#### 3. `imagenes_producto` - Galeria de imagens
```sql
CREATE TABLE imagenes_producto (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    variacion_id INTEGER NOT NULL,  -- FK para variaciones
    imagen TEXT NOT NULL,           -- Nome do arquivo
    orden INTEGER DEFAULT 0,        -- Ordem de exibição
    FOREIGN KEY (variacion_id) REFERENCES variaciones(id)
);
```

#### 4. `usuarios` - Usuários admin
```sql
CREATE TABLE usuarios (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT UNIQUE NOT NULL,
    password TEXT NOT NULL,         -- Hash bcrypt
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

### Relacionamentos

```
productos (1) ──────< (N) variaciones (1) ──────< (N) imagenes_producto
    │                      │
    │                      └── Cada variação tem 1 imagem principal
    │                          + N imagens na galeria
    │
    └── Cada produto pode ter múltiplas variações de cor
```

---

## 🔌 API REST - Endpoints

### Autenticação

| Método | Endpoint | Descrição |
|--------|----------|-----------|
| `POST` | `/api/auth/login` | Login (username, password) |
| `POST` | `/api/auth/logout` | Logout |
| `GET` | `/api/auth/check` | Verifica se está autenticado |

### Produtos (Público)

| Método | Endpoint | Descrição |
|--------|----------|-----------|
| `GET` | `/api/productos` | Lista todos os produtos ativos |
| `GET` | `/api/productos/:id` | Detalhes de um produto |

### Admin - Produtos

| Método | Endpoint | Descrição |
|--------|----------|-----------|
| `GET` | `/api/admin/productos` | Lista todos os produtos (inclui ocultos) |
| `POST` | `/api/admin/productos` | Cria novo produto |
| `PUT` | `/api/admin/productos/:id` | Atualiza produto |
| `DELETE` | `/api/admin/productos/:id` | Remove produto e suas imagens |

### Admin - Variações

| Método | Endpoint | Descrição |
|--------|----------|-----------|
| `POST` | `/api/admin/variaciones` | Cria variação (FormData com imagem) |
| `PUT` | `/api/admin/variaciones/:id` | Atualiza variação |
| `DELETE` | `/api/admin/variaciones/:id` | Remove variação e suas imagens |

### Admin - Galeria de Imagens

| Método | Endpoint | Descrição |
|--------|----------|-----------|
| `POST` | `/api/admin/variaciones/:id/galeria` | Adiciona imagem à galeria |
| `DELETE` | `/api/admin/imagenes/:id` | Remove imagem da galeria |

---

## 🎨 Interface do Usuário

### Catálogo Público (`/`)

**Características:**
- Design elegante inspirado em Santa Lolla
- Grade responsiva de produtos
- Filtro por categorias
- Modal de detalhes do produto
- Seletor de cores com preview de imagens
- Galeria de fotos por variação
- Preços em Guaraníes (₲)
- Interface em Espanhol (mercado Paraguai)

**Fluxo do Usuário:**
1. Visualiza grade de produtos
2. Clica em um produto → abre modal
3. Seleciona cor → vê fotos daquela cor
4. Vê preço, descrição e galeria

### Painel Admin (`/admin`)

**Características:**
- Login protegido por senha
- Dashboard com lista de produtos
- Modal único para criar/editar produto
- Sistema de cores com upload múltiplo de fotos
- Drag & drop para imagens
- Preview em tempo real das fotos
- Indicador de foto principal (primeira foto)
- Toasts de feedback

**Fluxo do Admin:**
1. Login com usuário/senha
2. Vê lista de produtos
3. Clica "Nuevo Producto" ou em produto existente
4. Preenche: Nome, Preço, Categoria, Descrição
5. Adiciona cores (Negro, Marrón, etc.)
6. Para cada cor: arrasta ou seleciona fotos
7. Clica "Guardar Producto"

---

## 🔐 Segurança

### Autenticação
- Senhas hasheadas com **bcryptjs** (salt rounds: 10)
- Sessões gerenciadas com **express-session**
- Cookie seguro com `httpOnly: true`
- Middleware de proteção para rotas `/api/admin/*`

### Credenciais Padrão
```
Usuário: jhonatan
Senha: 27270374
```

### Upload de Arquivos
- Apenas imagens aceitas (jpeg, png, gif, webp)
- Limite de 10MB por arquivo
- Nomes únicos gerados automaticamente
- Armazenados em `/public/uploads/`

---

## 🚀 Deploy no Railway

### Pré-requisitos
1. Conta no [Railway](https://railway.app)
2. Repositório no GitHub
3. Arquivo `package.json` com script `start`

### Configuração

**package.json:**
```json
{
  "name": "catalogo-santa-lolla",
  "version": "1.0.0",
  "scripts": {
    "start": "node server.js"
  },
  "dependencies": {
    "express": "^4.18.2",
    "express-session": "^1.17.3",
    "multer": "^1.4.5-lts.1",
    "bcryptjs": "^2.4.3",
    "sql.js": "^1.8.0"
  }
}
```

**Variáveis de Ambiente (Railway):**
```
PORT=3000                    # Railway define automaticamente
SESSION_SECRET=sua_chave_secreta_aqui
NODE_ENV=production
```

### Passos para Deploy

1. **Push para GitHub:**
   ```bash
   git init
   git add .
   git commit -m "Initial commit"
   git remote add origin https://github.com/seu-usuario/catalogo-santa-lolla.git
   git push -u origin main
   ```

2. **No Railway:**
   - New Project → Deploy from GitHub repo
   - Selecione o repositório
   - Railway detecta Node.js automaticamente
   - Clique em Deploy

3. **Após deploy:**
   - Acesse a URL gerada pelo Railway
   - Faça login em `/admin/login`
   - Comece a adicionar produtos!

---

## 📱 Responsividade

O sistema é totalmente responsivo:

| Dispositivo | Breakpoint | Comportamento |
|-------------|------------|---------------|
| Desktop | > 1024px | Grid 4 colunas, modal lateral |
| Tablet | 768-1024px | Grid 3 colunas |
| Mobile | < 768px | Grid 2 colunas, modal fullscreen |

---

## 🔧 Comandos Úteis

```bash
# Instalar dependências
npm install

# Iniciar servidor (desenvolvimento)
npm start

# O servidor inicia em http://localhost:3000
```

---

## 📝 Notas Importantes

### Sobre o sql.js
- Usa WebAssembly para rodar SQLite no Node.js
- Compatível com qualquer versão de Node.js
- Não requer compilação nativa
- Banco é salvo em arquivo `database.sqlite`

### Sobre Imagens
- Armazenadas localmente em `/public/uploads/`
- No Railway, persistem entre deploys se usar volume
- Para produção em escala, considerar S3 ou Cloudinary

### Sobre o Banco de Dados
- Criado automaticamente na primeira execução
- Usuário admin criado automaticamente
- Para resetar: delete `database.sqlite` e reinicie

---

## 🎯 Funcionalidades Principais

### ✅ Implementadas
- [x] Catálogo público responsivo
- [x] Modal de detalhes do produto
- [x] Seletor de cores com preview
- [x] Galeria de fotos por variação
- [x] Painel admin protegido
- [x] CRUD completo de produtos
- [x] Upload múltiplo de imagens
- [x] Drag & drop para fotos
- [x] Filtro por categorias
- [x] Preços em Guaraníes

### 🔮 Possíveis Melhorias Futuras
- [ ] WhatsApp integration (botão de contato)
- [ ] Busca por nome de produto
- [ ] Favoritos (localStorage)
- [ ] Compartilhamento em redes sociais
- [ ] Analytics de visualizações
- [ ] Export de catálogo em PDF
- [ ] Múltiplos usuários admin
- [ ] Integração com storage cloud (S3)

---

## 👥 Credenciais de Acesso

| Tipo | URL | Usuário | Senha |
|------|-----|---------|-------|
| Admin | `/admin/login` | jhonatan | 27270374 |
| Público | `/` | - | - |

---

## 📞 Suporte

Este projeto foi desenvolvido para servir como catálogo digital de bolsas para o mercado paraguaio, com foco em:
- **Simplicidade**: Fácil de usar e manter
- **Performance**: Carregamento rápido
- **Mobile-first**: Otimizado para smartphones
- **Deploy fácil**: Compatível com Railway/Vercel/Heroku

---

*Documentação gerada em Janeiro 2026*


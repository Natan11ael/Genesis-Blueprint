/// server.js
//
/// imports
//
const express = require('express');
const dotenv = require('dotenv');
const path = require('path');

// Carrega as variáveis de ambiente do arquivo .env
dotenv.config();

/// vars
//
// Cria a instância do aplicativo Express
const app = express();
const PORT = process.env.PORT || 3000; // Define a porta. Pega do ambiente (process.env.PORT) ou usa a 3000 como fallback.
const HOST = process.env.HOST || 'localhost';

/// config
//
// Middleware para permitir que o Express entenda JSON no corpo das requisições (POST, PUT)
app.use(express.static('public'));
app.use(express.json());
app.use(express.urlencoded({ extended: true })); // Middleware para permitir que o Express entenda dados de formulário (URL-encoded)

/// routes
//
// Rota raiz - Renderiza a página inicial
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'views', 'public/index.html'));
});

/// erros-routes
//
// Middleware para tratar rotas não encontradas (404)
app.use((req, res, next) => {
    // Define o status HTTP para 404 (Not Found)
    res.status(404).send('<h1>404 - Página Não Encontrada</h1>');
});

/// start server
//
app.listen(PORT, HOST, () => {
    console.log(`Servidor rodando em http://${HOST}:${PORT}`);
});
const express = require('express');
const app = express();
const mongoose = require('mongoose');
const path = require('path');
require('dotenv').config({ path: ".env" });

const bookRoutes = require('./routes/book');
const userRoutes = require('./routes/user');

// Connexion a MongoDB
mongoose.connect(process.env.CONNECTION_STRING,
    { useNewUrlParser: true, })
    .then(() => console.log('Connexion à MongoDB réussie !'))
    .catch(() => console.log('Connexion à MongoDB échouée !'));

// Middleware pour les headers CORS
app.use((req, res, next) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content, Accept, Content-Type, Authorization');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, PATCH, OPTIONS');
    next();
});

// Middleware pour parser les JSON
app.use(express.json());

// Définition des routes
app.use('/api/books', bookRoutes);
app.use('/api/auth', userRoutes);
app.use('/images', express.static(path.join(__dirname, 'images')));

// Middleware de gestion des erreurs 404
app.use((req, res, next) => {
    res.status(404).send("Not Found");
});

module.exports = app;

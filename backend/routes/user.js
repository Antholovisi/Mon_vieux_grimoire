const express = require('express');
const router = express.Router();
const userCtrl = require('../controllers/user');

// Route pour l'inscription des utilisateurs
router.post('/signup', userCtrl.signUp);

// Route pour la connexion des utilisateurs
router.post('/login', userCtrl.login);

// Exportation du routeur 
module.exports = router;
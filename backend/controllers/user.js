const bcrypt = require('bcrypt'); // Importation du module bcrypt pour le hachage des mots de passe
const User = require('../models/user'); // Importation du modèle User pour interagir avec la base de données
const jwt = require('jsonwebtoken'); // Importation du module jsonwebtoken pour la création et vérification des tokens JWT
require('dotenv').config({ path: ".env" }); // Chargement des variables d'environnement depuis le fichier .env

// Inscription d'un nouvel utilisateur
exports.signUp = (req, res, next) => {
    console.log('SignUp request received:', req.body);
    // Hachage du mot de passe de l'utilisateur avant de l'enregistrer dans la base de données
    bcrypt.hash(req.body.password, 10)
        .then(hash => {
            // Création d'un nouvel utilisateur avec l'email et le mot de passe haché
            const user = new User({
                email: req.body.email,
                password: hash
            });
            // Sauvegarde de l'utilisateur dans la base de données
            return user.save();
        })
        .then(() => res.status(201).json({ message: 'Utilisateur créé !' }))
        .catch(error => res.status(500).json({ error }));
};

// Connexion d'un utilisateur existant
exports.login = (req, res, next) => {
    // Recherche de l'utilisateur par email dans la base de données
    User.findOne({ email: req.body.email })
        .then(user => {
            if (!user) {
                // Si l'utilisateur n'existe pas, renvoyer une erreur 401
                return res.status(401).json({ message: 'Paire login/mot de passe incorrecte' });
            }
            // Comparaison du mot de passe fourni avec le mot de passe haché stocké dans la base de données
            bcrypt.compare(req.body.password, user.password)
                .then(valid => {
                    if (!valid) {
                        // Si le mot de passe ne correspond pas, renvoyer une erreur 401
                        return res.status(401).json({ message: 'Paire login/mot de passe incorrecte' });
                    }
                    // Si les informations sont valides, créer un token JWT et le renvoye avec l'ID utilisateur
                    res.status(200).json({
                        userId: user._id, // ID de l'utilisateur
                        token: jwt.sign(
                            { userId: user._id }, // Payload du token, contenant l'ID utilisateur
                            process.env.JWT_SECRET, // Clé secrète pour signer le token, chargée depuis les variables d'environnement
                            { expiresIn: '24h' } // Durée de validité du token
                        )
                    });
                })
                // Réponse en cas d'erreur lors de la comparaison du mot de passe
                .catch(error => res.status(500).json({ error }));
        })
        // Réponse en cas d'erreur lors de la recherche de l'utilisateur
        .catch(error => res.status(500).json({ error }));
};
const jwt = require('jsonwebtoken'); // Importation du module jsonwebtoken pour la gestion des tokens JWT
require('dotenv').config({ path: ".env" });

module.exports = (req, res, next) => {
    try {
        // Extraction du token de l'en-tête Authorization de la requête, envoye TOKEN sous forme de BEARER
        const token = req.headers.authorization.split(' ')[1];
        // La méthode jwt.verify() renvoie les données décodées du token si le token est valide
        const decodedToken = jwt.verify(token, process.env.JWT_SECRET);
        // Extraction de l'ID utilisateur des données décodées du token
        const userId = decodedToken.userId;
        // Ajout de l'ID utilisateur aux propriétés de la requête pour un accès ultérieur
        req.auth = { userId: userId };
        // Passe au middleware suivant dans la chaîne
        next()
    } catch (error) {
        // Si une erreur survient lors de la vérification ou du décodage du token, renvoye une erreur 401 (Non autorisé)
        res.status(401).json({ error })
    }
}
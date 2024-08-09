const express = require('express');
const router = express.Router();
const bookCtrl = require('../controllers/book');
const auth = require('../middleware/auth');
const multer = require('../middleware/multer-config');

// Routes pour les livres


router.post('/', auth, multer, bookCtrl.createBook); // Route pour créer un nouveau livre

router.put('/:id', auth, multer, bookCtrl.updateBook); // Route pour modifier un livre existant

router.delete('/:id', auth, bookCtrl.deleteBook); // Route pour supprimer un livre existant

router.get('/bestrating', bookCtrl.getBestRating); // Route pour obtenir les meilleurs livres par note

router.get('/:id', bookCtrl.getOneBook); // Route pour obtenir les détails d'un livre spécifique

router.get('/', bookCtrl.getAllBooks); // Route pour obtenir la liste de tous les livres

router.post('/:id/rating', auth, bookCtrl.rateBook); // Route pour noter un livre


// Exportation du routeur
module.exports = router;
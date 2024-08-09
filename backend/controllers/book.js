const Book = require('../models/book'); // Importation du modèle Book pour interagir avec la base de données
const fs = require('fs'); // Importation du module fs pour manipuler les fichiers

// Création d'un nouveau livre
exports.createBook = (req, res, next) => {
    // Parsing des données du livre envoyées dans le corps de la requête
    const bookObject = JSON.parse(req.body.book);

    // Suppression des propriétés _id et _userId du livre
    delete bookObject._id;
    delete bookObject._userId;

    // Création d'un nouvel objet Book avec les données fournies et l'image
    const book = new Book({
        ...bookObject,
        userId: req.auth.userId, // ID de l'utilisateur authentifié
        imageUrl: `${req.protocol}://${req.get('host')}/images/${req.file.filename}`  // URL de l'image stockée
    });

    // Sauvegarde du livre dans la base de données
    book.save()
        .then(() => res.status(201).json({ message: 'Objet enregistré !' }))
        .catch(error => res.status(400).json({ error }));
}
// Modification d'un livre existant
exports.updateBook = (req, res, next) => {
    // Préparation des données du livre à mettre à jour
    const bookObject = req.file ? {
        ...JSON.parse(req.body.book),
        // Mise à jour de l'URL de l'image si une nouvelle image est fournie
        imageUrl: `${req.protocol}://${req.get('host')}/images/${req.file.filename}`
    } : { ...req.body };

    // Suppression de _userId pour éviter les modifications non autorisées
    delete bookObject._userId;

    // Recherche du livre par ID
    Book.findOne({ _id: req.params.id })
        .then(book => {
            // Vérification des droits d'accès
            if (book.userId !== req.auth.userId) {
                return res.status(403).json({ message: 'Non-autorisé' });
            }
            // Mise à jour du livre dans la base de données
            Book.updateOne({ _id: req.params.id }, { ...bookObject, _id: req.params.id })
                .then(() => res.status(200).json({ message: 'Objet modifié !' }))
                .catch(error => res.status(400).json({ error }));
        })
        .catch(error => res.status(500).json({ error }));
}
// Suppression d'un livre
exports.deleteBook = (req, res, next) => {
    // Recherche du livre par ID
    Book.findOne({ _id: req.params.id })
        .then(book => {
            // Vérification des droits d'accès
            if (book.userId !== req.auth.userId) {
                return res.status(403).json({ message: 'Non-autorisé' });
            }
            // Suppression de l'image associée au livre
            const filename = book.imageUrl.split('/images/')[1];
            fs.unlink(`images/${filename}`, () => {
                // Suppression du livre dans la base de données
                Book.deleteOne({ _id: req.params.id })
                    .then(() => res.status(200).json({ message: 'Objet supprimé !' }))
                    .catch(error => res.status(400).json({ error }));
            });
        })
        .catch(error => res.status(500).json({ error }));
}
// Récupération d'un livre par ID
exports.getOneBook = (req, res, next) => {
    // Recherche du livre par ID
    Book.findOne({ _id: req.params.id })
        .then(book => res.status(200).json(book)) // Réponse avec les données du livre
        .catch(error => res.status(404).json({ error })); // Réponse en cas d'erreur
}
// Récupération de tous les livres
exports.getAllBooks = (req, res, next) => {
    // Récupération de tous les livres
    Book.find()
        .then(books => res.status(200).json(books)) // Réponse avec la liste des livres
        .catch(error => res.status(400).json({ error })); // Réponse en cas d'erreur
}
// Évaluation d'un livre
exports.rateBook = (req, res, next) => {
    const id = req.params.id; // ID du livre
    const rating = req.body.rating; // Note donnée
    const userId = req.auth.userId; // ID de l'utilisateur

    // Validation de l'ID du livre et de la note
    if (!id || id === 'undefined') {
        // Réponse si l'ID du livre est manquant
        return res.status(400).send("Book id is missing");
    }

    if (rating === undefined || rating < 0 || rating > 5) {
        // Réponse si la note est invalide
        return res.status(400).send("Invalid rating value");
    }
    // Recherche du livre par ID
    Book.findOne({ _id: id })
        .then(book => {
            if (!book) {
                // Réponse si le livre n'est pas trouvé
                return res.status(404).send("Book not found");
            }
            // Vérification si l'utilisateur a déjà noté ce livre
            const previousRating = book.ratings.find(r => r.userId === userId);
            if (previousRating) {
                // Réponse si l'utilisateur a déjà noté ce livre
                return res.status(400).send("You have already rated this book");
            }
            // Ajout de la nouvelle note et calcul de la note moyenne
            book.ratings.push({ userId, grade: rating });
            book.averageRating = calculateAverageRating(book.ratings);
            // Sauvegarde des modifications
            book.save()
                .then(() => res.status(200).send(book))
                .catch(error => res.status(500).send(error));
        })
        .catch(error => res.status(500).send(error));
}

function calculateAverageRating(ratings) {
    if (ratings.length === 0) return 0;  // Retourne 0 si aucune évaluation
    const sumOfAllGrades = ratings.reduce((sum, rating) => sum + rating.grade, 0); // Calcul de la somme des notes
    return sumOfAllGrades / ratings.length; // Calcul de la note moyenne
}
// Récupération des meilleurs livres par note moyenne
exports.getBestRating = (req, res, next) => {
    // Recherche des livres triés par note moyenne décroissante et limite aux 3 premiers
    Book.find().sort({ averageRating: -1 }).limit(3)
        .then(books => {
            // Construction de l'URL complète pour chaque image du livre
            books.forEach(book => {
                if (book.imageUrl) {
                    book.imageUrl = `${req.protocol}://${req.get('host')}/images/${book.imageUrl.split('/images/')[1]}`;
                }
            });
            res.status(200).json(books); // Réponse avec les livres triés
        })
        .catch(error => {
            console.error(error); // Affichage de l'erreur dans la console
            res.status(500).send("Something went wrong: " + error.message); // Réponse en cas d'erreur
        });
}

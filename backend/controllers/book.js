const fs = require('fs').promises;
const path = require('path');
const sharp = require('sharp');
const Book = require('../models/book');

exports.createBook = async (req, res, next) => {
    try {
        const bookObject = JSON.parse(req.body.book);
        delete bookObject._id;
        delete bookObject._userId;

        const file = req.file;
        if (!file) {
            return res.status(400).json({ message: 'Aucun fichier fourni' });
        }

        const originalFilePath = file.path;
        const resizedFileName = `${bookObject.title}_${bookObject.author}_${bookObject.year}${path.extname(originalFilePath)}`;
        const resizedFilePath = path.join('images', resizedFileName);

        console.log(`Chemin du fichier original: ${originalFilePath}`);
        console.log(`Nom du fichier redimensionné: ${resizedFileName}`);
        console.log(`Chemin du fichier redimensionné: ${resizedFilePath}`);

        const book = new Book({
            ...bookObject,
            userId: req.auth.userId,
            imageUrl: `${req.protocol}://${req.get('host')}/images/${resizedFileName}`
        });

        await book.save();
        console.log('Livre sauvegardé avec succès.');

        await sharp(originalFilePath)
            .resize(500, 800)
            .toFile(resizedFilePath);
        console.log('Image redimensionnée avec succès.');

        // Suppression du fichier original
        try {
            await fs.access(originalFilePath);
            await fs.unlink(originalFilePath);
            console.log('Fichier original supprimé avec succès.');
        } catch (unlinkError) {
            console.error('Erreur lors de la suppression du fichier original:', unlinkError.message);
        }

        res.status(201).json({ message: 'Objet enregistré !' });
    } catch (error) {
        console.error('Erreur lors de la création du livre:', error.message);
        res.status(400).json({ message: 'Une erreur est survenue' });
    }
};

// Modification d'un livre existant
exports.updateBook = async (req, res, next) => {
    try {
        const bookObject = req.file ? {
            ...JSON.parse(req.body.book),
            imageUrl: `${req.protocol}://${req.get('host')}/images/${req.file.filename}`
        } : { ...req.body };

        delete bookObject._userId;

        const book = await Book.findOne({ _id: req.params.id });

        if (book.userId !== req.auth.userId) {
            return res.status(403).json({ message: 'Non-autorisé' });
        }

        if (req.file) {
            const file = req.file;
            const filePath = file.path;
            const fileName = file.filename;

            const resizedFilePath = path.join('images', `resized-${fileName}`);

            // Redimensionner l'image avec sharp
            await sharp(filePath)
                .resize(500, 800) // Largeur et hauteur
                .toFile(resizedFilePath);

            fs.unlink(filePath, (err) => {
                if (err) {
                    console.error('Erreur lors de la suppression du fichier original:', err);
                }
            });

            // Mise à jour de l'URL de l'image dans le livre
            bookObject.imageUrl = `${req.protocol}://${req.get('host')}/images/${fileName}`;
        }

        await Book.updateOne({ _id: req.params.id }, { ...bookObject, _id: req.params.id });
        res.status(200).json({ message: 'Objet modifié !' });
    } catch (error) {
        res.status(500).json({ error });
    }
}

// Suppression d'un livre
exports.deleteBook = async (req, res, next) => {
    try {
        const book = await Book.findOne({ _id: req.params.id });

        if (book.userId !== req.auth.userId) {
            return res.status(403).json({ message: 'Non-autorisé' });
        }

        const filename = book.imageUrl.split('/images/')[1];
        const filePath = path.join('images', `${filename}`);

        // Supprimer l'image redimensionnée
        fs.unlink(filePath, (err) => {
            if (err) {
                console.error('Erreur lors de la suppression de l\'image:', err);
            }
        });

        await Book.deleteOne({ _id: req.params.id });
        res.status(200).json({ message: 'Objet supprimé !' });
    } catch (error) {
        res.status(500).json({ error });
    }
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
        return res.status(400).send("Book id is missing");
    }

    if (rating === undefined || rating < 0 || rating > 5) {
        return res.status(400).send("Invalid rating value");
    }

    // Recherche du livre par ID
    Book.findOne({ _id: id })
        .then(book => {
            if (!book) {
                return res.status(404).send("Book not found");
            }

            // Vérification si l'utilisateur a déjà noté ce livre
            const previousRating = book.ratings.find(r => r.userId === userId);
            if (previousRating) {
                return res.status(400).send("You have already rated this book");
            }

            // Ajout de la nouvelle note et calcul de la note moyenne
            book.ratings.push({ userId, grade: rating });
            book.averageRating = calculateAverageRating(book.ratings);

            // Sauvegarde des modifications
            book.save()
                .then(() => res.status(200).json(book))
                .catch(error => res.status(500).send(error));
        })
        .catch(error => res.status(500).send(error));
}

function calculateAverageRating(ratings) {
    if (ratings.length === 0) return 0;  // Retourne 0 si aucune évaluation
    const sumOfAllGrades = ratings.reduce((sum, rating) => sum + rating.grade, 0); // Calcul de la somme des notes
    const average = sumOfAllGrades / ratings.length; // Calcul de la note moyenne
    return parseFloat(average.toFixed(2)); // Arrondir à deux décimales et convertir en nombre
}

// Fonction pour récupérer les meilleurs livres par note moyenne
exports.getBestRating = (req, res, next) => {
    // Recherche tous les livres dans la base de données
    Book.find()
        // Trie les livres par note moyenne en ordre décroissant
        .sort({ averageRating: -1 })
        // Limite le résultat aux 3 premiers livres
        .limit(3)
        .then(books => {
            // Pour chaque livre retourné
            books.forEach(book => {
                // Si la note moyenne est définie
                if (book.averageRating !== undefined) {
                    // Formatage de la note moyenne pour qu'elle soit à deux décimales
                    book.averageRating = parseFloat(book.averageRating.toFixed(2));
                }
                // Si l'URL de l'image du livre est définie
                if (book.imageUrl) {
                    // Construire l'URL complète de l'image en utilisant le protocole et l'hôte de la requête
                    book.imageUrl = `${req.protocol}://${req.get('host')}/images/${book.imageUrl.split('/images/')[1]}`;
                }
            });
            // Répondre avec les livres triés et formatés en JSON
            res.status(200).json(books);
        })
        .catch(error => {
            // Affiche l'erreur dans la console pour le débogage
            console.error(error);
            // Répondre avec une erreur 500 en cas de problème lors de la récupération des livres
            res.status(500).send("Something went wrong: " + error.message);
        });
}

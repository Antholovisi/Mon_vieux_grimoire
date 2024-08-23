const fs = require('fs').promises;
const path = require('path');
const sharp = require('sharp');
const Book = require('../models/book');

// Creer un livre
exports.createBook = async (req, res, next) => {
    try {
        // Récupère les données du livre envoyées dans la requête et les convertit de JSON en objet JavaScript.
        const bookObject = JSON.parse(req.body.book);

        // Supprime les propriétés _id et _userId pour éviter les modifications non souhaitées.
        delete bookObject._id;
        delete bookObject._userId;

        // Vérifie si un fichier a été téléchargé avec la requête.
        const file = req.file;
        if (!file) {
            // Si aucun fichier n'est fourni, renvoie une réponse avec un statut 400 (Bad Request).
            return res.status(400).json({ message: 'Aucun fichier fourni' });
        }

        // Remplace les espaces dans le nom de l'auteur par des underscores pour le nom du fichier d'image.
        const imageAuthor = bookObject.author.replace(/\s+/g, '_');
        // Remplace les espaces dans le titre du livre par des underscores pour le nom du fichier d'image.
        const imageTitle = bookObject.title.replace(/\s+/g, '_');
        // Génère un nom unique pour le fichier redimensionné en incluant le titre, l'auteur, l'année et un timestamp.
        const resizedFileName = `${imageTitle}_${imageAuthor}_${bookObject.year}_${Date.now()}${path.extname(file.path)}`;
        // Crée un chemin complet pour l'image redimensionnée en utilisant le dossier 'images'.
        const resizedFilePath = path.join('images', resizedFileName);

        // Affiche des informations de débogage sur le chemin du fichier d'origine et du fichier redimensionné.
        console.log(`Chemin du fichier original: ${file.path}`);
        console.log(`Nom du fichier redimensionné: ${resizedFileName}`);
        console.log(`Chemin du fichier redimensionné: ${resizedFilePath}`);

        // Crée une nouvelle instance du modèle Book avec les données du livre et l'URL de l'image redimensionnée.
        const book = new Book({
            ...bookObject, // Les autres propriétés du livre (titre, auteur, etc.)
            userId: req.auth.userId, // Associe le livre à l'utilisateur qui l'a créé (extrait du token JWT).
            imageUrl: `${req.protocol}://${req.get('host')}/images/${resizedFileName}` // Génère l'URL de l'image redimensionnée.
        });

        // Sauvegarde le livre dans la base de données.
        await book.save();
        console.log('Livre sauvegardé avec succès.');

        // Désactive la mise en cache pour Sharp (ceci est facultatif et peut être omis selon vos besoins).
        sharp.cache(false);

        // Utilise Sharp pour redimensionner l'image téléchargée aux dimensions 500x800 pixels et la sauvegarde avec le nouveau nom.
        await sharp(file.path)
            .resize(500, 800)
            .toFile(resizedFilePath);
        console.log('Image redimensionnée avec succès.');

        // Tente de supprimer le fichier original après redimensionnement.
        try {
            await fs.unlink(file.path);
            console.log('Fichier original supprimé avec succès.');
        } catch (err) {
            console.error('Erreur lors de la suppression du fichier original:', err);
        }

        // Renvoie une réponse avec un statut 201 (Created) et un message de succès.
        res.status(201).json({ message: 'Objet enregistré !' });
    } catch (error) {
        // Capture les erreurs éventuelles, les affiche dans la console, et renvoie une réponse avec un statut 400 (Bad Request).
        console.error('Erreur lors de la création du livre:', error.message);
        res.status(400).json({ message: 'Une erreur est survenue' });
    }
};

// Modification d'un livre existant
exports.updateBook = async (req, res, next) => {
    try {
        // Recherche le livre par ID dans la base de données
        const book = await Book.findOne({ _id: req.params.id });

        // Vérifie si l'utilisateur actuel est autorisé à modifier ce livre
        if (book.userId !== req.auth.userId) {
            return res.status(403).json({ message: 'Non-autorisé' }); // Retourne une erreur si l'utilisateur n'est pas autorisé
        }

        // Si un nouveau fichier (image) est fourni, on met à jour l'objet du livre avec la nouvelle image
        const bookObject = req.file ? {
            ...JSON.parse(req.body.book), // Transforme la chaîne JSON en objet
            imageUrl: `${req.protocol}://${req.get('host')}/images/${req.file.filename}` // Génère l'URL de la nouvelle image
        } : { ...req.body }; // Sinon, on utilise simplement les données du corps de la requête

        delete bookObject._userId; // Supprime l'ID utilisateur pour éviter qu'il ne soit modifié

        // Si une nouvelle image est fournie, on effectue les opérations suivantes
        if (req.file) {
            const originalFilePath = req.file.path; // Chemin du fichier original

            // Génération du nom de fichier redimensionné en remplaçant les espaces par des underscores
            const imageAuthor = bookObject.author.replace(/\s+/g, '_');
            const imageTitle = bookObject.title.replace(/\s+/g, '_');
            const resizedFileName = `${imageTitle}_${imageAuthor}_${bookObject.year}_${Date.now()}${path.extname(originalFilePath)}`;
            const resizedFilePath = path.join('images', resizedFileName); // Chemin du fichier redimensionné

            // Redimensionne l'image à 500x800 pixels
            await sharp(originalFilePath)
                .resize(500, 800)
                .toFile(resizedFilePath);
            console.log('Image redimensionnée avec succès.');

            // Supprime le fichier original après redimensionnement
            try {
                await fs.unlink(originalFilePath);
                console.log('Fichier original supprimé avec succès.');
            } catch (err) {
                console.error('Erreur lors de la suppression du fichier original:', err);
            }

            // Supprime l'ancienne image associée au livre
            if (book.imageUrl) {
                const oldFilename = book.imageUrl.split('/images/')[1]; // Extrait le nom de l'ancienne image
                const oldFilePath = path.join('images', oldFilename); // Chemin de l'ancienne image
                try {
                    await fs.unlink(oldFilePath);
                    console.log('Ancienne image supprimée avec succès.');
                } catch (err) {
                    console.error('Erreur lors de la suppression de l\'ancienne image:', err);
                }
            }

            // Met à jour l'URL de l'image du livre dans l'objet du livre
            bookObject.imageUrl = `${req.protocol}://${req.get('host')}/images/${resizedFileName}`;
        }

        // Met à jour les informations du livre dans la base de données
        await Book.updateOne({ _id: req.params.id }, { ...bookObject, _id: req.params.id });
        res.status(200).json({ message: 'Objet modifié avec succès !' });
    } catch (error) {
        // Gestion des erreurs lors de la mise à jour du livre
        console.error('Erreur lors de la mise à jour du livre:', error);
        res.status(500).json({ error });
    }
};

// Suppression d'un livre
exports.deleteBook = async (req, res, next) => {
    try {
        // Recherche le livre par ID dans la base de données
        const book = await Book.findOne({ _id: req.params.id });

        // Vérifie si l'utilisateur actuel est autorisé à supprimer ce livre
        if (book.userId !== req.auth.userId) {
            return res.status(403).json({ message: 'Non-autorisé' }); // Retourne une erreur si l'utilisateur n'est pas autorisé
        }

        // Extrait le nom de l'image à partir de l'URL de l'image du livre
        const filename = book.imageUrl.split('/images/')[1];
        const filePath = path.join('images', `${filename}`); // Génère le chemin complet du fichier image

        // Supprime l'image redimensionnée associée au livre
        fs.unlink(filePath, (err) => {
            if (err) {
                console.error('Erreur lors de la suppression de l\'image:', err); // Log en cas d'erreur lors de la suppression
            }
        });

        // Supprime le livre de la base de données
        await Book.deleteOne({ _id: req.params.id });
        res.status(200).json({ message: 'Objet supprimé !' }); // Répond avec un message de succès si tout s'est bien passé
    } catch (error) {
        // Gestion des erreurs lors de la suppression
        res.status(500).json({ error }); // Répond avec une erreur 500 en cas de problème
    }
};

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

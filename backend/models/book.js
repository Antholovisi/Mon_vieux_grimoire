const mongoose = require('mongoose');

// Définition du schéma pour les livres
const bookSchema = mongoose.Schema({
    title: { type: String, required: true },
    author: { type: String, required: true },
    imageUrl: { type: String, required: true },
    year: { type: Number, required: true },
    userId: { type: String, required: true },
    ratings: [
        {
            userId: { type: String, required: true },
            grade: { type: Number, required: true }
        }
    ],
    averageRating: { type: Number, default: 0 }
});

// Ce modèle sera utilisé pour créer et manipuler les documents de la collection "books" dans MongoDB
module.exports = mongoose.model('Book', bookSchema);
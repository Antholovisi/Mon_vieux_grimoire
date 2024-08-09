const mongoose = require('mongoose'); // Importation de Mongoose pour interagir avec MongoDB
const uniqueValidator = require('mongoose-unique-validator'); // Importation du plugin pour valider les champs uniques

// Définition du schéma utilisateur
const userSchema = mongoose.Schema({
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true },
});

// Application du plugin uniqueValidator au schéma
userSchema.plugin(uniqueValidator);

// Ce modèle sera utilisé pour créer et manipuler les documents de la collection "users" dans MongoDB
module.exports = mongoose.model('User', userSchema)
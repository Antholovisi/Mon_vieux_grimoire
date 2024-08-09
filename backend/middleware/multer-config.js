const multer = require('multer');

// Définition des types MIME acceptés et leurs extensions de fichiers correspondantes
const MIME_TYPES = {
    'image/jpg': 'jpg',
    'image/jpeg': 'jpg',
    'image/png': 'png'
};

// Configuration du stockage des fichiers
const storage = multer.diskStorage({
    // Défini le répertoire de destination pour les fichiers téléchargés
    destination: (req, file, callback) => {
        callback(null, 'images'); // Le répertoire 'images' sera utilisé pour stocker les fichiers
    },
    // Défini le nom du fichier téléchargé
    filename: (req, file, callback) => {
        // Remplace les espaces dans le nom du fichier par des underscores
        const name = file.originalname.split(' ').join('_');
        // Obtention de l'extension du fichier basée sur le type MIME
        const extension = MIME_TYPES[file.mimetype];
        // Construction du nom du fichier avec le timestamp pour éviter les collisions de noms
        callback(null, name + Date.now() + '.' + extension);
    }
});

// La méthode .single('image') spécifie que nous nous attendons à un seul fichier avec le champ 'image'
module.exports = multer({ storage }).single('image'); 
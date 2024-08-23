const multer = require('multer');

// Définitions des types MIME
const MIME_TYPES = {
    'image/jpg': 'jpg',
    'image/jpeg': 'jpg',
    'image/png': 'png'
};

// Configuration du stockage pour Multer
const storage = multer.diskStorage({
    destination: (req, file, callback) => {
        callback(null, 'images'); // Répertoire de stockage des fichiers
    },
    filename: (req, file, callback) => {
        const name = file.originalname.split(' ').join('_').split('.')[0]; // Nom du fichier sans espaces
        const extension = MIME_TYPES[file.mimetype]; // Extension basée sur le type MIME
        callback(null, `${name}${Date.now()}.${extension}`); // Nom du fichier unique avec horodatage
    }
});

module.exports = multer({ storage }).single('image');
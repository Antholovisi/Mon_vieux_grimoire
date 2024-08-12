const fs = require('fs');
const path = require('path');

const testFilePath = path.join(__dirname, 'images', 'feu.jpg1723424915258.jpg');

fs.unlink(testFilePath, (err) => {
    if (err) {
        console.error('Erreur lors de la suppression:', err.message);
    } else {
        console.log('Fichier supprimé avec succès');
    }
});
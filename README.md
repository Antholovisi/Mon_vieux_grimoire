Mon Vieux Grimoire

Mon Vieux Grimoire est une application de gestion de bibliothèque utilisant Express et MongoDB. 
Elle permet de créer, mettre à jour, supprimer et évaluer des livres. Les images des livres sont redimensionnées avec sharp et stockées localement dans le répertoire images. 
Pour installer le projet, clonez le dépôt, installez les dépendances avec npm install, et configurez les variables d'environnement dans un fichier .env. 
Lancez le frontend avec npm start et le backend avec nodemon server. Accédez à l'application via http://localhost:4000.
Les API disponibles permettent de gérer les livres et leurs évaluations avec authentification JWT.

format .env :
CONNECTION_STRING = Chaine de connexion a MongoDB
PORT = ajoutez le port ici
JWT_SECRET = ajoutez le JWT


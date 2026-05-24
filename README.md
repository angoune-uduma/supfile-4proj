# SUPFile

SUPFile est une plateforme de stockage et de partage de fichiers dans le cloud, développée dans le cadre du projet académique 4PROJ. Elle propose une interface web et une application mobile permettant à chaque utilisateur de gérer son espace personnel de manière simple, sécurisée et intuitive.

---
# SUPFile

SUPFile est une plateforme de stockage et de partage de fichiers dans le cloud, développée dans le cadre du projet académique 4PROJ. Elle propose une interface web et une application mobile permettant à chaque utilisateur de gérer son espace personnel de manière simple, sécurisée et intuitive.

---

## Dépôt Git

Le dépôt contient l’historique complet du développement avec des commits cohérents et progressifs.

```txt
https://github.com/angoune-uduma/supfile-4proj
```
---
## 1. Technologies utilisées

### Backend

- Node.js
- Express.js
- MongoDB
- Mongoose
- JWT
- OAuth Google / GitHub
- Multer
- Docker

### Frontend web

- React
- Vite
- TypeScript
- Material UI
- Axios

### Mobile

- React Native
- Expo
- Axios
- Expo Secure Store
- Expo Document Picker

---

## 2. Structure du projet

Le projet est organisé en deux grands dossiers :

```txt
supfile-4proj/
│
├── supfile-web/
│   ├── backend/
│   ├── frontend/
│   ├── storage/
│   ├── docker-compose.yml
│   └── docker-compose.frontend.yml
│
└── supfile-mobile/
```

### Description des dossiers

```txt
supfile-web/backend
```

Contient l’API Node.js / Express. C’est le serveur central du projet.

```txt
supfile-web/frontend
```

Contient l’interface web React / Vite.

```txt
supfile-web/storage
```

Contient les fichiers physiques uploadés par les utilisateurs. Ce dossier est monté dans le conteneur backend sous `/app/storage`.

```txt
supfile-mobile
```

Contient l’application mobile React Native / Expo.

---

## 3. Fonctionnement général

Le backend est le service central du projet.

Le frontend web et l’application mobile communiquent avec le backend.

MongoDB n’est jamais appelé directement par le frontend web ou par l’application mobile.

```txt
Client web    → Backend API 4000
Client mobile → Backend API 4000
Backend API   → MongoDB 27017
Backend API   → Stockage fichiers /app/storage
```

L’application mobile ne passe pas par le frontend web.

```txt
Application mobile Expo → Backend API
```

Le frontend web appelle aussi directement le backend grâce à la variable d’environnement `VITE_API_URL`.

---

## 4. Prérequis

Avant de lancer le projet, il faut installer :

- Docker Desktop ;
- Docker Compose ;
- Node.js ;
- npm ;
- Git ;
- Expo Go sur le téléphone pour tester l’application mobile.

Vérifier Docker :

```bash
docker --version
docker compose version
```

Vérifier Node.js et npm :

```bash
node -v
npm -v
```

---

## 5. Ports utilisés

| Service | Port | Description |
|---|---:|---|
| Backend API | 4000 | API Node.js / Express |
| Frontend web | 5173 | Interface React / Vite |
| MongoDB | 27017 | Base de données |
| Expo Metro | 8081 | Serveur de développement mobile Expo |

En local sur une seule machine, ces ports sont utilisés par le projet.

Si un autre appareil du réseau doit accéder au backend, au frontend ou à Expo, le pare-feu peut bloquer les connexions entrantes. Sur Windows, il peut être nécessaire d’autoriser Docker Desktop, Node.js ou les ports concernés dans le pare-feu.

Les ports à autoriser selon le cas sont :

- `4000` si un autre appareil doit accéder au backend ;
- `5173` si un autre appareil doit accéder au frontend web ;
- `8081` si Expo doit être accessible depuis un téléphone.

MongoDB utilise le port `27017`. En développement local, il peut être exposé pour faciliter les tests, mais il ne doit pas être exposé publiquement en production.

---

## 6. Localhost, IP locale et sous-réseau

En local, `localhost` désigne toujours l’appareil qui exécute la requête.

Cela signifie que :

- sur le PC qui lance le backend, `http://localhost:4000` pointe vers le backend ;
- sur le PC qui lance le frontend, `http://localhost:5173` pointe vers le frontend ;
- sur un téléphone, `localhost` désigne le téléphone lui-même, pas le PC.

Donc, pour tester l’application mobile sur un téléphone physique, il ne faut pas utiliser `localhost`. Il faut utiliser l’adresse IP locale du PC qui lance le backend.

On utilise les notions suivantes :

```txt
IP_PC_BACK  = adresse IP locale du PC qui lance le backend sur le port 4000
IP_PC_FRONT = adresse IP locale du PC qui lance le frontend web sur le port 5173
```

Si le backend et le frontend web sont lancés sur le même PC :

```txt
IP_PC_BACK = IP_PC_FRONT
```

Si le backend et le frontend web sont lancés sur deux PC différents :

```txt
IP_PC_BACK ≠ IP_PC_FRONT
```

Si des adresses IP locales sont utilisées, les appareils doivent être connectés au même réseau local et doivent pouvoir se joindre. En pratique, ils doivent généralement être dans le même sous-réseau.

Exemple :

```txt
PC backend  : 192.168.1.25
PC frontend : 192.168.1.30
Téléphone   : 192.168.1.42
```

Ici, les appareils sont dans le même sous-réseau `192.168.1.x`.

Pour connaître l’adresse IP locale du PC :

### Windows

```powershell
ipconfig
```

Chercher l’adresse IPv4 de la carte réseau utilisée.

### macOS / Linux

```bash
ipconfig getifaddr en0
```

ou :

```bash
ip addr
```

---

## 7. Configuration des fichiers `.env`

Le projet utilise plusieurs fichiers `.env`.

Les fichiers `.env` ne doivent pas être envoyés sur GitHub, car ils peuvent contenir des secrets.

Il faut fournir des fichiers `.env.example` avec des valeurs fictives.

Les trois fichiers principaux sont :

```txt
supfile-web/backend/.env
supfile-web/frontend/.env
supfile-mobile/.env
```

---

## 8. Variables backend

Créer le fichier :

```txt
supfile-web/backend/.env
```

### Exemple si backend et frontend sont lancés sur le même PC

```env
NODE_ENV=development
PORT=4000

MONGODB_URI=mongodb://mongodb:27017/supfile

JWT_ACCESS_SECRET=change_me_access_secret
JWT_REFRESH_SECRET=change_me_refresh_secret
ACCESS_TOKEN_TTL=15m
REFRESH_TOKEN_TTL=30d

BASE_API_URL=http://localhost:4000
FRONTEND_URL=http://localhost:5173
CORS_ORIGINS=http://localhost:5173,http://localhost:8081

USER_QUOTA_GB=30
MAX_UPLOAD_MB=50
STORAGE_DIR=/app/storage

GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret
GOOGLE_CALLBACK_URL=http://localhost:4000/auth/oauth/google/callback

GITHUB_WEB_CLIENT_ID=your_github_web_client_id
GITHUB_WEB_CLIENT_SECRET=your_github_web_client_secret
GITHUB_WEB_CALLBACK_URL=http://localhost:4000/auth/oauth/github/callback

GITHUB_MOBILE_CLIENT_ID=your_github_mobile_client_id
GITHUB_MOBILE_CLIENT_SECRET=your_github_mobile_client_secret
```

### Exemple si le backend doit être accessible depuis un téléphone ou un autre PC

Remplacer `IP_PC_BACK` et `IP_PC_FRONT` par les adresses IP locales correspondantes.

```env
NODE_ENV=development
PORT=4000

MONGODB_URI=mongodb://mongodb:27017/supfile

JWT_ACCESS_SECRET=change_me_access_secret
JWT_REFRESH_SECRET=change_me_refresh_secret
ACCESS_TOKEN_TTL=15m
REFRESH_TOKEN_TTL=30d

BASE_API_URL=http://IP_PC_BACK:4000
FRONTEND_URL=http://IP_PC_FRONT:5173
CORS_ORIGINS=http://localhost:5173,http://IP_PC_FRONT:5173,http://localhost:8081

USER_QUOTA_GB=30
MAX_UPLOAD_MB=50
STORAGE_DIR=/app/storage

GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret
GOOGLE_CALLBACK_URL=http://IP_PC_BACK:4000/auth/oauth/google/callback

GITHUB_WEB_CLIENT_ID=your_github_web_client_id
GITHUB_WEB_CLIENT_SECRET=your_github_web_client_secret
GITHUB_WEB_CALLBACK_URL=http://IP_PC_BACK:4000/auth/oauth/github/callback

GITHUB_MOBILE_CLIENT_ID=your_github_mobile_client_id
GITHUB_MOBILE_CLIENT_SECRET=your_github_mobile_client_secret
```

### Rôle des variables importantes

| Variable | Rôle |
|---|---|
| `PORT` | Port du backend |
| `MONGODB_URI` | Adresse de connexion à MongoDB |
| `JWT_ACCESS_SECRET` | Secret de signature des access tokens |
| `JWT_REFRESH_SECRET` | Secret de signature des refresh tokens |
| `ACCESS_TOKEN_TTL` | Durée de validité de l’access token |
| `REFRESH_TOKEN_TTL` | Durée de validité du refresh token |
| `BASE_API_URL` | URL publique du backend, utilisée notamment pour générer certains liens |
| `FRONTEND_URL` | URL du frontend web |
| `CORS_ORIGINS` | Origines autorisées à appeler l’API |
| `USER_QUOTA_GB` | Quota de stockage par utilisateur |
| `MAX_UPLOAD_MB` | Taille maximale autorisée par fichier |
| `STORAGE_DIR` | Dossier de stockage dans le conteneur backend |

---

## 9. Variables frontend web

Créer le fichier :

```txt
supfile-web/frontend/.env
```

### Si le frontend et le backend sont sur le même PC

```env
VITE_API_URL=http://localhost:4000
```

### Si le backend est accessible par IP locale

```env
VITE_API_URL=http://IP_PC_BACK:4000
```

Exemple :

```env
VITE_API_URL=http://192.168.1.25:4000
```

Le frontend web ne contient pas le backend. Il doit donc toujours connaître l’adresse de l’API grâce à `VITE_API_URL`.

---

## 10. Variables mobile

Créer le fichier :

```txt
supfile-mobile/.env
```

L’application mobile appelle directement le backend.

### Exemple

```env
EXPO_PUBLIC_API_URL=http://IP_PC_BACK:4000
EXPO_PUBLIC_GOOGLE_CLIENT_ID=your_google_mobile_client_id
EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID=your_google_ios_client_id
EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID=your_google_android_client_id
EXPO_PUBLIC_GITHUB_CLIENT_ID=your_github_mobile_client_id
```

Exemple avec une IP locale :

```env
EXPO_PUBLIC_API_URL=http://192.168.1.25:4000
```

Ne pas mettre ceci sur un téléphone physique :

```env
EXPO_PUBLIC_API_URL=http://localhost:4000
```

Sur un téléphone, `localhost` désigne le téléphone lui-même, pas le PC.

---

## 11. Google et GitHub OAuth

SUPFILE peut utiliser Google et GitHub pour permettre la connexion via un compte externe.

Les variables OAuth sont obtenues depuis :

- Google Cloud Console pour Google ;
- GitHub Developer Settings pour GitHub.

### Client ID

Le `CLIENT_ID` identifie l’application auprès de Google ou GitHub.

Certains client IDs peuvent être utilisés côté frontend ou mobile, car ils ne sont pas secrets.

### Client Secret

Le `CLIENT_SECRET` est une donnée sensible.

Il doit rester uniquement côté backend, dans :

```txt
supfile-web/backend/.env
```

Il ne doit jamais être placé dans :

```txt
supfile-web/frontend/.env
supfile-mobile/.env
```

Il ne doit jamais être envoyé sur GitHub.

### Variables backend OAuth

```env
GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret
GOOGLE_CALLBACK_URL=http://IP_PC_BACK:4000/auth/oauth/google/callback

GITHUB_WEB_CLIENT_ID=your_github_web_client_id
GITHUB_WEB_CLIENT_SECRET=your_github_web_client_secret
GITHUB_WEB_CALLBACK_URL=http://IP_PC_BACK:4000/auth/oauth/github/callback

GITHUB_MOBILE_CLIENT_ID=your_github_mobile_client_id
GITHUB_MOBILE_CLIENT_SECRET=your_github_mobile_client_secret
```

### Variables mobile OAuth

Les variables qui commencent par `EXPO_PUBLIC_` sont visibles côté client. Il ne faut donc jamais y mettre de secret.

```env
EXPO_PUBLIC_GOOGLE_CLIENT_ID=your_google_mobile_client_id
EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID=your_google_ios_client_id
EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID=your_google_android_client_id
EXPO_PUBLIC_GITHUB_CLIENT_ID=your_github_mobile_client_id
```

### URLs de callback

Les URLs de callback doivent correspondre à l’adresse réellement utilisée par le backend.

Exemple si le backend tourne sur `192.168.1.25` :

```env
GOOGLE_CALLBACK_URL=http://192.168.1.25:4000/auth/oauth/google/callback
GITHUB_WEB_CALLBACK_URL=http://192.168.1.25:4000/auth/oauth/github/callback
```

Ces URLs doivent aussi être autorisées dans les consoles Google et GitHub.

---

## 12. Gestion des secrets

Les secrets sont des valeurs sensibles utilisées par le backend.

Exemples :

```env
JWT_ACCESS_SECRET
JWT_REFRESH_SECRET
GOOGLE_CLIENT_SECRET
GITHUB_WEB_CLIENT_SECRET
GITHUB_MOBILE_CLIENT_SECRET
```

Ces valeurs ne doivent jamais être partagées publiquement.

Les fichiers `.env` ne doivent pas être versionnés sur GitHub.

Les fichiers `.env.example` doivent contenir uniquement des valeurs fictives :

```env
JWT_ACCESS_SECRET=change_me_access_secret
JWT_REFRESH_SECRET=change_me_refresh_secret
GOOGLE_CLIENT_SECRET=your_google_client_secret
GITHUB_WEB_CLIENT_SECRET=your_github_web_client_secret
```

En développement, les secrets peuvent être de longues chaînes aléatoires.

En production, ils doivent être stockés dans les variables d’environnement du serveur ou dans un gestionnaire de secrets.

---

## 13. Scénarios de lancement possibles

| Cas | Backend | Frontend web | Mobile |
|---|---|---|---|
| Tout sur le même PC | PC A | PC A | Téléphone sur le même réseau |
| Backend + mobile seulement | PC A | Non lancé | Téléphone sur le même réseau |
| Backend et frontend sur deux PC | PC A | PC B | Téléphone sur le même réseau |
| Frontend seul | Déjà lancé sur PC A | PC B | Optionnel |

Dans tous les cas, le frontend web et l’application mobile communiquent avec le backend API sur le port `4000`.

L’application mobile ne passe pas par le frontend web.

---

## 14. Lancer toute la version web avec Docker

La version web complète comprend :

- MongoDB ;
- le backend ;
- le frontend web.

### 14.1 Se placer dans le dossier web

Windows :

```powershell
cd C:\supfile-4proj\supfile-web
```

macOS / Linux :

```bash
cd supfile-4proj/supfile-web
```

### 14.2 Lancer les services

```bash
docker compose up --build
```

Cette commande affiche les logs dans le terminal.

### 14.3 Lancer les services en arrière-plan

```bash
docker compose up -d --build
```

Le mode `-d` lance les conteneurs sans afficher les logs en continu.

### 14.4 Accéder au frontend web

Depuis le PC qui lance le frontend :

```txt
http://localhost:5173
```

Depuis un autre appareil du même réseau :

```txt
http://IP_PC_FRONT:5173
```

Exemple :

```txt
http://192.168.1.25:5173
```

---

## 15. Lancer seulement le backend et MongoDB

Ce mode est utile pour tester uniquement l’application mobile ou pour lancer le frontend web sur un autre PC.

Depuis le dossier :

```bash
cd supfile-4proj/supfile-web
```

lancer :

```bash
docker compose up -d --build backend mongodb
```

Le backend sera accessible sur :

```txt
http://localhost:4000
```

ou depuis un autre appareil :

```txt
http://IP_PC_BACK:4000
```

---

## 16. Lancer seulement le frontend web

Il est possible de lancer uniquement le frontend web sur un PC client, séparément du backend.

Ce cas est utile si le backend est déjà lancé sur un autre PC du réseau.

Le fichier utilisé est :

```txt
supfile-web/docker-compose.frontend.yml
```

### 16.1 Configurer le frontend

Dans :

```txt
supfile-web/frontend/.env
```

la variable `VITE_API_URL` doit pointer vers le backend :

```env
VITE_API_URL=http://IP_PC_BACK:4000
```

Exemple :

```env
VITE_API_URL=http://192.168.1.25:4000
```

### 16.2 Lancer le frontend seul

Depuis :

```bash
cd supfile-4proj/supfile-web
```

lancer :

```bash
docker compose -f docker-compose.frontend.yml up --build
```

Ou en arrière-plan :

```bash
docker compose -f docker-compose.frontend.yml up -d --build
```

Le frontend sera accessible depuis le PC client sur :

```txt
http://localhost:5173
```

Depuis un autre appareil du réseau :

```txt
http://IP_PC_FRONT:5173
```

Dans ce cas, le backend doit autoriser l’origine du frontend dans `CORS_ORIGINS`.

---

## 17. Lancer l’application mobile

L’application mobile tourne en dehors de Docker avec Expo.

Elle nécessite que le backend soit déjà lancé.

### 17.1 Vérifier que le backend est lancé

Depuis le dossier `supfile-web` :

```bash
docker compose ps
```

Le service `backend` doit être actif.

### 17.2 Configurer l’URL du backend

Dans :

```txt
supfile-mobile/.env
```

mettre :

```env
EXPO_PUBLIC_API_URL=http://IP_PC_BACK:4000
```

Exemple :

```env
EXPO_PUBLIC_API_URL=http://192.168.1.25:4000
```

Le téléphone et le PC qui lance le backend doivent être sur le même réseau local.

### 17.3 Installer les dépendances mobile

Depuis le dossier mobile :

```bash
cd supfile-4proj/supfile-mobile
npm install
```

### 17.4 Lancer Expo

```bash
npx expo start
```

Si le fichier `.env`, `app.json`, `app.config.js` ou la configuration OAuth a été modifié, utiliser :

```bash
npx expo start -c
```

Le `-c` permet de vider le cache Expo.

### 17.5 Ouvrir l’application sur téléphone

Sur iPhone :

- ouvrir l’appareil photo ;
- scanner le QR code affiché par Expo ;
- ouvrir le lien avec Expo Go.

Sur Android :

- ouvrir Expo Go ;
- scanner le QR code.

### 17.6 Réseau local avec Expo Go

Pour tester avec Expo Go sur un téléphone physique, le téléphone et le PC doivent être sur le même réseau local.

Si l’application ne charge pas sur le téléphone, vérifier :

- que le téléphone et le PC sont sur le même Wi-Fi ;
- que le mode réseau local est activé dans Expo Go si nécessaire ;
- que le pare-feu Windows autorise les connexions ;
- que `EXPO_PUBLIC_API_URL` pointe vers l’adresse IP du PC backend ;
- que le backend est bien lancé sur le port `4000`.

---

## 18. Commandes Docker utiles

### Voir les services actifs

```bash
docker compose ps
```

### Voir les logs du backend

```bash
docker compose logs -f backend
```

### Voir les logs du frontend

```bash
docker compose logs -f frontend
```

### Voir les logs MongoDB

```bash
docker compose logs -f mongodb
```

### Redémarrer le backend

```bash
docker compose restart backend
```

### Arrêter les services

```bash
docker compose down
```

Cette commande arrête les conteneurs mais conserve les données.

### Supprimer les volumes Docker

```bash
docker compose down -v
```

Attention : cette commande peut supprimer les données MongoDB.

---

## 19. Stockage des fichiers

MongoDB stocke les métadonnées :

- utilisateurs ;
- fichiers ;
- dossiers ;
- partages ;
- tokens.

Les fichiers physiques sont stockés dans :

```txt
supfile-web/storage
```

Dans le conteneur backend, ce dossier est monté vers :

```txt
/app/storage
```

Exemple dans `docker-compose.yml` :

```yaml
volumes:
  - ./storage:/app/storage
```

---

## 20. Fonctionnalités principales

SUPFILE permet de :

- créer un compte ;
- se connecter avec email et mot de passe ;
- se connecter avec Google ou GitHub ;
- consulter un tableau de bord ;
- voir l’espace de stockage utilisé ;
- créer des dossiers ;
- uploader des fichiers ;
- rechercher des fichiers et dossiers ;
- filtrer les résultats ;
- prévisualiser certains fichiers ;
- télécharger un fichier ;
- télécharger un dossier au format ZIP ;
- partager un fichier ou dossier par lien public ;
- protéger un lien public avec un mot de passe ou une expiration ;
- partager un élément avec un autre utilisateur ;
- restaurer un élément depuis la corbeille ;
- supprimer définitivement un élément ;
- modifier son avatar ;
- changer son mot de passe ;
- changer le thème clair ou sombre.

---

## 21. Problèmes fréquents

### 21.1 Le mobile ne se connecte pas au backend

Vérifier que :

- le backend est lancé ;
- le téléphone et le PC sont sur le même réseau local ;
- les appareils sont dans le même sous-réseau ;
- `EXPO_PUBLIC_API_URL` utilise l’adresse IP du PC backend ;
- le port `4000` est accessible ;
- Expo a été relancé avec `npx expo start -c` après modification du `.env`.

### 21.2 Le frontend web ne trouve pas l’API

Vérifier le fichier :

```txt
supfile-web/frontend/.env
```

et la variable :

```env
VITE_API_URL=http://IP_PC_BACK:4000
```

Si le frontend et le backend sont utilisés sur le même PC, on peut utiliser :

```env
VITE_API_URL=http://localhost:4000
```

### 21.3 Le backend ne se connecte pas à MongoDB

Vérifier dans le fichier `.env` backend :

```env
MONGODB_URI=mongodb://mongodb:27017/supfile
```

Le nom `mongodb` doit correspondre au nom du service dans `docker-compose.yml`.

### 21.4 Les fichiers uploadés disparaissent après redémarrage

Vérifier que le dossier local est bien monté dans `docker-compose.yml` :

```yaml
./storage:/app/storage
```

### 21.5 Les liens publics ne fonctionnent pas sur mobile ou autre appareil

Vérifier que les liens publics ne pointent pas vers `localhost`.

La variable suivante doit utiliser une adresse accessible par les autres appareils :

```env
BASE_API_URL=http://IP_PC_BACK:4000
```

### 21.6 Les changements du `.env` mobile ne sont pas pris en compte

Relancer Expo avec :

```bash
npx expo start -c
```

### 21.7 Le QR code Expo ne fonctionne pas

Vérifier que :

- le téléphone et le PC sont sur le même Wi-Fi ;
- le mode réseau local est activé dans Expo Go si nécessaire ;
- le pare-feu Windows autorise Expo ou Node.js ;
- le port `8081` n’est pas bloqué.

### 21.8 Le navigateur ou le mobile bloque l’accès

Vérifier que le pare-feu Windows autorise les ports nécessaires sur le réseau privé :

- `4000` pour le backend ;
- `5173` pour le frontend web ;
- `8081` pour Expo.

---

## 22. Sécurité

Quelques règles importantes :

- ne pas envoyer les fichiers `.env` sur GitHub ;
- ne pas partager les secrets JWT ;
- ne pas partager les secrets OAuth ;
- utiliser des valeurs fictives dans les fichiers `.env.example` ;
- ne pas mettre de secret dans les variables `EXPO_PUBLIC_*` ;
- ne pas exposer MongoDB publiquement en production ;
- utiliser HTTPS en production.

---

## 23. Équipe

Projet réalisé dans le cadre du projet 4PROJ.

- ANGOUNE UDUMA Idika Lionnel
- MVOU Charles
- BURLURAUX Jeffrey
- LONGIN Zemo

---

## 24. Statut du projet

En cours de développement.

---

## 25. Licence

Projet académique – usage éducatif.

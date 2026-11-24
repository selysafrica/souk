# Souk · catalogue 3D des logiciels Selys Africa

Vitrine Angular SSR, base SQLite et scènes Three.js. L’accueil présente **Le souk** : un couloir circulaire d’exposition, un tableau par logiciel, qui mène au salon des hôtesses.

| Route | Page |
|---|---|
| `/` | Le souk : film d’entrée aux couleurs Selys, ouverture gala (« boom ») à la fin du film ou au premier défilement, puis le couloir des tableaux ; « Revoir l’animation » relance le film |
| `/admin` | administration du catalogue |

Lien direct vers un produit : `/?produit=tablee` ouvre le souk devant son tableau. Les anciennes adresses `/galerie`, `/etals`, `/coffrets` et `/appareils` redirigent vers l’accueil.

### Le souk

- On avance dans le couloir en faisant défiler la page ; la caméra marque l’arrêt devant chaque tableau, le temps de lire sa fiche (cartel).
- Chaque tableau est peint par le navigateur à partir du produit : son motif suit le type d’écran (formulaire, agenda, plan de salle…), sa palette suit la couleur d’accent saisie dans l’admin. Rien à fournir.
- « Ajouter à mon panier » met la solution de côté (mémorisé dans le navigateur du visiteur). Au bout du couloir, le salon montre le panier et les hôtesses recueillent la demande, question par question.
- La demande arrive dans l’admin (onglet Demandes) avec tous les produits du panier.
- Sans WebGL, les fiches se lisent l’une après l’autre et le salon reste utilisable.

## Démarrer

```bash
npm install
npm start                 # développement : http://localhost:4200
npm run build
PORT=4000 npm run serve:ssr:souk   # production (SSR)
```

Node 22.13 ou plus récent (SQLite natif `node:sqlite`, aucune dépendance à compiler).

## Variables d’environnement

| Variable | Rôle | Par défaut |
|---|---|---|
| `ADMIN_PASSWORD` | mot de passe de `/admin` | `selys-admin` en développement ; **obligatoire en production** |
| `SOUK_DB` | chemin de la base SQLite | `data/souk.db` |
| `ALLOWED_HOSTS` | domaines autorisés pour le rendu SSR, séparés par des virgules | `localhost,127.0.0.1` |
| `PORT` | port du serveur | `4000` |
| `NODE_ENV=production` | cookie de session sécurisé, mot de passe exigé | — |

## Administration

`/admin` permet de :
- ajouter, modifier, supprimer un produit ;
- l’afficher ou le masquer sur la vitrine ;
- changer l’ordre de présentation ;
- choisir la présentation de la page d’accueil (une base existante garde son choix : sélectionner « Le souk » pour l’afficher à l’accueil) ;
- consulter les demandes de démo envoyées par les visiteurs.

La base est créée et remplie au premier lancement à partir de `src/server/seed.ts`. PeopleOS et Selys Rating sont créés **masqués** : à compléter avant publication.

## À fournir par l’équipe Selys

- **Logos** : déposer le fichier dans `public/logos/` (carré, SVG ou PNG), puis saisir `/logos/nom.svg` dans le champ « Logo » du produit. Il est peint au centre de son tableau dans le souk ; sans logo, le nom du produit le remplace. BeaForm, BeaMS Couture, BeaEvent et BeaGec ont le leur ; SAE et Tablée n’en ont pas encore.
- **Captures d’écran** : déposer les fichiers dans `public/captures/` (format paysage 16:10), puis saisir `/captures/nom.png` dans le champ « Capture d’écran » du produit. Elles remplacent les écrans générés, marqués « Visuel provisoire ».
- **Prix** : à saisir dans l’admin ; vide = « Tarif sur demande ».
- **Textes** : les descriptions ont été rédigées à partir des dossiers projets et sont à relire.

## Structure

```
src/server.ts            serveur Express : API + rendu SSR
src/server/db.ts         SQLite (produits, réglages, demandes, sessions)
src/server/api.ts        API publique et admin
src/app/designs/galerie  le souk (les autres présentations ne sont plus routées)
src/app/three/*          scènes Three.js et écrans générés
src/app/shared/*         en-tête, liste des produits, formulaire de démo
src/app/admin/*          administration
```

## Déploiement (Docker, comme BeaEvent)

```bash
git clone <dépôt> souk && cd souk
cp .env.example .env        # APP_DOMAIN, ADMIN_PASSWORD (openssl rand -base64 24), mode d'exposition
deploy/update.sh            # construit l'image, démarre sur 127.0.0.1:4310 et vérifie
```

Exposition HTTPS, une seule option dans `.env` :
- **B (par défaut)** : Nginx du serveur + certbot, avec `deploy/nginx.conf` (ou `deploy/nginx.pprod.conf` pour la préproduction).
- **A** : reverse proxy Docker existant (réseau `selys`), avec `deploy/proxy-network.yml` ; l'app répond sur `souk:4000`.
- **C** : serveur vierge, Caddy dédié avec certificat automatique, avec `deploy/caddy.yml`.

| Commande | Effet |
|---|---|
| `deploy/update.sh` | `git pull`, sauvegarde de la base, reconstruction, redémarrage, vérification |
| `deploy/backup.sh` | copie cohérente de la base dans `backups/` (14 conservées) |

La base SQLite vit dans le volume Docker `souk_souk_data` : les mises à jour ne la touchent pas. Restauration : voir l'en-tête de `deploy/backup.sh`.

## Indexation et partage

- Chaque page est rendue côté serveur avec titre, description, URL canonique, Open Graph, carte Twitter et données structurées (JSON-LD : organisation + liste des logiciels).
- Un lien vers un produit (`/?produit=beagec`) montre le nom, l'accroche et la carte du produit dans WhatsApp, Facebook, LinkedIn ou X.
- Cartes de partage (1200 × 630, JPG) : `public/og/souk.jpg` pour le catalogue et `public/og/<slug>.jpg` par produit. Un produit ajouté sans carte utilise celle du catalogue.
- `/robots.txt` et `/sitemap.xml` sont générés à partir des produits publiés ; `/admin` n'est jamais indexé.
- Les URL absolues utilisent `SITE_URL`, ou à défaut `https://APP_DOMAIN`.
- Après la mise en ligne : déclarer `https://souk.selys-africa.com/sitemap.xml` dans Google Search Console, et vérifier l'aperçu avec le débogueur de partage de Facebook ou le Post Inspector de LinkedIn.

## Son et playlist

- Le bouton haut-parleur de l'en-tête ouvre le panneau « Son et musique » : interrupteur, morceau précédent/suivant, playlist. Le son est coupé par défaut ; le choix et le morceau sont mémorisés.
- Trois morceaux intégrés (Élan, Lagune, Plateau), composés et générés dans le navigateur : aucun fichier, aucun droit à régler.
- Ajouter un morceau : déposer le fichier (MP3/M4A) dans `public/musique/`, puis `/admin` → onglet **Musique** → « Ajouter un morceau » avec le lien `/musique/nom-du-fichier.mp3` et la mention des droits de diffusion (obligatoire).
- Ne diffuser qu'un morceau dont Selys Africa détient les droits (licence, accord écrit de l'artiste ou du label, ou musique libre de droits).

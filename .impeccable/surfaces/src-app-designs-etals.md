---
version: 1
slug: "src-app-designs-etals"
primary_target: "src/app/designs/etals"
related_targets: ["src/app/designs/coffrets","src/app/designs/appareils"]
---

# Surface : catalogue public (trois présentations)

Mode : Persuade. Public : grand public francophone, mobile d'abord, qui découvre les logiciels Selys Africa puis demande une démo. Action : formulaire « Demander une démo » fonctionnel (enregistré en SQLite). Contenu : produits pilotés par SQLite ; visuels d'écran générés et marqués provisoires tant que l'équipe n'a pas fourni ses photos ; aucun prix inventé.

Trois présentations construites, choix par défaut réglable dans l'admin : Étals du souk (défaut, route `/` et `/etals`), Coffrets logiciels (`/coffrets`), Vitrine d'appareils (`/appareils`).

## Direction contract

THESIS: Le catalogue est un marché couvert : chaque logiciel tient son étal, et on remonte l'allée d'étal en étal. Refuse la grille de cartes produits et le hero titre-centré-plus-bouton.

OWN-WORLD: Fond teal Selys `#047A7F` peint comme les murs du marché (stratégie engagée, le teal porte plus de la moitié de la surface), auvents de toile rayée dans l'accent de chaque produit et blanc, turquoise `#43E0D0` pour l'état actif (la barre surélevée du logo), souci `#F2A900` pour la lumière de fin d'après-midi. Bois clair des tables, enseignes peintes. Montserrat 800–900 serrée pour les titres, Montserrat 400–600 pour le texte.

STORY: Le visiteur voit un étal, lit le métier en clair (« Formulaires en ligne »), comprend le produit, passe à l'étal suivant, puis demande une démo sans quitter la page.

FIRST VIEWPORT: Scène WebGL plein cadre de l'allée en perspective ; l'étal actif au premier plan, à droite, avec son écran produit posé sur la table. En bas à gauche, sur le teal : métier en très grand, nom du produit, accroche, bouton « Demander une démo » (principal) et « Voir le détail ». En bas à droite : flèches précédent / suivant et liste des étals. Logo Selys en haut à gauche.

FORM: Les étals du souk, candidat 3 de la main sage (choisi par l'utilisateur), seed:bb8815b177e1d053. Interaction signature : travelling de caméra continu le long de l'allée au changement d'étal (flèches, touches 1–9, glisser), les auvents frémissent, l'enseigne de l'étal actif se balance une fois.

FINISH: unreviewed and undocumented is unfinished; this build ends with the finish review, the verdict, DESIGN.md, and every shipping raster carrying its provenance

## Propositions alternatives

- Coffrets logiciels : chaque produit est un coffret 3D sur présentoir tournant, fond clair teinté teal, le coffret pivote au glisser et s'ouvre pour faire monter l'écran du produit ; rayon de petits coffrets pour choisir.
- Vitrine d'appareils : ordinateur et téléphone 3D sur teal profond `#02292B`, écrans affichant le produit actif, rotation au changement de produit.

## Non résolu

Photos produits, liste de prix et coordonnées de contact réelles à fournir par l'équipe Selys.

# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Stack

Angular SSR (`@angular/ssr` + Express) et base **SQLite** côté serveur pour configurer les produits affichés. 3D et animation : délégué (choix : Three.js pour la scène WebGL, active uniquement dans le navigateur après hydratation, avec un rendu SSR complet et lisible sans WebGL). L'API produits est servie par le même serveur Express que le SSR : un seul processus à déployer.

## Users

- **Visiteurs grand public** : particuliers, entrepreneurs, petites structures qui découvrent l'offre logicielle de Selys Africa, souvent sur mobile, parfois sur un réseau lent. Ils parcourent le catalogue, comprennent ce que fait chaque produit, puis prennent contact ou demandent une démo.
- **Équipe Selys** (administrateurs) : choisit quels produits sont publiés, leur ordre, leurs textes, visuels, prix et mise en avant, via un back-office simple adossé à SQLite.

## Product Purpose

« Souk » est la vitrine du catalogue de logiciels et SaaS de Selys Africa (Selys IT) : une présentation animée en 3D, fluide et vivante, qui fait exister chaque produit comme un objet à part entière. Réussite : un visiteur comprend en quelques secondes ce que fait un produit, a envie d'en voir un autre, puis passe à l'action (contact / démo) ; l'équipe met à jour le catalogue sans toucher au code.

## Positioning

Le catalogue d'un éditeur africain francophone qui conçoit des logiciels métier, chacun pensé pour un usage précis (couture, restauration, formulaires, archivage, RH, courrier, évènements, voix du client). La vitrine montre cette diversité de métiers sous une seule maison.

## Operating Context

- Produits identifiés dans les dossiers voisins du projet (à confirmer et compléter par l'équipe) : **BeaForm** (formulaires en ligne), **BeaMS Couture** (gestion d'atelier pour couturiers, Android), **BeaEvent** (gestion d'évènements), **BeaGec** (gestion électronique du courrier), **SAE / GED** (archivage électronique et gestion documentaire), **PeopleOS** (RH et opérations), **Tablée** (SaaS multi-restaurants : réservation, commande, paiement), **Selys Rating** (plateforme de notation), **VoCx** (écoute de la voix du client).
- Le visiteur arrive depuis les réseaux sociaux, WhatsApp, le site Selys ou un lien direct ; mobile d'abord.

## Capabilities and Constraints

- Les produits affichés, leur ordre, leurs textes, couleurs d'accent, visuels et prix sont pilotés par SQLite et éditables depuis un back-office.
- Rendu SSR obligatoire pour le contenu (référencement, premier affichage rapide) ; la 3D s'active après hydratation, reste fluide sur un mobile moyen et respecte `prefers-reduced-motion`.
- Langue : français.
- Prix : l'équipe dispose d'une liste produits + prix non encore fournie. Aucun prix n'est inventé ; le champ reste vide (« sur demande ») tant qu'il n'est pas saisi.

## Brand Commitments

- Marque : **Selys Africa**, signature « Nos innovations vous distinguent ».
- Logo : quatre barres verticales teal dont la troisième, turquoise, est surélevée ; source `../selysrating/public/brand/selys-logo.png` (horizontal) et `selys-logo-v.png` (vertical).
- Couleurs : teal `#047A7F` (principal), turquoise `#43E0D0` (accent, la barre surélevée). Police : **Montserrat**.

## Evidence on Hand

- Logo Selys Africa (PNG horizontal et vertical).
- Photos produits : l'équipe en dispose, non encore fournies. Les visuels de démonstration sont marqués provisoires.
- Liste produits + prix : à importer dans SQLite ; aucun chiffre ni client de référence à inventer.

## Product Principles

1. Chaque produit est un objet qu'on a envie de toucher : la 3D le fait comprendre, elle ne le décore pas.
2. Le contenu passe avant l'effet : tout reste lisible et accessible sans WebGL.
3. L'équipe Selys garde la main : rien n'est figé dans le code.
4. Une maison, plusieurs métiers : unité de marque, personnalité par produit.

## Accessibility & Inclusion

WCAG 2.2 AA ; `prefers-reduced-motion` respecté ; catalogue 3D navigable au clavier ; performance correcte sur Android d'entrée de gamme en 3G.

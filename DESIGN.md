---
name: Souk, catalogue Selys Africa
description: Une maison, plusieurs métiers ; chaque logiciel tient son étal, son coffret ou son écran.
colors:
  selys-teal: "#047A7F"
  teal-deep: "#035C60"
  teal-night: "#02292B"
  teal-abyss: "#031F21"
  raised-turquoise: "#43E0D0"
  ink: "#0F2830"
  ink-soft: "#2F4A4E"
  white: "#FFFFFF"
  mist: "#E3F6F4"
  night-mist: "#C9E4E2"
  showroom: "#EEF6F5"
  showroom-line: "#C8D8DA"
  workshop: "#F4F8F8"
  workshop-ink-2: "#46636A"
  workshop-line: "#D5E2E3"
  danger: "#B42318"
typography:
  display:
    fontFamily: "'Montserrat Variable', Montserrat, system-ui, -apple-system, 'Segoe UI', sans-serif"
    fontSize: "clamp(2.6rem, 6.4vw, 6rem)"
    fontWeight: 900
    lineHeight: 0.95
    letterSpacing: "-0.035em"
  headline:
    fontFamily: "'Montserrat Variable', Montserrat, system-ui, sans-serif"
    fontSize: "clamp(2.2rem, 5vw, 4rem)"
    fontWeight: 900
    lineHeight: 1.05
    letterSpacing: "-0.03em"
  title:
    fontFamily: "'Montserrat Variable', Montserrat, system-ui, sans-serif"
    fontSize: "clamp(1.5rem, 2.4vw, 2rem)"
    fontWeight: 900
    lineHeight: 1.05
    letterSpacing: "-0.02em"
  lead:
    fontFamily: "'Montserrat Variable', Montserrat, system-ui, sans-serif"
    fontSize: "1.125rem"
    fontWeight: 400
    lineHeight: 1.55
  body:
    fontFamily: "'Montserrat Variable', Montserrat, system-ui, sans-serif"
    fontSize: "1rem"
    fontWeight: 400
    lineHeight: 1.55
    fontFeature: "tnum"
  label:
    fontFamily: "'Montserrat Variable', Montserrat, system-ui, sans-serif"
    fontSize: "0.9375rem"
    fontWeight: 700
    lineHeight: 1.3
rounded:
  mark: "3px"
  focus: "4px"
  field: "14px"
  panel: "22px"
  pill: "999px"
spacing:
  gutter: "clamp(16px, 4vw, 56px)"
  section: "clamp(72px, 10vw, 140px)"
  row: "clamp(28px, 4vw, 44px)"
  stack: "14px"
  inline: "12px"
  container: "1320px"
components:
  button-primary:
    backgroundColor: "{colors.raised-turquoise}"
    textColor: "{colors.ink}"
    typography: "{typography.label}"
    rounded: "{rounded.pill}"
    padding: "0.8em 1.5em"
    height: "48px"
  button-primary-light:
    backgroundColor: "{colors.selys-teal}"
    textColor: "{colors.white}"
    typography: "{typography.label}"
    rounded: "{rounded.pill}"
    padding: "0.8em 1.5em"
    height: "48px"
  button-ghost:
    backgroundColor: "transparent"
    textColor: "{colors.white}"
    typography: "{typography.label}"
    rounded: "{rounded.pill}"
    padding: "0.8em 1.5em"
    height: "48px"
  presentation-switch-active:
    backgroundColor: "{colors.raised-turquoise}"
    textColor: "{colors.ink}"
    rounded: "{rounded.pill}"
    padding: "8px 14px"
    height: "36px"
  field:
    textColor: "{colors.white}"
    rounded: "{rounded.field}"
    padding: "12px 16px"
    height: "52px"
  admin-field:
    backgroundColor: "{colors.white}"
    textColor: "{colors.ink}"
    rounded: "10px"
    padding: "10px 12px"
    height: "44px"
  step-arrow:
    textColor: "{colors.white}"
    rounded: "{rounded.pill}"
    size: "52px"
---

# Design System: Souk, catalogue Selys Africa

## Overview

**Creative North Star : « Le marché couvert Selys »**

Un seul système de marque, trois présentations. Le catalogue est un lieu où l'on circule d'un produit à l'autre : l'allée des étals (défaut), le rayon de coffrets, la vitrine d'appareils. Chaque présentation est une variante du même système : mêmes jetons de marque, même typographie Montserrat, mêmes boutons, mêmes composants partagés (en-tête, index du catalogue, formulaire de démo, pied de page) ; seules les variables de rôle (`--ground`, `--ground-2`, `--fg`, `--fg-2`, `--line`, `--action`, `--action-fg`, `--focus`) sont redéfinies sur l'hôte de chaque présentation.

Le teal Selys est engagé, pas décoratif : il peint le sol et les murs de l'expérience par défaut et en couvre plus de la moitié. Le turquoise est l'état actif, l'écho de la barre surélevée du logo. La personnalité de chaque produit vient de sa couleur d'accent, stockée en base (`--p`) : elle teinte la toile de l'auvent, la face du coffret, la barre de titre de l'écran, la petite barre verticale près du nom. La marque est une maison ; les accents sont ses métiers.

La scène WebGL porte l'objet produit, mais le texte vit dans le DOM, rendu côté serveur, lisible sans 3D. Le mouvement est un travelling qui ralentit longuement (ease-out exponentiel), jamais un rebond ; `prefers-reduced-motion` ramène tout tween à son état final.

**Key Characteristics:**
- Une marque, trois sols : teal (étals), clair teinté teal (coffrets), teal nuit (appareils).
- Rôles redéfinis par présentation, composants partagés inchangés.
- Accent produit piloté par la base, jamais codé en dur dans une feuille de style.
- Montserrat 900 serrée pour le titre, 400–700 pour le texte.
- Formes en pilule pour tout ce qui se touche ; barres verticales arrondies comme marque produit.
- Texte SSR au premier plan, scène 3D en fond, scrim localisé derrière le texte seulement.

## Colors

Un teal de marque engagé, un turquoise réservé à l'action et à l'état actif, des neutres encre, et une couleur d'accent par produit fournie par la base.

### Primary
- **Teal Selys** (selys-teal) : sol de la présentation Étals, fond de la scène 3D, sol de la section formulaire ; dans les présentations claires (Coffrets, admin) il devient la couleur d'action et de focus.
- **Teal profond** (teal-deep) : `--ground-2` des Étals (index du catalogue), murs secondaires, scrim derrière le texte (sous forme `rgba(3, 76, 80, …)`).
- **Teal nuit** (teal-night) et **Teal abysse** (teal-abyss) : sol et sol secondaire de la Vitrine d'appareils.

### Secondary
- **Turquoise surélevé** (raised-turquoise) : bouton principal, onglet actif du sélecteur de présentation, étal actif dans la liste, sélection de texte, anneau de focus sur fonds sombres, coches des fonctionnalités. C'est l'état « choisi ».

### Tertiary
- **Accent produit** (`--p`, valeur `#RRGGBB` saisie dans l'admin, défaut turquoise) : toile rayée des auvents (alternée avec du blanc), face des coffrets, barre de titre des écrans générés, barre-repère près du nom, bordure de l'enseigne. Les valeurs initiales vont de l'ocre au violet ; l'accent ne porte jamais de texte courant.

### Neutral
- **Encre** (ink) : texte sur fonds clairs, texte des boutons turquoise, fond du pied de page sur toutes les présentations.
- **Encre douce** (ink-soft) : texte secondaire des Coffrets.
- **Blanc** (white) : texte sur teal ; rayures des auvents.
- **Brume** (mist) et **Brume de nuit** (night-mist) : texte secondaire sur teal et sur teal nuit.
- **Salle d'exposition** (showroom) et **Filet clair** (showroom-line) : sol et filets des Coffrets ; `--ground-2` y devient blanc.
- **Atelier** (workshop), **Encre atelier** (workshop-ink-2), **Filet atelier** (workshop-line) : sol, texte secondaire et filets du back-office.
- **Danger** (danger) : erreurs de formulaire, sur fond `#FFF1EE` (public) ou `#FDECEA` (admin).

### Named Rules
**La règle de la barre surélevée.** Le turquoise signifie « actif » ou « action principale ». Un seul élément turquoise plein par groupe de contrôle ; ailleurs il n'apparaît qu'en coche, focus ou sélection.

**La règle des rôles.** Une nouvelle présentation ne crée pas de composant : elle redéfinit les huit variables de rôle sur son hôte et réutilise `.btn`, l'en-tête, l'index, le formulaire et le pied de page.

**La règle de l'accent en base.** La couleur d'un produit vient toujours de la donnée (`--p`). Les dérivés se font par `color-mix` (côté : 70 % accent + encre ; dessus : 55 % accent + blanc ; mot mural : 26 % accent dans le sol).

## Typography

**Display Font:** Montserrat Variable (auto-hébergée, avec system-ui)
**Body Font:** Montserrat Variable

**Character:** Une seule famille, poussée aux extrêmes : 900 très serrée pour nommer le métier, 400 aérée pour expliquer. Chiffres tabulaires partout.

### Hierarchy
- **Display** (900, clamp(2.6rem, 6.4vw, 6rem), 0.95, −0.035em) : le métier dans les Étals, le nom du produit dans les Coffrets et le produit actif dans les Appareils. Un seul par écran.
- **Headline** (900, clamp(2.2rem, 5vw, 4rem), −0.03em) : titres de section (index, formulaire de démo).
- **Title** (900, clamp(1.5rem, 2.4vw, 2rem), −0.02em) : nom du produit dans l'index. Les noms de produit de la scène prennent 800 (clamp(1.25rem, 2vw, 1.625rem)).
- **Lead** (400 ou 700, 1.0625–1.1875rem) : accroche produit, intro de section ; largeur 34–40rem.
- **Body** (400, 1rem, 1.55) : descriptions, 62ch maximum.
- **Label** (600–700, 0.8125–0.9375rem) : libellés de champ, liste des étals, sélecteur, prix « Tarif sur demande ».

### Named Rules
**La règle du métier en clair.** Le métier (« Formulaires en ligne ») s'écrit en toutes lettres, en grand, en casse normale. Les seules capitales sont celles des objets du monde : l'enseigne peinte, l'étiquette du coffret, le mot mural des Coffrets.

**La règle de l'équilibre.** Les titres utilisent `text-wrap: balance` et un interlignage de 0.95–1.05 ; les paragraphes `text-wrap: pretty`.

## Layout

Chaque présentation ouvre sur une scène plein cadre (`100svh`, entre 600–640px et 1100px) : la scène 3D en fond absolu, le texte SSR ancré en bas à gauche (Étals, Coffrets) ou en liste verticale à gauche (Appareils), la navigation produit en bas (flèches et liste en pilule, ou rayon de mini-coffrets sur sa planche). L'en-tête est posé en absolu au-dessus de la scène : logo à gauche, liens, sélecteur de présentation en pilule à droite.

Sous la scène, des sections pleine largeur sur `--ground-2` puis `--ground`, contenu limité à 1320px, marges latérales `gutter`, rembourrage vertical `section`. L'index du catalogue est une liste à filets (bordure 1px `--line`), quatre colonnes : marqueur, nom et métier, accroche et fonctionnalités, prix et actions. Le formulaire de démo est en deux colonnes : titre et intro à gauche, champs en grille 2 colonnes à droite.

Responsive : sous 1180px la liste des étals devient un compteur ; sous 760px (860px pour les Appareils) la scène passe en bloc relatif (58svh ou 44svh) et le texte descend sous elle sur fond uni, sans scrim ; les boutons d'action s'étirent ; les liens d'en-tête disparaissent, le sélecteur reste.

## Elevation & Depth

La profondeur vient de la scène 3D et de la lumière, pas des cartes. Les surfaces DOM sont plates ; les ombres sont douces, négatives (spread négatif), et réservées aux objets qu'on prend en main : bouton principal, objets miniatures du catalogue. Le flou d'arrière-plan n'est utilisé que pour les barres flottantes au-dessus de la scène (sélecteur, liste des étals).

### Shadow Vocabulary
- **Pose du bouton** (`box-shadow: 0 10px 24px -12px color-mix(in srgb, var(--ink) 70%, transparent)`) : bouton principal au repos ; au survol `0 16px 30px -14px` à 80 % avec élévation de 2px.
- **Objet posé** (`box-shadow: 0 6px 10px -6px rgba(0,0,0,.5)` à `0 10px 18px -10px rgba(0,0,0,.7)`) : enseigne, coffret et écran miniatures dans l'index.
- **Scrim d'étal** (`radial-gradient(ellipse 62% 70% at 0% 100%, rgba(3,76,80,.95) …)`) : uniquement derrière le texte des Étals, pour que les étals gardent leurs vraies couleurs.

### Named Rules
**La règle de l'objet.** Seul ce qui représente un objet (bouton, enseigne, coffret, écran) porte une ombre. Les sections, champs et listes restent plats.

## Shapes

Pilule (999px) pour tout ce qui se touche et se choisit : boutons, sélecteur, liste des étals, flèches rondes. Champs à coins francs mais doux (14px public, 10px admin), panneau de confirmation à 22px. La marque produit est une barre verticale aux coins à peine arrondis (2–3px, 8–12px de large, 1.4–1.5em de haut) : la barre surélevée du logo, réinterprétée dans l'accent du produit. Les marqueurs de l'index reprennent les matériaux de chaque monde : auvent festonné par masque radial, coffret en CSS 3D, écran à cadre gris.

## Components

### Buttons
Tactiles et francs, une pilule pleine pour agir, une pilule cerclée pour explorer.
- **Shape :** pilule (999px), hauteur minimale 48px, bordure 2px.
- **Primary :** fond `--action`, texte `--action-fg`, 700. Turquoise sur encre dans Étals et Appareils, teal sur blanc dans Coffrets et l'admin. Icône SVG en tête à 1.15em.
- **Hover / Focus :** élévation de 2px et ombre plus longue ; appui `translateY(1px) scale(0.98)` ; focus par anneau 3px `--focus`, décalé de 3px. Transitions 0.25s ease-out.
- **Ghost :** transparent, bordure `--fg` à 70 %, fond `--fg` à 12 % au survol.

### Chips (sélecteur de présentation, liste des étals)
- **Style :** barre en pilule translucide (`--ground` à 78–82 %, flou 8–10px), items en pilule 36–44px, texte `--fg-2` 600.
- **State :** l'actif prend le fond `--action` (via `aria-current`) ; au survol le texte passe à `--fg`. Chaque item de la liste des étals porte la barre d'accent du produit.

### Cards / Containers
Pas de cartes. L'index est une liste à filets ; seul le message de confirmation du formulaire est un panneau (22px, fond `--fg` à 10 %, filet 1px).

### Inputs / Fields
- **Style :** 52px de haut, coins 14px, bordure 2px `--line`, fond `--fg` à 8 % (le champ prend la teinte du sol de la présentation) ; curseur `--action`.
- **Focus :** bordure `--action`, fond à 12 %, pas d'anneau supplémentaire.
- **Error :** bordure `#FFB4A8` sur fond sombre ; message en `danger` sur fond rosé clair.
- **Admin :** fond blanc, 44px, coins 10px, bordure 1.5px, focus avec halo `0 0 0 3px rgba(4,122,127,.18)`.

### Navigation
En-tête absolu sans fond : logo blanc ou couleur selon la tonalité du sol, liens 600 soulignés au survol, sélecteur de présentation en pilule. Navigation produit : flèches rondes 52px (bordure blanche 70 %), touches 1–9, glisser sur la scène.

### Marqueurs de monde (signature)
Dans l'index partagé, chaque ligne porte un marqueur de 120px dans la matière de sa présentation : auvent rayé accent et blanc avec enseigne peinte (Étals), coffret 3D CSS (Coffrets), écran miniature à barre de titre accent (Appareils). La ligne active est mise en avant ; le lien « Voir son étal / le coffret / sur l'écran » ramène la scène au produit.

### Scène 3D (signature)
Rendu Three.js activé après hydratation, en fondu d'opacité (1–1.2s). Les changements de produit sont des tweens à ease-out exponentiel (`1 − 2^(−10t)`) de 700 à 2200ms selon la distance ; aucun tween sous mouvement réduit. Les écrans produits sont générés et signalés provisoires dans le pied de page.

## Do's and Don'ts

### Do:
- **Do** définir une nouvelle présentation par ses huit variables de rôle et réutiliser les composants partagés.
- **Do** tirer toute couleur de produit de `--p` et ses dérivés de `color-mix`.
- **Do** garder le texte produit dans le DOM rendu côté serveur, la 3D en fond.
- **Do** utiliser le turquoise (ou le teal sur fond clair) pour une seule action principale par groupe.
- **Do** utiliser des tweens ease-out exponentiels et respecter `prefers-reduced-motion`.
- **Do** garder des cibles tactiles de 44px minimum (48px pour les boutons).

### Don't:
- **Don't** construire une grille de cartes produits : l'index est une liste à filets.
- **Don't** mettre l'accent produit sur du texte courant ni l'utiliser comme couleur d'action.
- **Don't** étendre le scrim au-delà du texte : les étals doivent garder leurs vraies couleurs.
- **Don't** inventer un prix : sans valeur, « Tarif sur demande ».
- **Don't** ajouter de surtitre en petites capitales au-dessus des titres ; les capitales appartiennent aux enseignes et étiquettes du monde.
- **Don't** utiliser de glyphes ou de police d'icônes : les icônes sont des SVG à trait 2px en `currentColor`.

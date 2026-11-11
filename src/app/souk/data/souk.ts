/*
 * Données du Souk, copiées telles quelles de design/souk.dc.html (source de vérité).
 * SOUK sert de jeu initial à la table « univers » : ensuite, l'administration fait foi.
 */

export type AlleeId = 'gov' | 'client' | 'docs' | 'data' | 'metiers';
export type PaletteId = 'lilac' | 'aqua' | 'peach' | 'sky' | 'pink' | 'butter' | 'mauve' | 'mint' | 'ice';
export type ScreenId = 'agenda' | 'chat' | 'files' | 'dash' | 'people' | 'form' | 'card' | 'rating' | 'queue';

export interface SoukSeed {
  id: string;
  name: string;
  allee: AlleeId;
  pal: PaletteId;
  scr: ScreenId;
  badge: string;
  film: boolean;
  line1: string;
  who: string;
  features: string[];
  screenTitle: string;
  screenCta: string;
}

export const SOUK_ALLEES: Record<AlleeId, string> = { gov: "Gouvernement", client: "Relation client", docs: "Documents & RH", data: "Data & IA", metiers: "Métiers & commerce" };
export const P: Record<PaletteId, [string, string, string, string]> = {
  lilac: ["#C9B8FF", "#9EE7E3", "#F6F1FF", "#9C84F0"],
  aqua: ["#9EE7E3", "#C9B8FF", "#EFFFFD", "#5FC9C2"],
  peach: ["#FFD3B8", "#FFB8DE", "#FFF4EC", "#F09A86"],
  sky: ["#B8D8FF", "#9EE7E3", "#F1F6FF", "#7FA8E8"],
  pink: ["#FFB8DE", "#C9B8FF", "#FFF0F7", "#E58AB8"],
  butter: ["#FFE2A8", "#FFB8C8", "#FFF8EA", "#E8B060"],
  mauve: ["#E6C8FF", "#B8F0E8", "#FAF3FF", "#B48AE8"],
  mint: ["#BFF5D6", "#FFE7A8", "#F2FFF7", "#6FCB97"],
  ice: ["#A8ECF2", "#BFF5D6", "#F0FDFF", "#5FC0CF"]
};
function mk(
  id: string, name: string, allee: AlleeId, pal: PaletteId, scr: ScreenId, badge: string, film: boolean,
  line1: string, who: string, features: string[], screenTitle: string, screenCta: string,
): SoukSeed {
  return { id, name, allee, pal, scr, badge, film, line1, who, features, screenTitle, screenCta };
}
export const SOUK: SoukSeed[] = [
  mk("govagenda", "GovAgenda", "gov", "lilac", "agenda", "", true,
    "L’agenda des autorités, partagé, synchronisé et sécurisé.",
    "Gouvernements, ministères, cabinets et directions.",
    ["Planification des rendez-vous et réunions officielles", "Agendas partagés entre cabinets et services", "Rappels et notifications automatiques", "Accès sécurisé selon les rôles"], "Agenda de la semaine", "Nouveau rendez-vous"),
  mk("avis", "Avisclientele.io", "client", "aqua", "rating", "", false,
    "Le client note le service, et l’agent qui l’a servi. Améliorer · Mesurer · Décider.",
    "Banques, assurances, hôpitaux et institutions publiques.",
    ["Parcours en trois gestes : l’agent, le service, le commentaire", "Les agents reconnus par leur photo, pas par leur nom", "Des émotions animées pour noter en une seconde", "Des retours qui deviennent des décisions"], "Votre avis compte", "Envoyer"),
  mk("selysai", "Selys AI", "data", "pink", "chat", "", true,
    "Des agents IA qui répondent, trient et agissent, jour et nuit.",
    "Entreprises et institutions qui veulent automatiser sans perdre le lien humain.",
    ["Agents IA conçus sur mesure", "Réponses automatiques aux demandes", "Connexion à vos outils existants", "Passage de relais à un humain quand il le faut"], "Assistant Selys AI", "Nouvel agent"),
  mk("archive", "Selys Archive", "docs", "sky", "files", "", true,
    "Archivage physique et numérique, et gouvernance de l’information.",
    "Administrations, banques, entreprises aux fonds documentaires importants.",
    ["Numérisation des fonds papier", "Classement et recherche instantanée", "Conservation et gouvernance sécurisées"], "Fonds d’archives", "Numériser"),
  mk("nfc", "Selys NFC", "metiers", "mauve", "card", "En ligne", true,
    "La carte de visite qui se partage d’un geste. Un tap, et votre profil est chez l’autre.",
    "Professionnels, équipes commerciales, entreprises qui veulent marquer les esprits.",
    ["Cartes de visite NFC reliées à un profil en ligne", "Plateforme MyNFC by Selys (selysnfc.app)", "Ambition : le géant africain de la carte NFC d’ici 2030"], "Ma carte NFC", "Partager"),
  mk("govconnect", "GovConnect", "gov", "ice", "chat", "", true,
    "Le lien direct entre l’administration et les citoyens.",
    "Administrations publiques, ministères et citoyens.",
    ["Point d’entrée unique vers les services publics", "Demandes et suivi en ligne", "Échanges sécurisés entre administration et citoyens"], "Guichet en ligne", "Nouvelle demande"),
  mk("callcenter", "Call Center IA", "client", "peach", "chat", "Démo en ligne", false,
    "L’IA décroche, comprend, et passe la main à un conseiller quand l’appel se complique.",
    "Assureurs, banques, et demain les gouvernements avec un numéro unique.",
    ["Appels passés directement depuis la plateforme web", "Escalade vers un conseiller humain sur les cas complexes", "Chatbot voix ou écrit qui réunit Facebook, Instagram, Messenger et WhatsApp", "Langues locales ajoutées progressivement"], "Conversation en cours", "Transférer"),
  mk("beaged", "BeaGed", "docs", "lilac", "files", "", true,
    "La gestion électronique des documents : tout retrouver en une seconde.",
    "Toute organisation qui croule sous les documents.",
    ["Numérisation et indexation", "Recherche plein texte", "Droits d’accès et gestion des versions"], "Mes documents", "Importer"),
  mk("analytics", "Selys Analytics", "data", "aqua", "dash", "", true,
    "Vos données deviennent des décisions.",
    "Directions générales, ministères et entreprises.",
    ["Tableaux de bord en temps réel", "Indicateurs clés par service", "Analyses et rapports automatiques"], "Tableau de bord", "Exporter"),
  mk("resto", "Selys Resto", "metiers", "butter", "card", "", false,
    "Le restaurant digitalisé par un simple tag NFC posé sur la table.",
    "Restaurants et chaînes de restaurants.",
    ["Menu vidéo et commande ou précommande depuis la table", "Gestion des tables et des serveurs, alarme serveur", "Notation du service par les clients", "Portefeuille rechargeable et livraison mensuelle de repas"], "Table 7", "Commander"),
  mk("bearh", "Bea-RH", "docs", "mint", "people", "", true,
    "Les ressources humaines simplifiées, du dossier collaborateur aux congés.",
    "Directions RH, PME et grandes organisations.",
    ["Dossiers des collaborateurs centralisés", "Congés et absences", "Suivi des équipes et des talents"], "Équipe", "Ajouter"),
  mk("gfa", "GFA", "client", "sky", "queue", "", false,
    "La gestion de file d’attente qui rend l’accueil en agence fluide et serein.",
    "Banques et lieux d’accueil du public.",
    ["Gestion des tickets et des passages en agence"], "Accueil de l’agence", "Appeler le suivant"),
  mk("sante", "Selys Santé Bénin", "gov", "mint", "dash", "En compétition", false,
    "Simplifier le parcours administratif de santé pour chaque citoyen.",
    "L’État, les administrations de santé et les citoyens.",
    ["Candidat au Prix national de la simplification administrative du Bénin"], "Parcours santé", "Suivre"),
  mk("beagec", "BeaGec", "docs", "peach", "files", "", true,
    "La gestion électronique du courrier : chaque courrier suivi, de l’arrivée à la réponse.",
    "Administrations, secrétariats et directions générales.",
    ["Enregistrement des courriers entrants et sortants", "Circuit d’imputation et de validation", "Traçabilité complète de chaque courrier"], "Courrier du jour", "Enregistrer"),
  mk("couture", "Selys Couture", "metiers", "pink", "people", "", false,
    "De la prise de mesure à la satisfaction du client, avec la silhouette modélisée.",
    "Couturiers et ateliers de couture, même peu équipés en numérique.",
    ["Les mesures deviennent une modélisation de la silhouette du client", "Un fichier clients hyper simple, pensé pour tous", "Paiement intégré", "Commission sur les paiements et abonnement"], "Mes clients", "Nouvelle mesure"),
  mk("beaevent", "BeaEvent", "docs", "butter", "agenda", "", true,
    "Organiser un événement, de l’invitation à l’accueil des participants.",
    "Entreprises, institutions et organisateurs d’événements.",
    ["Invitations et inscriptions en ligne", "Badges et accueil des participants", "Suivi en temps réel"], "Programme", "Inviter"),
  mk("erp", "ERP BTP", "metiers", "ice", "dash", "Déjà installé", false,
    "Tout le chantier dans un seul logiciel, de l’administration à la technique, avec l’IA.",
    "Entreprises de construction et de BTP : bâtiments, immeubles, routes.",
    ["Toutes les fonctions de l’entreprise dans une seule plateforme", "IA intégrée au cœur des opérations", "Déjà en service chez un premier groupe BTP"], "Chantiers", "Nouveau chantier"),
  mk("beaform", "BeaForm", "docs", "mauve", "form", "", true,
    "Créer des formulaires en ligne et collecter les réponses sans effort.",
    "Toute équipe qui collecte des informations.",
    ["Création simple de formulaires", "Collecte et export des réponses", "Partage par lien"], "Nouveau formulaire", "Publier"),
  mk("jaya", "Jaya", "metiers", "mint", "people", "", false,
    "Le pont entre ceux qui rêvent un projet et ceux qui peuvent le financer.",
    "Porteurs de projets, jusque dans les villages, advisors et investisseurs.",
    ["Mise en relation porteurs de projets, advisors et investisseurs", "Ouvert aux projets des villes comme des villages"], "Projets à découvrir", "Proposer un projet")
];
export const SOUK_ATELIERS: { id: string; c1: string; c2: string; name: string; text: string }[] = [
  { id: "e1", c1: "#C9B8FF", c2: "#9EE7E3", name: "Archivage numérique & gouvernance", text: "Vos archives papier et numériques, classées, retrouvées en un instant, protégées." },
  { id: "e2", c1: "#FFB8DE", c2: "#C9B8FF", name: "Agents IA", text: "Des assistants intelligents qui travaillent avec vos équipes, sans relâche." },
  { id: "e3", c1: "#FFD3B8", c2: "#FFE2A8", name: "Solutions métier sur mesure", text: "Quand aucune bulle ne vous ressemble encore, on la crée avec vous." },
  { id: "e4", c1: "#A8ECF2", c2: "#B8D8FF", name: "Smart Government", text: "Des administrations plus simples, plus rapides, plus proches des citoyens." },
  { id: "e5", c1: "#9EE7E3", c2: "#BFF5D6", name: "Data Intelligence & Analytics", text: "Des données qui parlent, et des décisions qui suivent." },
  { id: "e6", c1: "#B8D8FF", c2: "#E6C8FF", name: "Cybersécurité & gouvernance", text: "Une protection invisible et constante, pour vos données et vos systèmes." }
];
export const SOUK_CHAPTERS: [number, string, string][] = [[0, "0:00", "L’Afrique numérique"], [4, "0:04", "Notre présence"], [8, "0:08", "La plateforme"], [18, "0:18", "Nos 11 solutions"], [24, "0:24", "Nos expertises"], [35, "0:35", "Nous contacter"]];
export const SOUK_SCREENS = {
  agendaCols: <[string, string[]][]>[["Lun", ["70px", "40px"]], ["Mar", ["110px"]], ["Mer", ["50px", "60px", "30px"]], ["Jeu", ["90px"]], ["Ven", ["40px", "80px"]]],
  bars: [38, 52, 44, 66, 58, 74, 62, 80, 70, 88, 76, 94],
  rowW: ["46%", "38%", "52%", "34%", "44%"],
  rowTag: ["Actif", "En cours", "Actif", "Nouveau", "Actif"],
  fields: ["Nom complet", "Adresse e-mail", "Votre demande", "Pièce jointe"],
  counters: [["Guichet 1", "A 23"], ["Guichet 2", "A 24"], ["Guichet 3", "B 11"], ["Conseiller", "C 05"]],
  mouths: ["M13 28 Q20 22 27 28", "M13 27 Q20 25 27 27", "M13 26 L27 26", "M13 25 Q20 30 27 25", "M12 24 Q20 33 28 24"]
};
export const SOUK_SCENE_MS = 2700;
export const SOUK_SCENES = 6;
export const SOUK_INTRO_ORBS: { x: string; y: string; s: string; c1: string; c2: string; d: string }[] = [
  { x: "-38%", y: "-70%", s: "120px", c1: "#C9B8FF", c2: "#9EE7E3", d: ".05s" },
  { x: "96%", y: "-80%", s: "90px", c1: "#FFB8DE", c2: "#FFD3B8", d: ".2s" },
  { x: "112%", y: "60%", s: "140px", c1: "#9EE7E3", c2: "#B8D8FF", d: ".35s" },
  { x: "-30%", y: "78%", s: "100px", c1: "#FFE2A8", c2: "#FFB8C8", d: ".5s" },
  { x: "40%", y: "-120%", s: "70px", c1: "#BFF5D6", c2: "#9EE7E3", d: ".65s" },
  { x: "52%", y: "128%", s: "80px", c1: "#E6C8FF", c2: "#FFB8DE", d: ".8s" }
];

/** Puces de filtre de la balade, dans l'ordre du design. */
export const SOUK_FILTERS: ['all' | AlleeId, string][] = [
  ['all', 'Tout le souk'],
  ['gov', 'Gouvernement'],
  ['client', 'Relation client'],
  ['docs', 'Documents & RH'],
  ['data', 'Data & IA'],
  ['metiers', 'Métiers & commerce'],
];

export const ALLEE_IDS = Object.keys(SOUK_ALLEES) as AlleeId[];
export const PALETTE_IDS = Object.keys(P) as PaletteId[];
export const SCREEN_IDS: ScreenId[] = ['agenda', 'chat', 'files', 'dash', 'people', 'form', 'card', 'rating', 'queue'];

// A list of common English stop words.
// These words will be visible from the start of the game.
// FIX: Use ES module export instead of attaching to window.
export const COMMON_WORDS = new Set([
]);

/**
 * A static, pre-generated database of related words to avoid API calls during gameplay.
 * The key is the "clue" word (synonym, related term), and the value is the "target" word in the article.
 * In a real-world application, this would be a much larger file generated offline.
 */
// FIX: Use ES module export instead of attaching to window and add type definition.
export const RELATED_WORDS_DB: { [key: string]: string } = {
  // General concepts
  "foyer": "maison",
  "domicile": "maison",
  "résidence": "maison",
  "bâtiment": "édifice",
  "construction": "édifice",
  "automobile": "voiture",
  "véhicule": "voiture",
  "conflit": "guerre",
  "affrontement": "guerre",
  "combat": "bataille",
  "lutte": "bataille",
  "militaire": "soldat",
  "combattant": "soldat",
  "souverain": "roi",
  "monarque": "roi",
  "souveraine": "reine",
  "forteresse": "château",
  "palais": "château",
  "eau": "fleuve",
  "rivière": "fleuve",
  "mer": "océan",
  "navire": "bateau",
  "voilier": "bateau",
  "siècle": "année",
  "décennie": "année",
  "millénaire": "année",
  "couronne": "roi",
  
  // People & Roles
  "auteur": "écrivain",
  "artiste": "peintre",
  "sculpteur": "artiste",
  "musicien": "compositeur",
  "dirigeant": "président",
  "gouvernement": "ministre",
  "parlement": "député",
  "chef": "général",
  "docteur": "médecin",
  "savant": "scientifique",
  "chercheur": "scientifique",
  "athlète": "joueur",
  "sportif": "joueur",
  
  // Actions
  "créer": "développer",
  "construire": "développer",
  "fabriquer": "produire",
  "gagner": "remporter",
  "obtenir": "remporter",
  "diriger": "gouverner",
  "commander": "gouverner",
  "trouver": "découvrir",
  "inventer": "découvrir",
  "commencer": "débuter",
  "terminer": "finir",
  "achever": "finir",

  // Places
  "capitale": "pays",
  "métropole": "ville",
  "nation": "pays",
  "état": "pays",
  "école": "université",
  "collège": "université",
  "aéroport": "avion",
  "gare": "train",
  "port": "bateau",
  "montagne": "sommet",
  "frontière": "pays",

  // Arts & Science
  "tableau": "peinture",
  "oeuvre": "peinture",
  "livre": "roman",
  "mélodie": "musique",
  "chanson": "musique",
  "film": "cinéma",
  "maths": "mathématiques",
  "chiffre": "nombre",
  "mathématique": "nombre",
  "physique": "science",
  "chimie": "science",
  "biologie": "science",
  "astronomie": "science",
  "étoile": "soleil",
  "planète": "terre",
  "roman": "livre",
  "poésie": "livre",
  "théâtre": "pièce",
  "opéra": "musique",
  "symphonie": "musique",
  "scénario": "film",
  "acteur": "film",
  "actrice": "film",
  "réalisateur": "film",
  "caméra": "film",

  // History
  "ancien": "antique",
  "révolution": "histoire",
  "empire": "royaume",
  "dynastie": "royaume",
  "époque": "période",
  "ère": "période",

  // Adjectives
  "grand": "important",
  "essentiel": "important",
  "célèbre": "connu",
  "populaire": "connu",
  "puissant": "influent",
  "riche": "prospère",
  "beau": "joli",
  "difficile": "complexe",
  "facile": "simple",
  "rapide": "vite",
  "lent": "doucement",

  // Family & Derivations
  "royal": "roi",
  "royauté": "roi",
  "présidence": "président",
  "présidentiel": "président",
  "gouvernemental": "gouvernement",
  "historique": "histoire",
  "scientifiquement": "science",
  "musical": "musique",
  "politique": "gouvernement",
  "économique": "économie",
  "religieux": "religion",
  "culturel": "culture",

  // Related Concepts (Objects, Actions, Places)
  "conduire": "voiture",
  "piloter": "avion",
  "naviguer": "bateau",
  "peindre": "peinture",
  "composer": "musique",
  "filmer": "cinéma",
  "voter": "élection",
  "étudier": "école",
  "enseigner": "école",
  "église": "religion",
  "temple": "religion",
  "mosquée": "religion",
  "banque": "argent",
  "hôpital": "médecin",
  "tribunal": "loi",
  "juge": "loi",
  "avocat": "loi",
  "général": "armée",
  "colonel": "armée",
  "soldat": "armée",
  "marine": "bateau",
  "aviation": "avion",
  "infanterie": "armée",

  // Thematic & Abstract
  "liberté": "révolution",
  "égalité": "révolution",
  "justice": "loi",
  "pouvoir": "gouvernement",
  "argent": "économie",
  "amour": "famille",
  "haine": "guerre",
  "paix": "guerre",
  "victoire": "bataille",
  "défaite": "bataille",
  "lumière": "jour",
  "obscurité": "nuit",
  "chaud": "température",
  "froid": "température",
  "démocratie": "gouvernement",
  "république": "gouvernement",
  "monarchie": "roi",
  "dictature": "gouvernement",

  // Technology & Modern Life
  "ordinateur": "technologie",
  "logiciel": "ordinateur",
  "internet": "réseau",
  "téléphone": "communication",
  "électricité": "énergie",
  "moteur": "voiture",

  // Sports & Hobbies
  "football": "sport",
  "tennis": "sport",
  "basket": "sport",
  "ballon": "football",
  "raquette": "tennis",
  
  // Geography
  "paris": "france",
  "londres": "angleterre",
  "berlin": "allemagne",
  "rome": "italie",
  "madrid": "espagne",
  "drapeau": "pays",
  "hymne": "pays",

  // Food & Drink
  "boire": "eau",
  "manger": "nourriture",
  "fruit": "pomme",
  "légume": "carotte",
  "vin": "raisin",
  "fromage": "lait",
  "pain": "farine",
  "sucre": "doux",

  // Nature & Animals
  "animal": "espèce",
  "félin": "chat",
  "canin": "chien",
  "oiseau": "voler",
  "poisson": "nager",
  "insecte": "fourmi",
  "arbre": "forêt",
  "feuille": "arbre",
  "racine": "arbre",
  "fleur": "plante",
  "désert": "sable",
  "volcan": "lave",

  // Body & Health
  "corps": "humain",
  "tête": "cerveau",
  "main": "doigt",
  "pied": "jambe",
  "coeur": "sang",
  "oeil": "vision",
  "oreille": "audition",
  "nez": "odorat",
  "bouche": "parole",
  "maladie": "médecin",
  "guérison": "médecin",

  // Materials & Objects
  "bois": "arbre",
  "métal": "fer",
  "plastique": "pétrole",
  "verre": "sable",
  "tissu": "vêtement",
  "pierre": "roche",
  "papier": "livre",
};

/**
 * A list of semantic categories. If a user guesses a word in one of these sets,
 * it will be considered "close" to any other hidden word from the same set.
 */
// FIX: Use ES module export instead of attaching to window and add type definition.
export const SEMANTIC_CATEGORIES: Set<string>[] = [
  // Time
  new Set(['janvier', 'février', 'mars', 'avril', 'mai', 'juin', 'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre']),
  new Set(['lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi', 'dimanche']),
  
  // Visuals
  new Set(['rouge', 'bleu', 'vert', 'jaune', 'noir', 'blanc', 'orange', 'violet', 'rose', 'marron', 'gris']),
  new Set(['cercle', 'carré', 'triangle', 'rectangle', 'ovale', 'losange', 'pentagone', 'hexagone', 'étoile']),

  // Geography
  new Set(['nord', 'sud', 'est', 'ouest']),
  new Set(['afrique', 'amérique', 'antarctique', 'asie', 'europe', 'océanie']),
  new Set(['mercure', 'vénus', 'terre', 'mars', 'jupiter', 'saturne', 'uranus', 'neptune']),

  // Science & Materials
  new Set(['physique', 'chimie', 'biologie', 'astronomie', 'géologie', 'mathématiques', 'médecine', 'informatique']),
  new Set(['or', 'argent', 'cuivre', 'fer', 'plomb', 'zinc', 'aluminium', 'étain', 'platine']),
  
  // Arts & Culture
  new Set(['piano', 'guitare', 'violon', 'batterie', 'trompette', 'saxophone', 'flûte', 'clarinette', 'basse', 'harpe', 'violoncelle', 'synthétiseur']),
  new Set(['javascript', 'python', 'java', 'c++', 'c#', 'typescript', 'php', 'ruby', 'go', 'swift', 'kotlin', 'rust', 'sql', 'html', 'css']),
  
  // Human Experience
  new Set(['joie', 'tristesse', 'colère', 'peur', 'surprise', 'dégoût', 'amour', 'haine', 'bonheur', 'anxiété', 'jalousie', 'confiance', 'espoir']),
  new Set(['père', 'mère', 'fils', 'fille', 'frère', 'sœur', 'oncle', 'tante', 'cousin', 'cousine', 'grand-père', 'grand-mère']),
];

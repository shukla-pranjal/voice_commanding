export const LANGUAGES = [
  { code: "en-US", name: "English (US)", flag: "🇺🇸", label: "English" },
  { code: "en-IN", name: "English (India)", flag: "🇮🇳", label: "English (IN)" },
  { code: "hi-IN", name: "हिन्दी (Hindi)", flag: "🇮🇳", label: "हिन्दी" },
  { code: "hinglish", name: "Hinglish (Mixed)", flag: "🇮🇳", label: "Hinglish", speechCode: "en-IN" },
  { code: "es-ES", name: "Español", flag: "🇪🇸", label: "Español" },
];

export const LANGUAGE_PROMPTS = {
  "en-US": [
    "Add 2 litres of milk",
    "I need 3 apples and 2 bottles of water",
    "Add two packets of biscuits",
    "Change apples to 5",
    "Remove bread",
    "Undo",
  ],
  "en-IN": [
    "Add 2 packets of milk",
    "I need 1kg onions and 2kg potatoes",
    "Add 1 bottle of cooking oil",
    "Mark eggs as done",
    "Remove bread",
    "Undo",
  ],
  "hi-IN": [
    "मेरी लिस्ट में 2 किलो आलू जोड़ो",
    "1 पैकेट दूध और 1 ब्रेड डालो",
    "दूध खरीद लिया",
    "ब्रेड हटाओ",
    "लिस्ट खाली करो",
    "वापस लो",
  ],
  "hinglish": [
    "2 packet Maggi aur 1 bottle sauce add karo",
    "Meri list mein 2 litre milk add karo",
    "Milk done mark karo",
    "Bread remove karo",
    "List clear karo",
    "Undo karo",
  ],
  "es-ES": [
    "Añadir 2 litros de leche",
    "Comprar 3 manzanas y pan",
    "Eliminar pan",
    "Deshacer",
  ],
};

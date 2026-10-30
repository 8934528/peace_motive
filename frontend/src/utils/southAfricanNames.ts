export interface SouthAfricanName {
  name: string;
  language: string;
}

export const SOUTH_AFRICAN_NAMES: SouthAfricanName[] = [
  // isiXhosa
  { name: "Mihlali", language: "isiXhosa" },
  { name: "Mandla", language: "isiXhosa" },
  { name: "Zola", language: "isiXhosa" },
  { name: "Nomsa", language: "isiXhosa" },
  { name: "Khaya", language: "isiXhosa" },
  { name: "Akhona", language: "isiXhosa" },
  { name: "Buyiswa", language: "isiXhosa" },
  { name: "Vuyani", language: "isiXhosa" },
  { name: "Lwando", language: "isiXhosa" },
  { name: "Simphiwe", language: "isiXhosa" },

  // isiZulu
  { name: "Sipho", language: "isiZulu" },
  { name: "Thabo", language: "isiZulu" },
  { name: "Nandi", language: "isiZulu" },
  { name: "Lindiwe", language: "isiZulu" },
  { name: "Bheki", language: "isiZulu" },
  { name: "Zanele", language: "isiZulu" },
  { name: "Sibusiso", language: "isiZulu" },
  { name: "Mbali", language: "isiZulu" },
  { name: "Jabulani", language: "isiZulu" },
  { name: "Khanyisile", language: "isiZulu" },

  // Setswana
  { name: "Katlego", language: "Setswana" },
  { name: "Kagiso", language: "Setswana" },
  { name: "Lesego", language: "Setswana" },
  { name: "Tebogo", language: "Setswana" },
  { name: "Dineo", language: "Setswana" },
  { name: "Tshepo", language: "Setswana" },
  { name: "Boitumelo", language: "Setswana" },
  { name: "Kabo", language: "Setswana" },
  { name: "Keabetswe", language: "Setswana" },
  { name: "Refilwe", language: "Setswana" },

  // Sepedi
  { name: "Morapedi", language: "Sepedi" },
  { name: "Mahlatse", language: "Sepedi" },
  { name: "Makgabo", language: "Sepedi" },
  { name: "Kholofelo", language: "Sepedi" },
  { name: "Kgomotso", language: "Sepedi" },
  { name: "Thabang", language: "Sepedi" },
  { name: "Malebo", language: "Sepedi" },
  { name: "Phetole", language: "Sepedi" },

  // Sesotho
  { name: "Tumelo", language: "Sesotho" },
  { name: "Karabo", language: "Sesotho" },
  { name: "Lerato", language: "Sesotho" },
  { name: "Palesa", language: "Sesotho" },
  { name: "Relebohile", language: "Sesotho" },
  { name: "Teboho", language: "Sesotho" },
  { name: "Matshediso", language: "Sesotho" },
  { name: "Lehlohonolo", language: "Sesotho" },

  // Afrikaans
  { name: "Pieter", language: "Afrikaans" },
  { name: "Johan", language: "Afrikaans" },
  { name: "Annelise", language: "Afrikaans" },
  { name: "Francois", language: "Afrikaans" },
  { name: "Elize", language: "Afrikaans" },
  { name: "Willem", language: "Afrikaans" },
  { name: "Christo", language: "Afrikaans" },
  { name: "Marike", language: "Afrikaans" },

  // English
  { name: "James", language: "English" },
  { name: "Liam", language: "English" },
  { name: "Chloe", language: "English" },
  { name: "Brandon", language: "English" },
  { name: "Sarah", language: "English" },
  { name: "David", language: "English" },
  { name: "Emily", language: "English" },
  { name: "Jessica", language: "English" },

  // Xitsonga & Tshivenda
  { name: "Ntsako", language: "Xitsonga" },
  { name: "Hlulani", language: "Xitsonga" },
  { name: "Dzunisani", language: "Xitsonga" },
  { name: "Rendani", language: "Tshivenda" },
  { name: "Takalani", language: "Tshivenda" },
  { name: "Vhutshilo", language: "Tshivenda" }
];

export function getRandomSouthAfricanNames(
  count: number,
  excludeNames: string[] = []
): SouthAfricanName[] {
  const excludeLower = new Set(excludeNames.map((n) => n.trim().toLowerCase()));
  const pool = SOUTH_AFRICAN_NAMES.filter(
    (item) => !excludeLower.has(item.name.toLowerCase())
  );

  // Shuffle
  const shuffled = [...pool].sort(() => Math.random() - 0.5);

  // unique languages to be chosen
  const chosen: SouthAfricanName[] = [];
  const chosenLanguages = new Set<string>();

  for (const item of shuffled) {
    if (chosen.length >= count) break;
    if (!chosenLanguages.has(item.language)) {
      chosen.push(item);
      chosenLanguages.add(item.language);
    }
  }

  
  
  if (chosen.length < count) {
    for (const item of shuffled) {
      if (chosen.length >= count) break;
      if (!chosen.some((c) => c.name === item.name)) {
        chosen.push(item);
      }
    }
  }

  return chosen.slice(0, count);
}

// Nationalités (ESPN les donne en anglais) → français, et âge à partir de la date de naissance.

const FR: Record<string, string> = {
  France: "France", Senegal: "Sénégal", Morocco: "Maroc", "Ivory Coast": "Côte d’Ivoire", "Cote d'Ivoire": "Côte d’Ivoire",
  Cameroon: "Cameroun", Belgium: "Belgique", Germany: "Allemagne", Spain: "Espagne", Netherlands: "Pays-Bas", Switzerland: "Suisse",
  Norway: "Norvège", Denmark: "Danemark", Algeria: "Algérie", Tunisia: "Tunisie", Mali: "Mali", Guinea: "Guinée",
  "DR Congo": "RD Congo", "Congo DR": "RD Congo", Congo: "Congo", Portugal: "Portugal", Brazil: "Brésil", Argentina: "Argentine",
  Sweden: "Suède", Poland: "Pologne", Scotland: "Écosse", England: "Angleterre", Japan: "Japon", "South Korea": "Corée du Sud",
  "Korea Republic": "Corée du Sud", Jordan: "Jordanie", Canada: "Canada", USA: "États-Unis", "United States": "États-Unis",
  Austria: "Autriche", Ghana: "Ghana", Nigeria: "Nigeria", Gabon: "Gabon", Comoros: "Comores", Haiti: "Haïti", Greece: "Grèce",
  Italy: "Italie", Croatia: "Croatie", Serbia: "Serbie", Ukraine: "Ukraine", "Czech Republic": "Tchéquie", Czechia: "Tchéquie",
  Turkey: "Turquie", Türkiye: "Turquie", Wales: "Pays de Galles", Ireland: "Irlande", "Republic of Ireland": "Irlande",
  Uruguay: "Uruguay", Colombia: "Colombie", Mexico: "Mexique", Egypt: "Égypte", "Burkina Faso": "Burkina Faso",
  "Cape Verde": "Cap-Vert", "Cape Verde Islands": "Cap-Vert", Benin: "Bénin", Togo: "Togo", Iceland: "Islande", Finland: "Finlande",
  Hungary: "Hongrie", Romania: "Roumanie", Slovakia: "Slovaquie", Slovenia: "Slovénie", Georgia: "Géorgie", Israel: "Israël",
  Australia: "Australie", Chile: "Chili", Paraguay: "Paraguay", Ecuador: "Équateur", Peru: "Pérou", Venezuela: "Venezuela",
  "Equatorial Guinea": "Guinée équatoriale", "Guinea-Bissau": "Guinée-Bissau", Angola: "Angola", Zambia: "Zambie", Kosovo: "Kosovo",
  Albania: "Albanie", "North Macedonia": "Macédoine du Nord", Montenegro: "Monténégro", "Bosnia-Herzegovina": "Bosnie-Herzégovine",
  "Bosnia and Herzegovina": "Bosnie-Herzégovine", Luxembourg: "Luxembourg", Mauritania: "Mauritanie", Madagascar: "Madagascar",
};

export function nationalityFr(n: string | null | undefined): string | null {
  if (!n) return null;
  return FR[n] ?? n;
}

export function ageOn(birth: Date | null | undefined, now = new Date()): number | null {
  if (!birth) return null;
  let a = now.getUTCFullYear() - birth.getUTCFullYear();
  const m = now.getUTCMonth() - birth.getUTCMonth();
  if (m < 0 || (m === 0 && now.getUTCDate() < birth.getUTCDate())) a--;
  return a >= 0 && a < 80 ? a : null;
}

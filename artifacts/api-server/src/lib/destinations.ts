export type DestinationType = "city" | "region" | "mountains" | "nature" | "spa" | "landmark";

export type Destination = {
  id: string;
  slug: string;
  nameSk: string;
  nameEn: string;
  type: DestinationType;
  parentId: string | null;
  editorialOrder: number;
  center: { latitude: number; longitude: number };
  radiusKm: number;
  image: string | null;
};

const item = (
  slug: string, nameSk: string, nameEn: string, type: DestinationType,
  parentId: string | null, editorialOrder: number, latitude: number,
  longitude: number, radiusKm: number, image: string | null = null,
): Destination => ({
  id: slug, slug, nameSk, nameEn, type, parentId, editorialOrder,
  center: { latitude, longitude }, radiusKm, image,
});

export const destinations: Destination[] = [
  item("bratislava", "Bratislava", "Bratislava", "city", null, 1, 48.1486, 17.1077, 18, "/bratislava.avif"),
  item("kosice", "Košice", "Košice", "city", null, 2, 48.7164, 21.2611, 18, "/kosice.avif"),
  item("vysoke-tatry", "Vysoké Tatry", "High Tatras", "mountains", null, 3, 49.1717, 20.1300, 35, "/destinations/vysoke-tatry-krivan-1200.avif"),
  item("strbske-pleso", "Štrbské Pleso", "Štrbské Pleso", "nature", "vysoke-tatry", 4, 49.1192, 20.0632, 8, "/destinations/strbske-pleso-1200.avif"),
  item("poprad", "Poprad", "Poprad", "city", "vysoke-tatry", 5, 49.0554, 20.3014, 15, "/poprad.avif"),
  item("liptov", "Liptov", "Liptov", "region", null, 6, 49.0167, 19.5833, 42, "/destinations/liptov-liptovska-mara-1200.avif"),
  item("liptovsky-mikulas", "Liptovský Mikuláš", "Liptovský Mikuláš", "city", "liptov", 7, 49.0811, 19.6192, 15, "/destinations/liptovsky-mikulas-namestie-1200.avif"),
  item("ruzomberok", "Ružomberok", "Ružomberok", "city", "liptov", 8, 49.0748, 19.3075, 16, "/Ružomberok.avif"),
  item("nizke-tatry", "Nízke Tatry", "Low Tatras", "mountains", null, 9, 48.9469, 19.5894, 45, "/destinations/nizke-tatry-hreben-1200.avif"),
  item("jasna", "Jasná", "Jasná", "nature", "nizke-tatry", 10, 48.9715, 19.5841, 12, "/destinations/jasna-chopok-1200.avif"),
  item("horehronie", "Horehronie", "Horehronie", "region", null, 11, 48.8077, 19.6394, 43, "/destinations/horehronie-chmarossky-viadukt-1200.avif"),
  item("slovensky-raj", "Slovenský raj", "Slovak Paradise", "nature", null, 12, 48.9365, 20.4098, 28, "/destinations/slovensky-raj-sucha-bela-1200.avif"),
  item("spisska-nova-ves", "Spišská Nová Ves", "Spišská Nová Ves", "city", "slovensky-raj", 13, 48.9446, 20.5615, 16, "/Spišská-Nová-Ves.avif"),
  item("banska-stiavnica", "Banská Štiavnica", "Banská Štiavnica", "landmark", null, 14, 48.4589, 18.8964, 18, "/destinations/banska-stiavnica-panorama-1200.avif"),
  item("banska-bystrica", "Banská Bystrica", "Banská Bystrica", "city", null, 15, 48.7363, 19.1462, 18, "/Banska_Bystrica.avif"),
  item("zilina", "Žilina", "Žilina", "city", null, 16, 49.2231, 18.7394, 18, "/zilina.avif"),
  item("mala-fatra", "Malá Fatra", "Malá Fatra", "mountains", null, 17, 49.2020, 19.0500, 35, "/destinations/mala-fatra-hreben-1200.avif"),
  item("terchova", "Terchová", "Terchová", "nature", "mala-fatra", 18, 49.2589, 19.0294, 16, "/destinations/terchova-velky-rozsutec-1200.avif"),
  item("orava", "Orava", "Orava", "region", null, 19, 49.3000, 19.5500, 48, "/destinations/orava-oravska-priehrada-1200.avif"),
  item("oravsky-hrad", "Oravský hrad", "Orava Castle", "landmark", "orava", 20, 49.2619, 19.3585, 16, "/destinations/oravsky-hrad-1200.avif"),
  item("pieniny", "Pieniny", "Pieniny", "nature", null, 21, 49.4000, 20.4500, 27, "/destinations/pieniny-dunajec-plte-1200.avif"),
  item("bardejov", "Bardejov", "Bardejov", "city", null, 22, 49.2920, 21.2753, 16, "/Bardejov.avif"),
  item("bardejovske-kupele", "Bardejovské Kúpele", "Bardejov Spa", "spa", "bardejov", 23, 49.3291, 21.2711, 8, "/destinations/bardejovske-kupele-astoria-1200.avif"),
  item("piestany", "Piešťany", "Piešťany", "spa", null, 24, 48.5918, 17.8272, 14, "/destinations/piestany-kupelny-ostrov-thermia-palace-1200.avif"),
  item("trencianske-teplice", "Trenčianske Teplice", "Trenčianske Teplice", "spa", null, 25, 48.9097, 18.1669, 12, "/destinations/trencianske-teplice-kupelny-park-1200.avif"),
  item("bojnice", "Bojnice", "Bojnice", "landmark", null, 26, 48.7797, 18.5773, 14, "/destinations/bojnice-zamok-1200.avif"),
  item("trencin", "Trenčín", "Trenčín", "city", null, 27, 48.8945, 18.0444, 18, "/trencin.avif"),
  item("nitra", "Nitra", "Nitra", "city", null, 28, 48.3061, 18.0764, 18, "/nitra.avif"),
  item("trnava", "Trnava", "Trnava", "city", null, 29, 48.3774, 17.5883, 18, "/trnava.avif"),
  item("presov", "Prešov", "Prešov", "city", null, 30, 48.9984, 21.2396, 18, "/presov.avif"),
  item("velka-fatra", "Veľká Fatra", "Veľká Fatra", "mountains", null, 31, 48.9500, 19.0800, 36, "/destinations/velka-fatra-krizna-1200.avif"),
  item("muranska-planina", "Muránska planina", "Muráň Plateau", "nature", null, 32, 48.7700, 20.0300, 30, "/destinations/muranska-planina-panorama-1200.avif"),
  item("poloniny", "Poloniny", "Poloniny", "nature", null, 33, 49.0500, 22.3500, 35),
  item("slovensky-kras", "Slovenský kras", "Slovak Karst", "nature", null, 34, 48.6000, 20.5500, 38),
  item("zemplinska-sirava", "Zemplínska šírava", "Zemplínska Šírava", "nature", null, 35, 48.7970, 22.0000, 20),
];

export const destinationBySlug = new Map(destinations.map((destination) => [destination.slug, destination]));

export type LegacyAccommodation = {
  _id?: string;
  location?: { latitude?: number | string; longitude?: number | string };
  locationDetails?: { city?: string };
  [key: string]: unknown;
};

const toRadians = (degrees: number) => degrees * Math.PI / 180;
const searchKey = (value: unknown) => String(value ?? "")
  .normalize("NFD")
  .replace(/\p{Diacritic}/gu, "")
  .toLocaleLowerCase("sk")
  .trim()
  .replace(/\s+/g, " ");

const destinationCityMembership: Record<string, string[]> = {
  "vysoke-tatry": ["Vysoké Tatry", "Vysoká Tatry", "Ždiar", "Stará Lesná", "Tatranská Lomnica", "Veľká Lomnica", "Nová Lesná", "Dolný Smokovec", "Starý Smokovec", "Horný Smokovec", "Tatranská Lesná", "Tatranská Polianka", "Tatranské Zruby", "Štôla", "Mengusovce", "Batizovce", "Veľký Slavkov", "Mlynica"],
  "strbske-pleso": ["Štrbské Pleso", "Štrba", "Tatranská Štrba"],
  liptov: ["Liptovský Mikuláš", "Liptovský Trnovec", "Liptovský Ján", "Liptovský Hrádok", "Liptovská Sielnica", "Liptovské Revúce", "Liptovské Sliače", "Liptovská Kokava", "Ružomberok", "Bešeňová", "Bešenová", "Ižipovce", "Pribylina", "Závažná Poruba", "Bobrovec", "Pavčina Lehota", "Pavcina Lehota", "Uhorská Ves", "Malatíny", "Lazisko", "Kvačany", "Kvacany", "Ivachnová", "Svätý Kríž", "Trstené"],
  "nizke-tatry": ["Demänovská Dolina", "Jasná", "Donovaly", "Mýto pod Ďumbierom", "Vyšná Boca", "Nižná Boca", "Bystrá", "Tále", "Horná Lehota", "Liptovský Ján", "Závažná Poruba", "Pavčina Lehota", "Pavcina Lehota"],
  jasna: ["Demänovská Dolina", "Jasná", "Pavčina Lehota", "Pavcina Lehota"],
  horehronie: ["Brezno", "Mýto pod Ďumbierom", "Bystrá", "Tále", "Horná Lehota", "Donovaly", "Telgárt", "Heľpa", "Závadka nad Hronom", "Čierny Balog"],
  "slovensky-raj": ["Mlynky", "Smižany", "Dedinky", "Hrabušice", "Stratená", "Vernár", "Spišské Tomášovce", "Spišská Nová Ves", "Dobšiná"],
  "mala-fatra": ["Terchová", "Vrátna", "Belá", "Zázrivá", "Varín", "Štefanová"],
  orava: ["Dolný Kubín", "Oravská Lesná", "Námestovo", "Trstená", "Zuberec", "Habovka", "Oravský Podzámok", "Tvrdošín", "Bobrov", "Hruštín"],
  "oravsky-hrad": ["Oravský Podzámok", "Dolný Kubín"],
  pieniny: ["Červený Kláštor", "Lesnica", "Spišská Stará Ves", "Majere", "Jezersko", "Haligovce"],
  "bardejovske-kupele": ["Bardejovské Kúpele"],
  "velka-fatra": ["Martin", "Valča", "Valca", "Blatnica", "Turčianske Teplice", "Horná Štubňa", "Čremošné", "Cremošné", "Liptovské Revúce"],
  "muranska-planina": ["Muráň", "Muránska Huta", "Tisovec", "Pohronská Polhora", "Revúca"],
  poloniny: ["Nová Sedlica", "Ulič", "Stakčín", "Snina", "Runina", "Brestov"],
  "slovensky-kras": ["Rožňava", "Krásnohorská Dlhá Lúka", "Betliar", "Jovice", "Silica", "Plešivec", "Gemerská Hôrka"],
  "zemplinska-sirava": ["Vinné", "Kaluža", "Klokočov", "Kusín", "Michalovce", "Zemplínska Šírava"],
};

export const isAccommodationInDestination = (
  accommodation: LegacyAccommodation,
  destination: Destination,
) => {
  const accommodationCity = searchKey(accommodation.locationDetails?.city);
  if (accommodationCity) {
    const configuredCities = destinationCityMembership[destination.slug]
      ?? [destination.nameSk];
    return configuredCities.some((city) => searchKey(city) === accommodationCity);
  }

  const latitude = Number(accommodation.location?.latitude);
  const longitude = Number(accommodation.location?.longitude);
  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) return false;
  if (Math.abs(latitude - 48.669026) < 0.0001 && Math.abs(longitude - 19.699024) < 0.0001) {
    return false;
  }

  const latitudeDelta = toRadians(latitude - destination.center.latitude);
  const longitudeDelta = toRadians(longitude - destination.center.longitude);
  const a = Math.sin(latitudeDelta / 2) ** 2
    + Math.cos(toRadians(destination.center.latitude))
    * Math.cos(toRadians(latitude))
    * Math.sin(longitudeDelta / 2) ** 2;
  return 6371 * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)) <= destination.radiusKm;
};
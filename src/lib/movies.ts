import type { Locale } from "@/i18n/types";

export type MovieItem = {
  id: string;
  ar: string;
  en: string;
  aliasesAr: string[];
  aliasesEn: string[];
  genreAr: string;
  genreEn: string;
  year: string;
  hintAr: string;
  hintEn: string;
};

export const MOVIE_BANK: MovieItem[] = [
  { id: "titanic", ar: "تايتنك", en: "Titanic", aliasesAr: ["تايتانيك", "التيتانيك"], aliasesEn: ["titanic"], genreAr: "دراما رومانسية", genreEn: "Romance drama", year: "1997", hintAr: "سفينة تغرق وأغنية مشهورة", hintEn: "A sinking ship and a famous song" },
  { id: "inception", ar: "انسبشن", en: "Inception", aliasesAr: ["البداية", "اينسبشن"], aliasesEn: ["inception"], genreAr: "خيال علمي", genreEn: "Sci-fi", year: "2010", hintAr: "أحلام داخل أحلام", hintEn: "Dreams inside dreams" },
  { id: "avatar", ar: "افاتار", en: "Avatar", aliasesAr: ["أفاتار"], aliasesEn: ["avatar"], genreAr: "خيال علمي", genreEn: "Sci-fi", year: "2009", hintAr: "كائنات زرقاء على كوكب بعيد", hintEn: "Blue beings on a distant planet" },
  { id: "lionking", ar: "الاسد الملك", en: "The Lion King", aliasesAr: ["الأسد الملك", "ليون كينغ"], aliasesEn: ["lion king", "the lion king"], genreAr: "رسوم", genreEn: "Animation", year: "1994", hintAr: "أسد صغير يهرب ثم يعود للملك", hintEn: "A young lion returns to claim the throne" },
  { id: "frozen", ar: "فروزن", en: "Frozen", aliasesAr: ["متجمد", "ملكة الثلج"], aliasesEn: ["frozen", "elsa"], genreAr: "رسوم", genreEn: "Animation", year: "2013", hintAr: "أختان ومملكة ثلج", hintEn: "Two sisters and a snow kingdom" },
  { id: "homealone", ar: "وحده في البيت", en: "Home Alone", aliasesAr: ["وحده بالبيت", "هوم الون"], aliasesEn: ["home alone"], genreAr: "كوميديا", genreEn: "Comedy", year: "1990", hintAr: "طفل يدافع عن البيت ضد لصين", hintEn: "A kid defends the house from two burglars" },
  { id: "joker", ar: "الجوكر", en: "Joker", aliasesAr: ["جوكر"], aliasesEn: ["joker"], genreAr: "دراما", genreEn: "Drama", year: "2019", hintAr: "مهرج مجنون في مدينة مظلمة", hintEn: "A troubled clown in a dark city" },
  { id: "interstellar", ar: "انترستيلار", en: "Interstellar", aliasesAr: ["إنترستيلار", "بين النجوم"], aliasesEn: ["interstellar"], genreAr: "خيال علمي", genreEn: "Sci-fi", year: "2014", hintAr: "سفر عبر الثقوب السوداء لإنقاذ الأرض", hintEn: "Black holes and saving Earth" },
  { id: "godfather", ar: "العراب", en: "The Godfather", aliasesAr: ["جود فاذر", "الأب الروحي"], aliasesEn: ["godfather", "the godfather"], genreAr: "جريمة", genreEn: "Crime", year: "1972", hintAr: "عائلة مافيا إيطالية", hintEn: "An Italian mafia family" },
  { id: "spiderman", ar: "سبايدر مان", en: "Spider-Man", aliasesAr: ["الرجل العنكبوت", "سبايدرمان"], aliasesEn: ["spiderman", "spider man"], genreAr: "أكشن", genreEn: "Action", year: "2002", hintAr: "شاب يلدغه عنكبوت ويصير بطلاً", hintEn: "Bitten by a spider, becomes a hero" },
  { id: "harrypotter", ar: "هاري بوتر", en: "Harry Potter", aliasesAr: ["هاريبوتر"], aliasesEn: ["harry potter", "potter"], genreAr: "فانتازيا", genreEn: "Fantasy", year: "2001", hintAr: "مدرسة سحر ونظارة دائرية", hintEn: "A magic school and round glasses" },
  { id: "avengers", ar: "افنجرز", en: "The Avengers", aliasesAr: ["المنتقمون", "افنجر"], aliasesEn: ["avengers", "the avengers"], genreAr: "أكشن", genreEn: "Action", year: "2012", hintAr: "أبطال خارقون يتجمعون", hintEn: "Superheroes assemble" },
  { id: "toystory", ar: "توي ستوري", en: "Toy Story", aliasesAr: ["حكاية لعبة", "حكايه لعبه"], aliasesEn: ["toy story"], genreAr: "رسوم", genreEn: "Animation", year: "1995", hintAr: "ألعاب تعيش لما الناس تغيب", hintEn: "Toys come alive when humans leave" },
  { id: "nemo", ar: "نيمو", en: "Finding Nemo", aliasesAr: ["البحث عن نيمو"], aliasesEn: ["finding nemo", "nemo"], genreAr: "رسوم", genreEn: "Animation", year: "2003", hintAr: "أب سمكة يبحث عن ابنه", hintEn: "A father fish searches for his son" },
  { id: "up", ar: "اب", en: "Up", aliasesAr: ["فوق"], aliasesEn: ["up"], genreAr: "رسوم", genreEn: "Animation", year: "2009", hintAr: "بيت يطير ببالونات", hintEn: "A house flies with balloons" },
  { id: "shrek", ar: "شريك", en: "Shrek", aliasesAr: ["شريط"], aliasesEn: ["shrek"], genreAr: "رسوم", genreEn: "Animation", year: "2001", hintAr: "غول أخضر وأميره", hintEn: "A green ogre and a princess" },
  { id: "matrix", ar: "الماتريكس", en: "The Matrix", aliasesAr: ["ماتريكس"], aliasesEn: ["matrix", "the matrix"], genreAr: "خيال علمي", genreEn: "Sci-fi", year: "1999", hintAr: "حبة حمراء أو زرقاء", hintEn: "Red pill or blue pill" },
  { id: "jaws", ar: "الفك المفترس", en: "Jaws", aliasesAr: ["جوز", "قرش"], aliasesEn: ["jaws"], genreAr: "رعب", genreEn: "Thriller", year: "1975", hintAr: "قرش يهاجم شاطئاً", hintEn: "A shark attacks a beach" },
  { id: "jurassic", ar: "الحديقه الجوراسيه", en: "Jurassic Park", aliasesAr: ["جوراسيك بارك", "الحديقة الجوراسية"], aliasesEn: ["jurassic park", "jurassic"], genreAr: "مغامرة", genreEn: "Adventure", year: "1993", hintAr: "ديناصورات تفلت من حديقة", hintEn: "Dinosaurs escape a park" },
  { id: "darkknight", ar: "الفارس المظلم", en: "The Dark Knight", aliasesAr: ["باتمان", "دارك نايت"], aliasesEn: ["dark knight", "batman"], genreAr: "أكشن", genreEn: "Action", year: "2008", hintAr: "بطل بقناع خفاش ضد مهرج", hintEn: "A bat-masked hero vs a clown" },
  { id: "ironman", ar: "ايرون مان", en: "Iron Man", aliasesAr: ["الرجل الحديدي", "ايرونمان"], aliasesEn: ["iron man", "ironman"], genreAr: "أكشن", genreEn: "Action", year: "2008", hintAr: "بدلة حديد وطائرة", hintEn: "A flying iron suit" },
  { id: "coco", ar: "كوكو", en: "Coco", aliasesAr: ["فيفا"], aliasesEn: ["coco"], genreAr: "رسوم", genreEn: "Animation", year: "2017", hintAr: "يوم الموتى وموسيقى المكسيك", hintEn: "Day of the Dead and Mexican music" },
  { id: "insideout", ar: "انسايد اوت", en: "Inside Out", aliasesAr: ["من الداخل", "المشاعر"], aliasesEn: ["inside out"], genreAr: "رسوم", genreEn: "Animation", year: "2015", hintAr: "مشاعر تعيش داخل رأس فتاة", hintEn: "Emotions live inside a girl's mind" },
  { id: "moana", ar: "موانا", en: "Moana", aliasesAr: ["وايانا"], aliasesEn: ["moana", "vaiana"], genreAr: "رسوم", genreEn: "Animation", year: "2016", hintAr: "فتاة تبحر لإنقاذ الجزيرة", hintEn: "A girl sails to save her island" },
  { id: "aladdin", ar: "علاء الدين", en: "Aladdin", aliasesAr: ["علاءالدين", "علاءدين"], aliasesEn: ["aladdin"], genreAr: "فانتازيا", genreEn: "Fantasy", year: "1992", hintAr: "مصباح سحري وجني", hintEn: "A magic lamp and a genie" },
  { id: "starwars", ar: "حرب النجوم", en: "Star Wars", aliasesAr: ["ستار وورز"], aliasesEn: ["star wars", "starwars"], genreAr: "خيال علمي", genreEn: "Sci-fi", year: "1977", hintAr: "سيوف ضوئية ومجرة بعيدة", hintEn: "Lightsabers in a galaxy far away" },
  { id: "forrest", ar: "فورست غامب", en: "Forrest Gump", aliasesAr: ["فورست جامب", "فورست"], aliasesEn: ["forrest gump", "forrest"], genreAr: "دراما", genreEn: "Drama", year: "1994", hintAr: "رجل يجري كثيراً ويحب الشوكولاتة", hintEn: "A man who runs a lot and loves chocolate" },
  { id: "fast", ar: "السرعه والغضب", en: "Fast and Furious", aliasesAr: ["فاست اند فيوريس", "السرعة والغضب"], aliasesEn: ["fast and furious", "fast furious"], genreAr: "أكشن", genreEn: "Action", year: "2001", hintAr: "سيارات سباق وعائلة", hintEn: "Street racing and family" },
  { id: "pirates", ar: "قراصنه الكاريبي", en: "Pirates of the Caribbean", aliasesAr: ["قراصنة الكاريبي", "جاك سبارو"], aliasesEn: ["pirates of the caribbean", "jack sparrow"], genreAr: "مغامرة", genreEn: "Adventure", year: "2003", hintAr: "قرصان سكران وسفينة مسحورة", hintEn: "A drunk pirate and a cursed ship" },
  { id: "kungfu", ar: "كونغ فو باندا", en: "Kung Fu Panda", aliasesAr: ["كونغفو باندا", "باندا"], aliasesEn: ["kung fu panda", "kungfu panda"], genreAr: "رسوم", genreEn: "Animation", year: "2008", hintAr: "باندا يتعلم فنون القتال", hintEn: "A panda learns martial arts" },
  { id: "dragon", ar: "كيف تروض تنينك", en: "How to Train Your Dragon", aliasesAr: ["تنينك", "هيكو"], aliasesEn: ["how to train your dragon", "toothless"], genreAr: "رسوم", genreEn: "Animation", year: "2010", hintAr: "صبي يصاحب تنيناً أسود", hintEn: "A boy befriends a black dragon" },
  { id: "minions", ar: "المينيون", en: "Minions", aliasesAr: ["مينيونز"], aliasesEn: ["minions", "despicable me"], genreAr: "رسوم", genreEn: "Animation", year: "2015", hintAr: "كائنات صفراء تتكلم لغة غريبة", hintEn: "Yellow creatures with a silly language" },
  { id: "message", ar: "الرساله", en: "The Message", aliasesAr: ["الرسالة"], aliasesEn: ["the message", "message"], genreAr: "تاريخي", genreEn: "Historical", year: "1976", hintAr: "فيلم عن فجر الإسلام", hintEn: "A film about the dawn of Islam" },
  { id: "omar", ar: "عمر المختار", en: "Lion of the Desert", aliasesAr: ["اسد الصحراء"], aliasesEn: ["lion of the desert", "omar mukhtar"], genreAr: "تاريخي", genreEn: "Historical", year: "1981", hintAr: "مقاوم ليبي ضد الاحتلال", hintEn: "A Libyan resistance leader" },
  { id: "blueelephant", ar: "الفيل الازرق", en: "The Blue Elephant", aliasesAr: ["الفيل الأزرق", "الفيل الازرق"], aliasesEn: ["blue elephant"], genreAr: "غموض", genreEn: "Thriller", year: "2014", hintAr: "طبيب نفسي يدخل مستشفى مجانين", hintEn: "A psychiatrist enters a mental hospital" },
  { id: "kitkat", ar: "الكيت كات", en: "Kit Kat", aliasesAr: ["كيت كات", "الكيتكات"], aliasesEn: ["kit kat", "kitkat"], genreAr: "دراما", genreEn: "Drama", year: "1991", hintAr: "حي شعبي في القاهرة ومقعد", hintEn: "A Cairo alley and a wheelchair" },
  { id: "hassan", ar: "حسن ومرقص", en: "Hassan and Marcus", aliasesAr: ["حسن و مرقص"], aliasesEn: ["hassan and marcus"], genreAr: "كوميديا", genreEn: "Comedy", year: "2008", hintAr: "شيخ وقسيس يتبادلان الهوية", hintEn: "A sheikh and a priest swap identities" },
  { id: "yaqubian", ar: "عماره يعقوبيان", en: "The Yacoubian Building", aliasesAr: ["عمارة يعقوبيان"], aliasesEn: ["yacoubian building"], genreAr: "دراما", genreEn: "Drama", year: "2006", hintAr: "عمارة قديمة في وسط القاهرة", hintEn: "An old building in downtown Cairo" },
  { id: "ellemby", ar: "اللمبي", en: "Ellembi", aliasesAr: ["اللمبى", "لمبي"], aliasesEn: ["ellembi", "el lemby"], genreAr: "كوميديا", genreEn: "Comedy", year: "2002", hintAr: "شخصية شعبية كوميدية لمحمد سعد", hintEn: "Mohamed Saad's famous comic character" },
  { id: "saeedi", ar: "صعيدي في الجامعه الامريكيه", en: "Saidi in the American University", aliasesAr: ["صعيدي في الجامعة الأمريكية"], aliasesEn: ["saidi american university"], genreAr: "كوميديا", genreEn: "Comedy", year: "1998", hintAr: "شاب من الصعيد يدخل جامعة أجنبية", hintEn: "An Upper Egyptian joins a foreign university" },
  { id: "nazir", ar: "الناظر", en: "The Principal", aliasesAr: ["الناظر"], aliasesEn: ["el nazer", "the principal"], genreAr: "كوميديا", genreEn: "Comedy", year: "2000", hintAr: "مدرسة ومعلم يصير مديراً", hintEn: "A teacher becomes a school principal" },
  { id: "weladrezq", ar: "ولاد رزق", en: "Sons of Rizk", aliasesAr: ["اولاد رزق"], aliasesEn: ["sons of rizk", "welad rizk"], genreAr: "أكشن", genreEn: "Action", year: "2015", hintAr: "إخوة لصوص في القاهرة", hintEn: "Brother thieves in Cairo" },
  { id: "corridor", ar: "الممر", en: "The Passage", aliasesAr: ["الممر"], aliasesEn: ["the passage", "el mamarr"], genreAr: "حربي", genreEn: "War", year: "2019", hintAr: "جنود مصريون في حرب أكتوبر", hintEn: "Egyptian soldiers in the October war" },
  { id: "kira", ar: "كيره والجن", en: "Kira & El Gin", aliasesAr: ["كيرة والجن"], aliasesEn: ["kira and el gin"], genreAr: "تاريخي", genreEn: "Historical", year: "2022", hintAr: "ثورة 1919 في مصر", hintEn: "Egypt's 1919 revolution" },
  { id: "capernaum", ar: "كفرناحوم", en: "Capernaum", aliasesAr: ["كفر ناحوم"], aliasesEn: ["capernaum"], genreAr: "دراما", genreEn: "Drama", year: "2018", hintAr: "طفل لبناني يرفع قضية على والديه", hintEn: "A Lebanese boy sues his parents" },
  { id: "theeb", ar: "ذيب", en: "Theeb", aliasesAr: ["الذيب"], aliasesEn: ["theeb"], genreAr: "مغامرة", genreEn: "Adventure", year: "2014", hintAr: "صبي بدوي في صحراء الأردن", hintEn: "A Bedouin boy in the Jordanian desert" },
  { id: "hangover", ar: "هانغ اوفر", en: "The Hangover", aliasesAr: ["الخمار", "الهانغ اوفر"], aliasesEn: ["hangover", "the hangover"], genreAr: "كوميديا", genreEn: "Comedy", year: "2009", hintAr: "ثلاثة أصدقاء يفقدون العريس في لاس فيغاس", hintEn: "Three friends lose the groom in Las Vegas" },
  { id: "et", ar: "اي تي", en: "E.T.", aliasesAr: ["ايتي", "الكائن الفضائي"], aliasesEn: ["et", "e.t.", "extra terrestrial"], genreAr: "خيال علمي", genreEn: "Sci-fi", year: "1982", hintAr: "طفل يصادق كائناً فضائياً", hintEn: "A boy befriends an alien" },
  { id: "backfuture", ar: "العوده للمستقبل", en: "Back to the Future", aliasesAr: ["العودة للمستقبل"], aliasesEn: ["back to the future"], genreAr: "خيال علمي", genreEn: "Sci-fi", year: "1985", hintAr: "سيارة زمن ودكتور مجنون", hintEn: "A time-travel car and a mad scientist" },
];

export const MOVIE_ROUND_OPTIONS = [
  { value: "5", label: "5" },
  { value: "8", label: "8" },
  { value: "10", label: "10" },
  { value: "12", label: "12" },
  { value: "15", label: "15" },
];

export function shuffleMovies(count: number): MovieItem[] {
  const arr = [...MOVIE_BANK];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j]!, arr[i]!];
  }
  return arr.slice(0, Math.min(count, arr.length));
}

export function movieTitle(item: MovieItem, locale: Locale) {
  return locale === "en" ? item.en : item.ar;
}

export function movieGenre(item: MovieItem, locale: Locale) {
  return locale === "en" ? item.genreEn : item.genreAr;
}

export function movieHint(item: MovieItem, locale: Locale) {
  return locale === "en" ? item.hintEn : item.hintAr;
}

export function movieMatches(guess: string, item: MovieItem, normalize: (s: string) => string) {
  const g = normalize(guess);
  if (!g) return false;
  const keys = [item.ar, item.en, ...item.aliasesAr, ...item.aliasesEn]
    .map((x) => normalize(x))
    .filter(Boolean);
  return keys.some((key) => {
    if (g === key) return true;
    if (key.length >= 4 && g.includes(key)) return true;
    if (g.length >= 4 && key.includes(g)) return true;
    return false;
  });
}

import type { BadgeColors } from "@/components/base/badges/badge-types";

export type SeriesPosterTone = "sakura" | "night" | "gold" | "teal" | "ink" | "rose";

export type SeriesItem = {
    id: string;
    slug: string;
    category: string;
    categoryColor: BadgeColors;
    title: string;
    excerpt: string;
    cast: string;
    channel?: string;
    airDate?: string;
    runtime?: string;
    synopsis: string;
    tags: string[];
    poster: {
        tone: SeriesPosterTone;
        eyebrow: string;
        headline: string;
        sub: string;
    };
};

export const SERIES_POSTER_TONES: Record<SeriesPosterTone, string> = {
    sakura: "from-utility-pink-400 via-utility-pink-200 to-utility-sky-300",
    night: "from-utility-indigo-800 via-utility-purple-600 to-utility-pink-400",
    gold: "from-utility-yellow-400 via-utility-orange-400 to-utility-pink-500",
    teal: "from-utility-green-800 via-utility-green-600 to-utility-yellow-400",
    ink: "from-utility-neutral-900 via-utility-neutral-700 to-utility-red-700",
    rose: "from-utility-brand-700 via-utility-brand-500 to-utility-orange-200",
};

export const MOCK_SERIES: SeriesItem[] = [
    {
        id: "1",
        slug: "iroha-no-koi-wa-toki-wo-kakeru",
        category: "Dramas",
        categoryColor: "brand",
        title: "[ซับไทย] รักข้ามเวลาของอิโรฮะ – Iroha no Koi wa Toki wo Kakeru",
        excerpt:
            "นำแสดงโดย : คามิชิราอิชิ โมเนะ , มุไค โคจิ (Snow Man) เริ่ม 13 ตุลาคม 2026 เวลา 22.00 น. ช่อง TBS เรื่องย่อ : ละครโรแมนติกคอมเมดี้ที่ข้ามกาลเวลากว่า…",
        cast: "คามิชิราอิชิ โมเนะ, มุไค โคจิ (Snow Man)",
        channel: "TBS",
        airDate: "13 ตุลาคม 2026 · 22:00",
        runtime: "ประมาณ 10 ตอน",
        synopsis:
            "ละครโรแมนติกคอมเมดี้ที่ข้ามกาลเวลา อิโรฮะพบว่าตัวเองถูกส่งไปมาระหว่างอดีตและปัจจุบัน จนต้องเผชิญความสัมพันธ์ที่ไม่คาดคิดกับหนุ่มปริศนา พร้อมทั้งค้นหาความหมายของความรักในทุกยุคสมัย",
        tags: ["ซับไทย", "โรแมนติก", "คอมเมดี้", "ข้ามเวลา"],
        poster: {
            tone: "sakura",
            eyebrow: "TBS · Autumn 2026",
            headline: "いろはの恋は時をかける",
            sub: "Time-crossing romance comedy",
        },
    },
    {
        id: "2",
        slug: "love-not-comedy",
        category: "Movies",
        categoryColor: "indigo",
        title: "[ซับไทย] Love≠Comedy รักนี้ไม่ใช่คอมเมดี้",
        excerpt:
            "นำแสดงโดย : นากาจิม่า เคนโตะ , นากาฮามะ เนรุ เรื่องย่อ : เรย์จิ นักแสดงหนุ่มสุดฮอตผู้ได้รับฉายาว่า “หนุ่มหล่อ 360 องศา” อยากเปลี่ยนบทบาทให้จริงจังขึ้น…",
        cast: "นากาจิม่า เคนโตะ, นากาฮามะ เนรุ",
        channel: "โรงภาพยนตร์ / Online",
        airDate: "2026",
        runtime: "ประมาณ 120 นาที",
        synopsis:
            "เรย์จิ นักแสดงหนุ่มสุดฮอตผู้ได้รับฉายาว่า “หนุ่มหล่อ 360 องศา” มักมีผลงานแนวเลิฟคอมเมดี้ ในวัย 30 ปี เขาอยากเปลี่ยนบทบาทให้จริงจังขึ้น แต่กลับมีงานแนวเลิฟคอมเมดี้เข้ามาอีกครั้ง จนต้องเผชิญทั้งภาพลักษณ์และหัวใจของตัวเอง",
        tags: ["ซับไทย", "ภาพยนตร์", "เลิฟคอม"],
        poster: {
            tone: "gold",
            eyebrow: "Movie · Thai Sub",
            headline: "Love≠Comedy",
            sub: "รักนี้ไม่ใช่คอมเมดี้",
        },
    },
    {
        id: "3",
        slug: "oni-no-hanayome",
        category: "Movies",
        categoryColor: "indigo",
        title: "[ซับไทย] Oni no Hanayome เจ้าสาวอสูร",
        excerpt:
            "นำแสดงโดย : นางาเสะ เร็น , โยชิคาวะ ไอ เรื่องราวความรักระหว่างปีศาจและมนุษย์ เมื่อยูซุถูกเรย์ยะเลือกให้เป็นเจ้าสาวของเขา…",
        cast: "นางาเสะ เร็น, โยชิคาวะ ไอ",
        channel: "Online",
        airDate: "2025",
        runtime: "ประมาณ 110 นาที",
        synopsis:
            "เรื่องราวความรักระหว่างปีศาจและมนุษย์ เมื่อจู่ๆ ยูซุ หญิงสาวที่ไม่เคยได้รับความรัก ถูกเรย์ยะ หัวหน้าเผ่าปีศาจคนต่อไป เลือกให้เป็นเจ้าสาวของเขา การเผชิญหน้าครั้งนี้คือจุดเริ่มต้นของโชคชะตาทั้งคู่",
        tags: ["ซับไทย", "แฟนตาซี", "โรแมนติก"],
        poster: {
            tone: "night",
            eyebrow: "Fantasy Romance",
            headline: "鬼の花嫁",
            sub: "เจ้าสาวอสูร",
        },
    },
    {
        id: "4",
        slug: "mission",
        category: "Movies",
        categoryColor: "indigo",
        title: "[ซับไทย] M.I.S.S.I.O.N. ปฏิบัติการสายลับมิวสิคคัล",
        excerpt:
            "นำแสดงโดย : มิจิเอดะ ชุนสุเกะ ภาพยนตร์ 2 ชั่วโมงจบ เรื่องย่อ : นายตำรวจหนุ่มต้องแฝงตัวในมหาวิทยาลัยศิลปะ เพื่อสืบคดีระเบิดโดรนต่อเนื่อง…",
        cast: "มิจิเอดะ ชุนสุเกะ",
        channel: "Online",
        airDate: "2025",
        runtime: "ประมาณ 120 นาที",
        synopsis:
            "มาสึมิ คานาตะ นายตำรวจหนุ่มหัวดีแต่เข้าสังคมไม่เก่ง ได้รับมอบหมายภารกิจลับให้แฝงตัวเข้าไปสืบสวนในมหาวิทยาลัยศิลปะ ซึ่งต้องสงสัยว่ามีคนร้ายในคดีระเบิดโดรนต่อเนื่อง และเพื่อความเนียนเขาต้องเปลี่ยนภาพลักษณ์ครั้งใหญ่",
        tags: ["ซับไทย", "สายลับ", "มิวสิคคัล"],
        poster: {
            tone: "teal",
            eyebrow: "Spy Musical",
            headline: "M.I.S.S.I.O.N.",
            sub: "ปฏิบัติการสายลับมิวสิคคัล",
        },
    },
    {
        id: "5",
        slug: "autumn-2026-thu-sun",
        category: "Blogs",
        categoryColor: "gray",
        title: "ละครญี่ปุ่น 2026 Autumn (2) : พฤหัสบดี – อาทิตย์",
        excerpt:
            "วันพฤหัส Analog Nurse นำแสดงโดย : มัตสึชิตะ นาโอะ เริ่ม 22 ตุลาคม 2026 เวลา 21.00 น. ช่อง TV Asahi เรื่องย่อ : แม้จะอยู่ในยุคดิจิทัลและมี AI…",
        cast: "มัตสึชิตะ นาโอะ และนักแสดงตามตาราง",
        channel: "หลายช่อง",
        airDate: "ตุลาคม 2026",
        synopsis:
            "รวมตารางละครญี่ปุ่น Autumn 2026 ช่วงพฤหัสบดีถึงอาทิตย์ พร้อมไฮไลต์เรื่องน่าจับตา นักแสดงนำ และเวลาออกอากาศสำหรับติดตามแบบไม่พลาด",
        tags: ["ตารางออกอากาศ", "Autumn 2026", "ไกด์"],
        poster: {
            tone: "rose",
            eyebrow: "Schedule Guide",
            headline: "2026 Autumn",
            sub: "พฤหัสบดี – อาทิตย์",
        },
    },
    {
        id: "6",
        slug: "black-showman",
        category: "Movies",
        categoryColor: "indigo",
        title: "[ซับไทย] Black Showman – แบล็ก โชว์แมน กับคดีฆาตกรรมในเมืองไร้ชื่อ",
        excerpt:
            "นำแสดงโดย : ฟุคุยามะ มาซาฮารุ, อาริมุระ คาสุมิ เข้าโรงญี่ปุ่น 12 กันยายน 2025 เรื่องย่อ : ลูกสาวร่วมมือกับคุณอาอดีตนักมายากลเพื่อคลี่คลายคดี…",
        cast: "ฟุคุยามะ มาซาฮารุ, อาริมุระ คาสุมิ",
        channel: "โรงภาพยนตร์ญี่ปุ่น",
        airDate: "12 กันยายน 2025",
        runtime: "ประมาณ 130 นาที",
        synopsis:
            "คุณพ่อที่เป็นครูมัธยมต้นถูกใครบางคนฆ่า ลูกสาวจึงกลับมาบ้านเกิดและร่วมมือกับคุณอาอดีตนักมายากลในลาสเวกัส เพื่อคลี่คลายคดีฆาตกรรมในเมืองที่เต็มไปด้วยความลับ",
        tags: ["ซับไทย", "มิสเทอรี่", "ระทึกขวัญ"],
        poster: {
            tone: "ink",
            eyebrow: "Mystery Thriller",
            headline: "Black Showman",
            sub: "คดีฆาตกรรมในเมืองไร้ชื่อ",
        },
    },
];

export function getSeriesBySlug(slug: string) {
    return MOCK_SERIES.find((item) => item.slug === slug);
}

export function getRelatedSeries(slug: string, limit = 3) {
    const current = getSeriesBySlug(slug);
    if (!current) return MOCK_SERIES.slice(0, limit);

    const sameCategory = MOCK_SERIES.filter((item) => item.slug !== slug && item.category === current.category);
    const others = MOCK_SERIES.filter((item) => item.slug !== slug && item.category !== current.category);
    return [...sameCategory, ...others].slice(0, limit);
}

export function toSeriesCardItem(item: SeriesItem) {
    return {
        id: item.id,
        href: `/series/${item.slug}`,
        category: item.category,
        categoryColor: item.categoryColor,
        categoryHref: "/series",
        title: item.title,
        excerpt: item.excerpt,
        poster: item.poster,
    };
}

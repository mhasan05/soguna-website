/**
 * Static copy and constants that are not managed through the admin panel.
 * Everything else (notices, events, members, money, settings, lists) comes from the API.
 */

export const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL || "https://soguna.org").replace(/\/$/, "");
export const ORG_NAME = "সগুনা আদর্শ যুব সমাজ";
export const ORG_PLACE = "বেলকুচি, সিরাজগঞ্জ";
export const MAP_EMBED = "https://maps.google.com/maps?q=Belkuchi,Sirajganj,Bangladesh&z=12&output=embed";

/** Wikimedia Commons stand-in photos used for static page art. */
export const photo = (file: string, width = 800) => `https://commons.wikimedia.org/wiki/Special:FilePath/${file}?width=${width}`;

export const EDUCATION = ["প্রাথমিক", "এসএসসি / দাখিল", "এইচএসসি / আলিম", "স্নাতক", "স্নাতকোত্তর"];

export const TIMELINE = [
  { year: 2018, text: "বন্যায় ত্রাণ বিতরণ দিয়ে যাত্রা শুরু" },
  { year: 2020, text: "করোনাকালে ২০০ পরিবারে খাদ্য সহায়তা" },
  { year: 2023, text: "রক্তদাতা তালিকা তৈরি, প্রথম রক্তদান ক্যাম্প" },
  { year: 2026, text: "ওয়েবসাইট চালু — সবার জন্য স্বচ্ছ হিসাব" },
];

export const VILLAGE_PLACES = [
  { name: "সগুনা কেন্দ্রীয় জামে মসজিদ", kind: "মসজিদ" },
  { name: "সগুনা সরকারি প্রাথমিক বিদ্যালয়", kind: "স্কুল" },
  { name: "সগুনা দাখিল মাদ্রাসা", kind: "মাদ্রাসা" },
  { name: "সগুনা বাজার", kind: "বাজার · প্রতি শনি ও মঙ্গলবার হাট" },
  { name: "সগুনা কমিউনিটি ক্লিনিক", kind: "স্বাস্থ্যসেবা" },
];

export const CONSTITUTION = [
  { title: "সদস্যপদের যোগ্যতা", points: ["সগুনা গ্রামের স্থায়ী বাসিন্দা বা গ্রামের সন্তান (প্রবাসীসহ)", "বয়স কমপক্ষে ১৬ বছর", "সংগঠনের নিয়ম মেনে চলার অঙ্গীকার"] },
  { title: "মাসিক চাঁদা", points: ["প্রতি মাসে নির্ধারিত চাঁদা — পরিমাণ কমিটি ঠিক করবে", "bKash, Nagad বা কোষাধ্যক্ষকে নগদ দেওয়া যাবে", "সব আয়-ব্যয়ের হিসাব সদস্যরা সাইটে দেখতে পারবেন"] },
  { title: "সভার নিয়ম", points: ["প্রতি মাসে একটি সাধারণ সভা", "জরুরি প্রয়োজনে সভাপতি বিশেষ সভা ডাকতে পারবেন", "সংগঠন রাজনৈতিকভাবে নিরপেক্ষ থাকবে"] },
];

export const NOTICE_CATEGORY_TONE: Record<string, "red" | "green" | "gold" | "neutral"> = {
  জরুরি: "red",
  শোকসংবাদ: "red",
  সভা: "green",
  ইভেন্ট: "gold",
};

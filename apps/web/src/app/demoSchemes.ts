import type { SchemeRuleNode } from "@agro/rules-engine";

export interface DemoScheme {
  id: string;
  isMock: boolean;
  titleEn: string;
  titleKn: string;
  titleHi: string;
  benefitEn: string;
  benefitKn: string;
  benefitHi: string;
  departmentEn: string;
  departmentKn: string;
  departmentHi: string;
  department: string;
  ruleTree: SchemeRuleNode;
  documentsEn: string[];
  documentsKn: string[];
  documentsHi: string[];
  sourceUrl: string;
  checkedOn: string;
  deadlineIso: string | null;
  deadlineVerified: boolean;
}

export const DEMO_SCHEMES: DemoScheme[] = [
  {
    id: "pm-kisan-official",
    isMock: false,
    titleEn: "PM-KISAN (Pradhan Mantri Kisan Samman Nidhi)",
    titleKn: "ಪಿಎಂ-ಕಿಸಾನ್ (ಪ್ರಧಾನ ಮಂತ್ರಿ ಕಿಸಾನ್ ಸಮ್ಮಾನ್ ನಿಧಿ)",
    titleHi: "पीएम-किसान (प्रधानमंत्री किसान सम्मान निधि)",
    benefitEn: "₹6,000 per year in 3 equal instalments of ₹2,000 via DBT",
    benefitKn: "ವರ್ಷಕ್ಕೆ ₹6,000 ಡಿಬಿಟಿ ಮೂಲಕ ನೇರವಾಗಿ ಬ್ಯಾಂಕ್ ಖಾತೆಗೆ (₹2,000 ರ 3 ಕಂತುಗಳು)",
    benefitHi: "डीबीटी के माध्यम से ₹6,000 प्रति वर्ष ₹2,000 की 3 समान किस्तों में",
    departmentEn: "Ministry of Agriculture & Farmers Welfare, GoI",
    departmentKn: "ಕೃಷಿ ಮತ್ತು ರೈತರ ಕಲ್ಯಾಣ ಸಚಿವಾಲಯ, ಭಾರತ ಸರ್ಕಾರ",
    departmentHi: "कृषि एवं किसान कल्याण मंत्रालय, भारत सरकार",
    department: "Ministry of Agriculture & Farmers Welfare, GoI",
    ruleTree: {
      all: [
        {
          id: "pmkisan-state",
          fact: "state",
          op: "eq",
          value: "Karnataka",
          descriptionEn: "You farm in India (Karnataka)",
          descriptionKn: "ನೀವು ಭಾರತದಲ್ಲಿ (ಕರ್ನಾಟಕ) ಕೃಷಿ ಮಾಡುತ್ತೀರಿ",
        },
        {
          id: "pmkisan-own",
          fact: "ownershipTypes",
          op: "in",
          value: ["OWNER", "JOINT_FAMILY"],
          descriptionEn: "You hold cultivable land",
          descriptionKn: "ನೀವು ಸಾಗುವಳಿ ಮಾಡಬಹುದಾದ ಜಮೀನು ಹೊಂದಿದ್ದೀರಿ",
          requiresOfficialVerification: true,
        },
      ],
    },
    documentsEn: ["Aadhaar Card (eKYC)", "Land Pahani / RTC", "Aadhaar-linked Bank Account"],
    documentsKn: ["ಆಧಾರ್ ಕಾರ್ಡ್ (ಇ-ಕೆವೈಸಿ)", "ಜಮೀನಿನ ಪಹಣಿ / ಆರ್‍ಟಿಸಿ", "ಆಧಾರ್ ಜೋಡಿಸಲಾದ ಬ್ಯಾಂಕ್ ಖಾತೆ"],
    documentsHi: ["आधार कार्ड (ई-केवाईसी)", "भूमि खसरा / खतौनी", "आधार से जुड़ा बैंक खाता"],
    sourceUrl: "https://pmkisan.gov.in/",
    checkedOn: "2026-11-01",
    deadlineIso: null,
    deadlineVerified: true,
  },
  {
    id: "pmfby-official",
    isMock: false,
    titleEn: "PMFBY (Pradhan Mantri Fasal Bima Yojana)",
    titleKn: "ಪಿಎಂಎಫ್‌ಬಿವೈ (ಪ್ರಧಾನ ಮಂತ್ರಿ ಫಸಲ್ ಬಿಮಾ ಯೋಜನೆ)",
    titleHi: "पीएमएफबीवाई (प्रधानमंत्री फसल बीमा योजना)",
    benefitEn: "Comprehensive risk coverage against natural crop loss at 2% / 1.5% subsidized premium",
    benefitKn: "ನೈಸರ್ಗಿಕ ಬೆಳೆ ನಷ್ಟಕ್ಕೆ ಶೇ. 2 / 1.5 ರ ಸಬ್ಸಿಡಿ ಪ್ರೀಮಿಯಂನಲ್ಲಿ ಸಮಗ್ರ ವಿಮಾ ರಕ್ಷಣೆ",
    benefitHi: "प्राकृतिक फसल नुकसान के खिलाफ 2% / 1.5% रियायती प्रीमियम पर व्यापक जोखिम कवर",
    departmentEn: "Ministry of Agriculture & Farmers Welfare, GoI",
    departmentKn: "ಕೃಷಿ ಮತ್ತು ರೈತರ ಕಲ್ಯಾಣ ಸಚಿವಾಲಯ, ಭಾರತ ಸರ್ಕಾರ",
    departmentHi: "कृषि एवं किसान कल्याण मंत्रालय, भारत सरकार",
    department: "Ministry of Agriculture & Farmers Welfare, GoI",
    ruleTree: {
      all: [
        {
          id: "pmfby-crop",
          fact: "crops",
          op: "in",
          value: ["PADDY", "RAGI", "TUR", "MAIZE"],
          descriptionEn: "You grow a notified food or oilseed crop",
          descriptionKn: "ನೀವು ಅಧಿಸೂಚಿತ ಆಹಾರ ಅಥವಾ ಎಣ್ಣೆಕಾಳು ಬೆಳೆ ಬೆಳೆಯುತ್ತೀರಿ",
        },
      ],
    },
    documentsEn: ["Land RTC / Pahani", "Crop Sowing Certificate", "Bank Passbook Copy"],
    documentsKn: ["ಪಹಣಿ / ಆರ್‍ಟಿಸಿ ದಾಖಲೆ", "ಬೆಳೆ ಬಿತ್ತನೆ ದೃಢೀಕರಣ", "ಬ್ಯಾಂಕ್ ಪಾಸ್‌ಬುಕ್ ಪ್ರತಿ"],
    documentsHi: ["भूमि आरटीसी / खसरा", "फसल बुवाई प्रमाण पत्र", "बैंक पासबुक प्रति"],
    sourceUrl: "https://pmfby.gov.in/",
    checkedOn: "2026-11-01",
    deadlineIso: "2026-12-31T23:59:59.000Z",
    deadlineVerified: true,
  },
  {
    id: "kcc-official",
    isMock: false,
    titleEn: "Kisan Credit Card (KCC) Subsidized Credit",
    titleKn: "ಕಿಸಾನ್ ಕ್ರೆಡಿಟ್ ಕಾರ್ಡ್ (ಕೆಸಿಸಿ) ರಿಯಾಯಿತಿ ಕೃಷಿ ಸಾಲ",
    titleHi: "किसान क्रेडिट कार्ड (केसीसी) रियायती कृषि ऋण",
    benefitEn: "Working capital up to ₹3,00,000 at 4% effective interest with prompt repayment incentive",
    benefitKn: "ಸಮಯಕ್ಕೆ ಸರಿಯಾಗಿ ಮರುಪಾವತಿಸಿದಾಗ ಶೇ. 4 ರ ಪರಿಣಾಮಕಾರಿ ಬಡ್ಡಿದರದಲ್ಲಿ ₹3,00,000 ವರೆಗೆ ಕೃಷಿ ಸಾಲ",
    benefitHi: "समय पर पुनर्भुगतान पर 4% प्रभावी ब्याज पर ₹3,00,000 तक की कार्यशील पूंजी",
    departmentEn: "Department of Financial Services / MoA&FW",
    departmentKn: "ಹಣಕಾಸು ಸೇವೆಗಳ ಇಲಾಖೆ / ಕೃಷಿ ಸಚಿವಾಲಯ",
    departmentHi: "वित्तीय सेवाएं विभाग / कृषि मंत्रालय",
    department: "Department of Financial Services / MoA&FW",
    ruleTree: {
      all: [
        {
          id: "kcc-state",
          fact: "state",
          op: "eq",
          value: "Karnataka",
          descriptionEn: "You are an active farmer in Karnataka",
          descriptionKn: "ನೀವು ಕರ್ನಾಟಕದ ಸಕ್ರಿಯ ರೈತರು",
        },
      ],
    },
    documentsEn: ["Completed KCC Application", "Land RTC / Pahani", "Identity & Address Proof"],
    documentsKn: ["ಭರ್ತಿ ಮಾಡಿದ ಕೆಸಿಸಿ ಅರ್ಜಿ", "ಜಮೀನಿನ ಪಹಣಿ / ಆರ್‍ಟಿಸಿ", "ಗುರುತಿನ ಮತ್ತು ವಿಳಾಸದ ಪುರಾವೆ"],
    documentsHi: ["केसीसी आवेदन फॉर्म", "भूमि खसरा / खतौनी", "पहचान और निवास प्रमाण पत्र"],
    sourceUrl: "https://www.myscheme.gov.in/schemes/kcc",
    checkedOn: "2026-11-01",
    deadlineIso: null,
    deadlineVerified: true,
  },
  {
    id: "raitha-siri-official",
    isMock: false,
    titleEn: "Karnataka Raitha Siri (Millet Incentive)",
    titleKn: "ಕರ್ನಾಟಕ ರೈತ ಸಿರಿ (ಸಿರಿಧಾನ್ಯ ಪ್ರೋತ್ಸಾಹಧನ)",
    titleHi: "कर्नाटक रैत सिरी (श्रीअन्न प्रोत्साहन)",
    benefitEn: "₹10,000 per hectare incentive directly deposited for millet growers",
    benefitKn: "ಸಿರಿಧಾನ್ಯ ಬೆಳೆಯುವ ರೈತರಿಗೆ ಪ್ರತಿ ಹೆಕ್ಟೇರ್‌ಗೆ ₹10,000 ನೇರ ಪ್ರೋತ್ಸಾಹಧನ",
    benefitHi: "मोटे अनाज उगाने वाले किसानों को ₹10,000 प्रति हेक्टेयर प्रोत्साहन राशि",
    departmentEn: "Department of Agriculture, Govt of Karnataka",
    departmentKn: "ಕೃಷಿ ಇಲಾಖೆ, ಕರ್ನಾಟಕ ಸರ್ಕಾರ",
    departmentHi: "कृषि विभाग, कर्नाटक सरकार",
    department: "Department of Agriculture, Govt of Karnataka",
    ruleTree: {
      all: [
        {
          id: "siri-crop",
          fact: "crops",
          op: "in",
          value: ["RAGI", "MAIZE"],
          descriptionEn: "You grow millets (Ragi/minor millets)",
          descriptionKn: "ನೀವು ಸಿರಿಧಾನ್ಯಗಳನ್ನು (ರಾಗಿ/ಇತರ ಧಾನ್ಯ) ಬೆಳೆಯುತ್ತೀರಿ",
        },
      ],
    },
    documentsEn: ["Karnataka FRUITS FID", "Land Pahani / RTC", "Aadhaar Bank Passbook"],
    documentsKn: ["ಕರ್ನಾಟಕ ಫ್ರೂಟ್ಸ್ ಎಫ್‌ಐಡಿ", "ಜಮೀನಿನ ಪಹಣಿ", "ಆಧಾರ್ ಬ್ಯಾಂಕ್ ಪಾಸ್‌ಬುಕ್"],
    documentsHi: ["कर्नाटक फ्रूट्स एफआईडी", "भूमि खसरा / आरटीसी", "आधार बैंक पासबुक"],
    sourceUrl: "https://fruits.karnataka.gov.in/",
    checkedOn: "2026-11-01",
    deadlineIso: "2026-12-15T18:00:00.000Z",
    deadlineVerified: true,
  },
  {
    id: "mudra-official",
    isMock: false,
    titleEn: "PM Mudra Yojana (Allied Agriculture Loans)",
    titleKn: "ಪಿಎಂ ಮುದ್ರಾ ಯೋಜನೆ (ಕೃಷಿ ಸಂಬಂಧಿತ ಚಟುವಟಿಕೆ ಸಾಲ)",
    titleHi: "पीएम मुद्रा योजना (संबद्ध कृषि ऋण)",
    benefitEn: "Collateral-free institutional loans up to ₹10 Lakh (Shishu, Kishore, Tarun)",
    benefitKn: "ಯಾವುದೇ ಅಡಮಾನವಿಲ್ಲದೆ ₹10 ಲಕ್ಷದವರೆಗೆ ಸಾಲ ಸೌಲಭ್ಯ (ಶಿಶು, ಕಿಶೋರ, ತರುಣ್)",
    benefitHi: "बिना किसी गारंटी के ₹10 लाख तक का संस्थागत ऋण (शिशु, किशोर, तरुण)",
    departmentEn: "Department of Financial Services, Ministry of Finance",
    departmentKn: "ಹಣಕಾಸು ಸೇವೆಗಳ ಇಲಾಖೆ, ಹಣಕಾಸು ಸಚಿವಾಲಯ",
    departmentHi: "वित्तीय सेवाएं विभाग, वित्त मंत्रालय",
    department: "Department of Financial Services, Ministry of Finance",
    ruleTree: {
      all: [
        {
          id: "mudra-state",
          fact: "state",
          op: "eq",
          value: "Karnataka",
          descriptionEn: "Operating micro-enterprise or allied farm activity",
          descriptionKn: "ಕೃಷಿ ಸಂಬಂಧಿತ ಉದ್ಯಮ ಅಥವಾ ಹೈನುಗಾರಿಕೆ ನಡೆಸುತ್ತಿದ್ದೀರಿ",
        },
      ],
    },
    documentsEn: ["Mudra Application Form", "Quotation of Machinery / Livestock", "6-Month Bank Statement"],
    documentsKn: ["ಮುದ್ರಾ ಅರ್ಜಿ ನಮೂನೆ", "ಉಪಕರಣ / ಜಾನುವಾರು ದರಪಟ್ಟಿ", "6 ತಿಂಗಳ ಬ್ಯಾಂಕ್ ಸ್ಟೇಟ್‌ಮೆಂಟ್"],
    documentsHi: ["मुद्रा आवेदन फॉर्म", "उपकरण / पशुधन कोटेशन", "6 महीने का बैंक स्टेटमेंट"],
    sourceUrl: "https://www.mudra.org.in/",
    checkedOn: "2026-11-01",
    deadlineIso: null,
    deadlineVerified: true,
  },
];

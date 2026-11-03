import type { SchemeRuleNode } from "@agro/rules-engine";

// DEMO data only. Typed adapter output: every record carries isMock = true.

export interface DemoScheme {
  id: string;
  isMock: true;
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
    id: "demo-drip",
    isMock: true,
    titleEn: "[DEMO] Micro-Irrigation Equipment Assistance",
    titleKn: "[ಮಾದರಿ] ಸೂಕ್ಷ್ಮ ನೀರಾವರಿ ಉಪಕರಣ ಸಹಾಯಧನ",
    titleHi: "[डेमो] सूक्ष्म सिंचाई उपकरण सहायता",
    benefitEn: "Illustrative subsidy support for drip or sprinkler equipment",
    benefitKn: "ಹನಿ ಅಥವಾ ತುಂತುರು ನೀರಾವರಿ ಉಪಕರಣಕ್ಕೆ ಮಾದರಿ ಸಹಾಯಧನ",
    benefitHi: "ड्रिप या स्प्रिंकलर सिंचाई उपकरण के लिए अनुदान सहायता",
    departmentEn: "Department of Agriculture (Demo)",
    departmentKn: "ಕೃಷಿ ಇಲಾಖೆ (ಮಾದರಿ)",
    departmentHi: "कृषि विभाग (डेमो)",
    department: "Department of Agriculture (Demo)",
    ruleTree: {
      all: [
        {
          id: "drip-state",
          fact: "state",
          op: "eq",
          value: "Karnataka",
          descriptionEn: "You farm in Karnataka",
          descriptionKn: "ನೀವು ಕರ್ನಾಟಕದಲ್ಲಿ ಕೃಷಿ ಮಾಡುತ್ತೀರಿ",
        },
        {
          id: "drip-own",
          fact: "ownershipTypes",
          op: "in",
          value: ["OWNER", "JOINT_FAMILY"],
          descriptionEn: "You hold land as owner or joint family",
          descriptionKn: "ನೀವು ಸ್ವಂತ ಅಥವಾ ಅವಿಭಕ್ತ ಕುಟುಂಬದ ಜಮೀನು ಹೊಂದಿದ್ದೀರಿ",
          requiresOfficialVerification: true,
        },
        {
          id: "drip-area",
          fact: "totalLandHectares",
          op: "between",
          value: [0.2, 5],
          descriptionEn: "Total land is between 0.2 and 5 hectares",
          descriptionKn: "ಒಟ್ಟು ಭೂಮಿ 0.2 ರಿಂದ 5 ಹೆಕ್ಟೇರ್ ನಡುವೆ ಇದೆ",
        },
      ],
    },
    documentsEn: ["Land record (RTC / Pahani)", "Soil and water test report", "Approved supplier quotation"],
    documentsKn: ["ಭೂ ದಾಖಲೆ (ಪಹಣಿ)", "ಮಣ್ಣು ಮತ್ತು ನೀರಿನ ಪರೀಕ್ಷಾ ವರದಿ", "ಸರಬರಾಜುದಾರರ ದರಪಟ್ಟಿ"],
    documentsHi: ["भूमि रिकॉर्ड (आरटीसी / खसरा)", "मिट्टी और पानी जांच रिपोर्ट", "आपूर्तिकर्ता कोटेशन"],
    sourceUrl: "https://raitamitra.karnataka.gov.in/",
    checkedOn: "2026-11-01",
    deadlineIso: "2026-12-15T18:00:00.000Z",
    deadlineVerified: true,
  },
  {
    id: "demo-insurance",
    isMock: true,
    titleEn: "[DEMO] Seasonal Crop Insurance Enrolment",
    titleKn: "[ಮಾದರಿ] ಹಂಗಾಮಿನ ಬೆಳೆ ವಿಮೆ ನೋಂದಣಿ",
    titleHi: "[डेमो] मौसमी फसल बीमा पंजीकरण",
    benefitEn: "Illustrative crop-loss cover for notified seasonal crops",
    benefitKn: "ಅಧಿಸೂಚಿತ ಹಂಗಾಮಿನ ಬೆಳೆಗಳಿಗೆ ಬೆಳೆ ನಷ್ಟ ವಿಮಾ ರಕ್ಷಣೆ",
    benefitHi: "अधिसूचित मौसमी फसलों के लिए फसल नुकसान बीमा कवर",
    departmentEn: "Crop Insurance Cell (Demo)",
    departmentKn: "ಬೆಳೆ ವಿಮಾ ವಿಭಾಗ (ಮಾದರಿ)",
    departmentHi: "फसल बीमा प्रकोष्ठ (डेमो)",
    department: "Crop Insurance Cell (Demo)",
    ruleTree: {
      all: [
        {
          id: "ins-state",
          fact: "state",
          op: "eq",
          value: "Karnataka",
          descriptionEn: "You farm in Karnataka",
          descriptionKn: "ನೀವು ಕರ್ನಾಟಕದಲ್ಲಿ ಕೃಷಿ ಮಾಡುತ್ತೀರಿ",
        },
        {
          id: "ins-crop",
          fact: "crops",
          op: "in",
          value: ["PADDY", "RAGI", "TUR", "MAIZE"],
          descriptionEn: "You grow a notified crop (paddy, ragi, tur, maize)",
          descriptionKn: "ನೀವು ಅಧಿಸೂಚಿತ ಬೆಳೆ (ಭತ್ತ, ರಾಗಿ, ತೊಗರಿ, ಮೆಕ್ಕೆಜೋಳ) ಬೆಳೆಯುತ್ತೀರಿ",
        },
      ],
    },
    documentsEn: ["Land record (RTC) or tenancy record", "Sowing declaration certificate"],
    documentsKn: ["ಪಹಣಿ ದಾಖಲೆ ಅಥವಾ ಗೇಣಿ ಪತ್ರ", "ಬಿತ್ತನೆ ದೃಢೀಕರಣ ಪ್ರಮಾಣಪತ್ರ"],
    documentsHi: ["भूमि रिकॉर्ड या पट्टा दस्तावेज़", "बुवाई घोषणा प्रमाण पत्र"],
    sourceUrl: "https://samrakshane.karnataka.gov.in/",
    checkedOn: "2026-11-01",
    deadlineIso: "2026-12-30T00:00:00.000Z",
    deadlineVerified: false,
  },
  {
    id: "demo-dairy",
    isMock: true,
    titleEn: "[DEMO] Small Farmer Dairy & Fodder Support",
    titleKn: "[ಮಾದರಿ] ಸಣ್ಣ ರೈತರ ಹೈನುಗಾರಿಕೆ ಮತ್ತು ಮೇವು ಬೆಂಬಲ",
    titleHi: "[डेमो] लघु किसान डेयरी और चारा सहायता",
    benefitEn: "Illustrative cattle shed, fodder kit and equipment support",
    benefitKn: "ಜಾನುವಾರು ಶೆಡ್, ಮೇವು ಕಿಟ್ ಮತ್ತು ಉಪಕರಣಕ್ಕೆ ಮಾದರಿ ಸಹಾಯ",
    benefitHi: "पशु शेड, चारा किट और उपकरण के लिए अनुदान सहायता",
    departmentEn: "Department of Animal Husbandry (Demo)",
    departmentKn: "ಪಶುಪಾಲನಾ ಇಲಾಖೆ (ಮಾದರಿ)",
    departmentHi: "पशुपालन विभाग (डेमो)",
    department: "Department of Animal Husbandry (Demo)",
    ruleTree: {
      all: [
        {
          id: "dairy-cat",
          fact: "farmerCategory",
          op: "in",
          value: ["MARGINAL", "SMALL"],
          descriptionEn: "You are a marginal or small farmer",
          descriptionKn: "ನೀವು ಅತಿ ಸಣ್ಣ ಅಥವಾ ಸಣ್ಣ ರೈತರು",
        },
        {
          id: "dairy-live",
          fact: "livestockTypes",
          op: "in",
          value: ["DAIRY", "SERICULTURE"],
          descriptionEn: "You keep dairy animals or do sericulture",
          descriptionKn: "ನೀವು ಹೈನುಗಾರಿಕೆ ಅಥವಾ ರೇಷ್ಮೆ ಕೃಷಿ ಮಾಡುತ್ತೀರಿ",
        },
      ],
    },
    documentsEn: ["Farmer category proof or RTC", "Livestock registration details"],
    documentsKn: ["ರೈತ ವರ್ಗ ಪ್ರಮಾಣಪತ್ರ ಅಥವಾ ಪಹಣಿ", "ಜಾನುವಾರು ನೋಂದಣಿ ವಿವರ"],
    documentsHi: ["किसान श्रेणी प्रमाण या खसरा", "पशुधन पंजीकरण विवरण"],
    sourceUrl: "https://ahvs.karnataka.gov.in/",
    checkedOn: "2026-11-01",
    deadlineIso: null,
    deadlineVerified: false,
  },
];

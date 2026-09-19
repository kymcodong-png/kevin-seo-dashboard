export type BusinessType = "B2B" | "B2C" | "其他";
export type ProjectionYear = 1 | 2 | 3;

export interface NumericRange {
  min: number;
  max: number;
  unit: string;
}

export interface FunnelStageDefinition {
  code: "TOFU" | "MOFU" | "BOFU";
  label: string;
  description: string;
  unit: string;
  range?: NumericRange;
}

export interface ConversionDefinition {
  label: string;
  industryRange: NumericRange;
  estimateLabel: string;
}

export interface FunnelTimelineDefinition {
  range: string;
  description: string;
}

export interface FunnelData2C {
  clientType: "B2C";
  title: string;
  top: FunnelStageDefinition;
  atc: ConversionDefinition;
  middle: FunnelStageDefinition;
  cvr: ConversionDefinition;
  bottom: FunnelStageDefinition;
  outcomes: {
    revenueLabel: string;
    revenueDescription: string;
    retentionLabel: string;
    retentionDescription: string;
  };
  timeline: FunnelTimelineDefinition[];
}

export interface Funnel2CSettings {
  monthlyOrganicTraffic: number;
  organicTrafficRangeMin: number;
  organicTrafficRangeMax: number;
  atcRate: number;
  atcIndustryMin: number;
  atcIndustryMax: number;
  conversionRate: number;
  cvrIndustryMin: number;
  cvrIndustryMax: number;
  averageOrderValue: number;
  repeatPurchaseRate: number;
  annualAdSavings: number;
  timelineStage: number;
}

export type Funnel2CYearSettings = Record<ProjectionYear, Funnel2CSettings>;

export interface Funnel2CCalculation {
  annualOrganicTraffic: number;
  cartUsers: number;
  orders: number;
  revenue: number;
}

export const funnelData2C: FunnelData2C = {
  clientType: "B2C",
  title: "線上營收轉換漏斗",
  top: {
    code: "TOFU",
    label: "預估進站自然流量",
    description: "SEO 品類字與商品長尾詞自然搜尋導入",
    unit: "人次／年",
    range: { min: 30_000, max: 50_000, unit: "人次／年" },
  },
  atc: {
    label: "加入購物車率（ATC）",
    industryRange: { min: 5, max: 10, unit: "%" },
    estimateLabel: "翊樂推估",
  },
  middle: {
    code: "MOFU",
    label: "意向商品加車人次",
    description: "具備高購買意向之意向買家族群",
    unit: "人次",
  },
  cvr: {
    label: "全站購買轉換率（CVR）",
    industryRange: { min: 1, max: 1.8, unit: "%" },
    estimateLabel: "翊樂推估",
  },
  bottom: {
    code: "BOFU",
    label: "預估產生有效訂單",
    description: "官網線上直接下單完成結帳訂單",
    unit: "筆／年",
  },
  outcomes: {
    revenueLabel: "預估增加營業額",
    revenueDescription: "預估訂單數 × 平均客單價（AOV）",
    retentionLabel: "舊客回購貢獻／廣告節省",
    retentionDescription: "自然流量累積顧客資產，降低付費廣告依賴",
  },
  timeline: [
    { range: "0～3 個月", description: "搜尋架構鋪設，首批長尾字收錄" },
    { range: "3～6 個月", description: "長尾商品詞進前頁，開始產生自然訂單" },
    { range: "6～12 個月", description: "核心品類大詞排名提升，每日自然訂單量穩定放大" },
    { range: "12～24 個月", description: "自然流量護城河形成，累積舊客回購複利" },
  ],
};

export const defaultFunnel2CSettings: Funnel2CSettings = {
  monthlyOrganicTraffic: 3_333.33,
  organicTrafficRangeMin: 30_000,
  organicTrafficRangeMax: 50_000,
  atcRate: 12,
  atcIndustryMin: 5,
  atcIndustryMax: 10,
  conversionRate: 2.5,
  cvrIndustryMin: 1,
  cvrIndustryMax: 1.8,
  averageOrderValue: 1_500,
  repeatPurchaseRate: 20,
  annualAdSavings: 250_000,
  timelineStage: 1,
};

export const defaultFunnel2CYearSettings: Funnel2CYearSettings = {
  1: { ...defaultFunnel2CSettings },
  2: { ...defaultFunnel2CSettings },
  3: { ...defaultFunnel2CSettings },
};

export function calculateFunnel2C(settings: Funnel2CSettings): Funnel2CCalculation {
  const traffic = Math.round(Math.max(0, settings.monthlyOrganicTraffic) * 12);
  return {
    annualOrganicTraffic: traffic,
    cartUsers: Math.round(traffic * Math.max(0, settings.atcRate) / 100),
    orders: Math.round(traffic * Math.max(0, settings.conversionRate) / 100),
    revenue: Math.round(traffic * Math.max(0, settings.conversionRate) / 100) * Math.max(0, settings.averageOrderValue),
  };
}

export function normalizeFunnel2CSettings(value: unknown): Funnel2CSettings {
  const saved = value && typeof value === "object" ? value as Partial<Funnel2CSettings> & { annualOrganicTraffic?: number } : {};
  return Object.fromEntries(Object.entries(defaultFunnel2CSettings).map(([key, fallback]) => {
    if (key === "monthlyOrganicTraffic") {
      // 舊專案只儲存年流量；轉為月流量時保留至小數點後兩位，避免既有預估大幅跳動。
      const monthly = saved.monthlyOrganicTraffic;
      if (typeof monthly === "number" && Number.isFinite(monthly) && monthly >= 0) return [key, monthly];
      const annual = saved.annualOrganicTraffic;
      if (typeof annual === "number" && Number.isFinite(annual) && annual >= 0) return [key, Math.round(annual / 12 * 100) / 100];
      return [key, fallback];
    }
    const candidate = Number(saved[key as keyof Funnel2CSettings]);
    return [key, Number.isFinite(candidate) ? candidate : fallback];
  })) as unknown as Funnel2CSettings;
}

export function normalizeFunnel2CYearSettings(value: unknown): Funnel2CYearSettings {
  const saved = value && typeof value === "object" ? value as Record<string, unknown> : {};
  const isYearMap = ["1", "2", "3"].some((key) => saved[key] && typeof saved[key] === "object");
  const legacySettings = isYearMap ? undefined : normalizeFunnel2CSettings(value);

  return {
    1: normalizeFunnel2CSettings(isYearMap ? saved["1"] : legacySettings),
    2: normalizeFunnel2CSettings(isYearMap ? saved["2"] : legacySettings),
    3: normalizeFunnel2CSettings(isYearMap ? saved["3"] : legacySettings),
  };
}

"use client";

import { type CSSProperties, useEffect, useMemo, useRef, useState } from "react";
import Sidebar from "./sidebar";
import Funnel2C from "./funnel-2c";
import { defaultFunnel2CYearSettings, funnelData2C, normalizeFunnel2CYearSettings, type BusinessType, type Funnel2CYearSettings } from "./funnel-config";

type SiteMode = "A" | "B" | "C";
type ViewMode = "client" | "review";
type DashboardSection = "home" | "overall" | "market" | "execution" | "outcome" | "blueprint" | "progress" | "results";
type DashboardPage = "01" | "02" | "03" | "04";
export type SharedProject = { token: string; clientName: string; name: string; reportName: string; assessmentDate: string; businessType: string; websiteUrl: string; siteMode: string; data: Record<string, unknown> };
type FieldManagement = Record<string, { enabled: boolean; pages: DashboardPage[] }>;
type Metric = {
  id: string;
  label: string;
  score: number;
  evidence: string;
  gap: string;
  action: string;
  risk?: boolean;
};
type Priority = {
  id: number;
  level: "P0" | "P1" | "P2";
  title: string;
  reason: string;
  status: "待處理" | "進行中" | "已完成";
};
type FunnelEntry = {
  leads: string;
  discussion: string;
  close: string;
  partners: string;
  partnerValue: string;
  productPrice: string;
  revenue?: string;
};
type FunnelValues = Record<1 | 2 | 3, FunnelEntry>;
type ResultTracking = {
  rankingKeywords: string;
  organicTraffic: string;
  qualifiedConversions: string;
  actualRevenue: string;
  aiVisibility: string;
  forecastComparison: string;
  nextAction: string;
};

type OutcomeScoringSettings = {
  tob: Record<FirstInquiryRange, number>;
  toc: Array<{ minTraffic: number; score: number }>;
};

const initialResultTracking: ResultTracking = {
  rankingKeywords: "",
  organicTraffic: "",
  qualifiedConversions: "",
  actualRevenue: "",
  aiVisibility: "",
  forecastComparison: "",
  nextAction: "",
};

const defaultFieldManagement: FieldManagement = {
  market_opportunity_score: { enabled: true, pages: ["01", "02"] },
  commercial_value_score: { enabled: true, pages: ["01", "02"] },
  metric_id: { enabled: true, pages: ["03"] },
  metric_score: { enabled: true, pages: ["03"] },
  scenario_name: { enabled: true, pages: ["01", "04"] },
  projected_leads: { enabled: true, pages: ["01", "04"] },
  first_inquiry_range: { enabled: true, pages: ["01", "04"] },
  six_month_monthly_organic_traffic: { enabled: true, pages: ["01", "04"] },
};

const defaultOutcomeScoring: OutcomeScoringSettings = {
  tob: { "1～3": 10, "3～6": 6, "6～9": 2, "9～12": 0, "12～15": 0 },
  toc: [
    { minTraffic: 5000, score: 10 },
    { minTraffic: 4000, score: 8 },
    { minTraffic: 3000, score: 6 },
    { minTraffic: 2000, score: 4 },
    { minTraffic: 1000, score: 2 },
  ],
};

const initialFunnelValues: FunnelValues = {
  1: { leads: "3～8", discussion: "20%～40%", close: "5%～15%", partners: "待評估", partnerValue: "待評估", productPrice: "待評估" },
  2: { leads: "8～20", discussion: "20%～40%", close: "5%～15%", partners: "待評估", partnerValue: "待評估", productPrice: "待評估" },
  3: { leads: "24～48", discussion: "20%～40%", close: "5%～15%", partners: "待評估", partnerValue: "待評估", productPrice: "待評估" },
};

function normalizeFunnelValues(value: unknown): FunnelValues {
  const saved = (value && typeof value === "object" ? value : {}) as Partial<Record<1 | 2 | 3, Partial<FunnelEntry>>>;
  return ([1, 2, 3] as const).reduce((result, year) => {
    result[year] = {
      ...initialFunnelValues[year],
      ...saved[year],
      partnerValue: saved[year]?.partnerValue ?? "待評估",
      productPrice: saved[year]?.productPrice ?? "待評估",
    };
    return result;
  }, {} as FunnelValues);
}

function normalizeOutcomeScoring(value: unknown): OutcomeScoringSettings {
  const saved = (value && typeof value === "object" ? value : {}) as Partial<OutcomeScoringSettings>;
  const tob = { ...defaultOutcomeScoring.tob, ...(saved.tob || {}) };
  const toc = defaultOutcomeScoring.toc.map((item, index) => ({
    ...item,
    ...(Array.isArray(saved.toc) && saved.toc[index] ? saved.toc[index] : {}),
  }));
  return { tob, toc };
}

function averageFromText(value: string) {
  const normalized = value.replaceAll(",", "");
  const values = normalized.match(/\d+(?:\.\d+)?/g)?.map(Number) ?? [];
  if (!values.length) return null;
  return values.reduce((sum, item) => sum + item, 0) / values.length;
}

function amountFromText(value: string) {
  const average = averageFromText(value);
  if (average === null) return null;
  const normalized = value.replaceAll(",", "");
  const multiplier = normalized.includes("億") ? 100_000_000 : normalized.includes("萬") ? 10_000 : 1;
  return average * multiplier;
}

function rateFromText(value: string) {
  const average = averageFromText(value);
  if (average === null) return null;
  return value.includes("%") || average > 1 ? average / 100 : average;
}

function formatAmount(value: number | null) {
  if (value === null) return "待評估";
  return `NT$ ${new Intl.NumberFormat("zh-TW", { maximumFractionDigits: 0 }).format(Math.round(value))}`;
}

function compactReportExcerpt(value: string, maxLength = 34) {
  const text = value.replace(/\s+/g, " ").trim();
  return text.length > maxLength ? `${text.slice(0, maxLength)}…` : text;
}

function reportExcerptItems(value: string, fallback: string) {
  const source = value.replace(/\r/g, "").trim();
  const sentenceItems = source.split(/[\n。！？；;]+/).map(item => item.replace(/^\s*(?:[-•●▪◦]|\d+[.)、])\s*/, "").trim()).filter(Boolean);
  const items = sentenceItems.length > 1 ? sentenceItems : (sentenceItems[0] || "").split(/[，,、]+/).map(item => item.trim()).filter(Boolean);
  return (items.length ? items : [fallback]).slice(0, 5);
}

const aMetrics: Metric[] = [
  { id: "market", label: "搜尋市場機會", score: 75, evidence: "美、英、德、義大利市場均已完成核心關鍵字觀察；大眾家具詞量大，但高精準利基詞更符合產品。", gap: "仍需補德文研究與實際詢價國家資料。", action: "先以美國英文市場為主，英國測試，德國與義大利分階段驗證。" },
  { id: "commercial", label: "商業價值潛力", score: 90, evidence: "901 Carfa 公開起價 USD 27,000 以上，單筆精準詢價具高商業價值。", gap: "尚未取得平均成交價、毛利與歷史成交率。", action: "以有效商機與深入洽談為主要指標，不追求大量低品質流量。" },
  { id: "content", label: "網站與內容承接", score: 63, evidence: "現有產品頁已具設計、材質、尺寸、價格與詢價入口。", gap: "缺海外採購資訊、客群入口、應用案例與決策型內容。", action: "保留原網站，補核心承接頁、SEO 文章與關鍵字內部連結。" },
  { id: "eeat", label: "E-E-A-T 信任證據", score: 70, evidence: "具團隊背景、工藝、iF Design 獎項與大量媒體曝光等真實優勢。", gap: "媒體原始連結、實際交付案例與製作證據尚未形成完整證據鏈。", action: "整理代表性媒體、獎項、團隊與案例頁，讓證據可以被查證。" },
  { id: "ai", label: "AI Search 準備度", score: 55, evidence: "AI 可辨識 Mobellio 是台北的汽車家具品牌，產品實體相對清楚。", gap: "海外交付、適用客群、比較與合作流程仍缺少可直接引用的答案。", action: "補具體結論、FAQ、案例、規格與第三方來源，提升可理解與可引用性。" },
  { id: "conversion", label: "詢價轉換準備度", score: 60, evidence: "產品頁已有報價入口，部分產品提供設計檔案。", gap: "收藏家、設計師、經銷商與商業空間尚未分流。", action: "建立不同 CTA 與表單，記錄國家、客群、產品及詢價階段。" },
  { id: "technical", label: "技術與追蹤基礎", score: 58, evidence: "網站目前可公開瀏覽與承接產品資訊。", gap: "GA4、GSC、表單事件、索引及結構化資料仍待完整查核。", action: "先完成表單事件與量測，再依爬站結果安排技術優先級。" },
];

const bMetrics: Metric[] = [
  { id: "market", label: "搜尋市場機會", score: 75, evidence: "沿用評估報告中的搜尋市場與商業需求證據。", gap: "需先確認新網站第一階段服務市場與語言。", action: "用商業價值與搜尋意圖決定網站架構，不從版型開始。" },
  { id: "architecture", label: "網站架構規劃", score: 68, evidence: "評估報告已整理核心客群、產品與轉換入口。", gap: "尚未形成完整 sitemap、頁面清單與關鍵字對應。", action: "完成關鍵字、搜尋意圖、頁面類型與內部連結對照表。" },
  { id: "materials", label: "內容素材準備度", score: 62, evidence: "已有產品規格、設計故事、團隊、獎項與部分媒體素材。", gap: "案例、海外流程與決策型內容素材仍不足。", action: "先盤點可公開的文字、照片、影片、案例與第三方證據。" },
  { id: "eeat", label: "品牌信任基礎", score: 70, evidence: "企業與產品已有可驗證的專業、獎項與團隊訊號。", gap: "需要轉化成網站可查證、可引用的內容結構。", action: "把團隊、案例、工藝、媒體與合作證據納入建站規格。" },
  { id: "ai", label: "AI Search 規劃度", score: 60, evidence: "品牌實體與核心主題可定義。", gap: "尚未建立完整問答、Entity 關係與結構化資料規格。", action: "在建站階段同步規劃內容完整度與可引用答案。" },
  { id: "conversion", label: "轉換路徑規劃", score: 65, evidence: "可辨識收藏家、設計師、經銷商與商業空間等客群。", gap: "各客群 CTA、表單欄位與後續跟進流程尚待定案。", action: "依客群設計詢價、專案、資料下載及經銷合作入口。" },
  { id: "delivery", label: "建置執行準備度", score: 57, evidence: "已有初步市場與內容方向。", gap: "頁面責任、素材交付、時程、量測與上線驗收仍待確認。", action: "完成頁面清單、負責人、素材期限與上線檢核表。" },
];

const cMetrics: Metric[] = [
  { id: "market", label: "搜尋市場機會", score: 75, evidence: "沿用評估報告中的搜尋市場、商業意圖與長尾需求證據。", gap: "需確認改版後的主要市場、語言與優先產品。", action: "先確定商業價值與搜尋意圖，再規劃新版網站架構。" },
  { id: "legacy", label: "舊網域資產價值", score: 58, evidence: "舊網域可能保有歷史索引、既有排名與外部連結，可作為改版資產。", gap: "尚未完整盤點 GSC、既有排名、反向連結及高價值舊網址。", action: "改版前建立舊網址、流量、排名與外部連結資產清單。" },
  { id: "architecture", label: "新版架構規劃", score: 68, evidence: "評估報告已整理核心客群、產品與轉換方向。", gap: "尚未完成新版 sitemap、頁面清單與關鍵字對應。", action: "以搜尋意圖與商業價值建立新版頁面及內部連結架構。" },
  { id: "migration", label: "SEO 移轉準備度", score: 52, evidence: "保留舊網域有機會延續既有搜尋資產。", gap: "301 對照、canonical、索引控管、測試環境與上線檢核仍待建立。", action: "逐頁完成舊新網址對照，避免改版造成排名與流量流失。" },
  { id: "materials", label: "內容素材準備度", score: 62, evidence: "已有產品規格、設計故事、團隊、獎項與部分媒體素材。", gap: "案例、海外流程與決策型內容素材仍不足。", action: "盤點可沿用、需重寫及必須新增的頁面與素材。" },
  { id: "eeat", label: "品牌信任基礎", score: 70, evidence: "企業與產品已有可驗證的專業、獎項與團隊訊號。", gap: "需要在新版網站形成可查證、可引用的證據結構。", action: "把團隊、案例、工藝、媒體與合作證據納入改版規格。" },
  { id: "conversion", label: "轉換路徑規劃", score: 65, evidence: "可辨識收藏家、設計師、經銷商與商業空間等客群。", gap: "各客群 CTA、表單欄位與舊站轉換資料仍待整合。", action: "保留有效入口並依客群設計新版詢價與合作流程。" },
  { id: "technical", label: "追蹤與上線銜接", score: 55, evidence: "舊站可提供改版前的搜尋與轉換基準。", gap: "GA4、GSC、事件、站點地圖與改版前後監控計畫仍待確認。", action: "先保存基準資料，上線後持續監控索引、排名、404 與轉換。" },
];

const modeMeta: Record<SiteMode, { name: string; note: string; headline: string; description: string; readiness: string; strategy: string; strategyNote: string; scoreTitle: string }> = {
  A: { name: "A 類現有網站優化", note: "保留網站，補內容、承接頁與內部連結", headline: "值得投入 SEO，但應先建立關鍵字承接頁與內容之間的完整路徑。", description: "保留現有網站與產品頁，增加高品質 SEO 內容、客群承接頁及內部連結；先讓精準客群找到、看懂並願意詢問，再擴大流量。", readiness: "目前準備度", strategy: "內容承接", strategyNote: "核心頁＋文章＋內鏈", scoreTitle: "現有網站成長準備度" },
  B: { name: "B 類全新網站建置（全新網域）", note: "從零建立網域、架構、內容與搜尋資產", headline: "市場具投入價值，新網域應先完成搜尋導向的架構與內容規格。", description: "全新網域沒有既有搜尋資產，建站前先確認市場、搜尋意圖、頁面類型、信任證據與轉換路徑，再逐步累積排名。", readiness: "建置準備度", strategy: "架構先行", strategyNote: "市場＋意圖＋頁面", scoreTitle: "新網域網站建置準備度" },
  C: { name: "C 類全新網站建置（舊網域）", note: "重建網站並保留舊網域的搜尋資產", headline: "改版具成長機會，但必須先保護舊網域累積的排名與搜尋資產。", description: "以新版架構與內容承接市場需求，同時盤點舊網址、排名、外部連結與轉換資料，透過完整移轉降低改版流量流失風險。", readiness: "移轉準備度", strategy: "資產保留", strategyNote: "盤點＋301＋監控", scoreTitle: "舊網域重建與移轉準備度" },
};

const initialPriorities: Priority[] = [
  { id: 1, level: "P0", title: "修正範本文字與未完成頁面", reason: "直接影響高端品牌信任與詢價。", status: "待處理" },
  { id: 2, level: "P0", title: "確認表單收件與 GA4 事件追蹤", reason: "沒有追蹤就無法判斷 SEO 是否帶來有效商機。", status: "進行中" },
  { id: 3, level: "P1", title: "補齊海外交付、保固與客製流程", reason: "降低海外買家的主要決策障礙。", status: "待處理" },
  { id: 4, level: "P1", title: "建立四類客群關鍵字承接頁", reason: "讓收藏家、設計師、商業空間與經銷商各自找到需要的資訊。", status: "待處理" },
  { id: 5, level: "P1", title: "優化核心產品頁與內部連結", reason: "文章與關鍵字需導向真正能承接詢價的頁面。", status: "待處理" },
  { id: 6, level: "P1", title: "建立案例、獎項與媒體證據鏈", reason: "同時強化 SEO、AI Search 與成交信任。", status: "待處理" },
  { id: 7, level: "P2", title: "製作少量第一手英文 SEO 文章", reason: "支援核心頁排名並擴大精準搜尋覆蓋。", status: "待處理" },
];

const scenarios = [
  { id: "site", name: "只修網站", score: 35, note: "基礎會改善，但主題權威與長期成長有限。" },
  { id: "content", name: "網站＋內容與案例", score: 65, note: "可從精準長尾與高價值頁面逐步建立排名。" },
  { id: "full", name: "網站＋內容＋海外曝光", score: 78, note: "最能同步強化 SEO、AI Search、品牌信任與第三方訊號。" },
];

type MarketCriterion = { id: string; label: string; score: number; checked: boolean; evidence?: string };
type ReadinessCriterion = MarketCriterion & { source: "評估報告" | "客戶官網" | "待確認" };
const initialMarketCriteria: MarketCriterion[] = [
  { id: "audience-fit", label: "目標客群與搜尋需求高度匹配", score: 20, checked: true },
  { id: "demand-evidence", label: "搜尋需求具有可驗證性", score: 20, checked: true },
  { id: "intent", label: "有明確的商業或採購意圖", score: 20, checked: true },
  { id: "competition", label: "競爭程度與切入可行性合理", score: 20, checked: false },
  { id: "growth", label: "市場具備延伸與成長潛力", score: 20, checked: true },
];
const initialCommercialCriteriaB2B: MarketCriterion[] = [
  { id: "contract-value", label: "單一專案／合約具有足夠經濟價值", score: 20, checked: false },
  { id: "profit-potential", label: "具備合理毛利與實際獲利潛力", score: 20, checked: false },
  { id: "sales-feasibility", label: "具備明確成交條件與銷售承接流程", score: 20, checked: false },
  { id: "repeat-expansion", label: "具有續約、追加採購或長期合作價值", score: 20, checked: false },
  { id: "strategic-scale", label: "符合公司策略且具夥伴／市場擴張潛力", score: 20, checked: false },
];
const initialCommercialCriteriaB2C: MarketCriterion[] = [
  { id: "average-order-value", label: "平均客單價足以形成商業價值", score: 20, checked: false },
  { id: "profit-potential", label: "具備合理毛利率與實際獲利潛力", score: 20, checked: false },
  { id: "purchase-conversion", label: "產品與購買流程具備轉換條件", score: 20, checked: false },
  { id: "repeat-purchase", label: "具有回購、會員或顧客終身價值", score: 20, checked: false },
  { id: "brand-scale", label: "具備品牌擴張與產品延伸潛力", score: 20, checked: false },
];
const initialCommercialCriteriaOther: MarketCriterion[] = [
  { id: "economic-value", label: "產品／服務具有明確經濟價值", score: 20, checked: false },
  { id: "profit-potential", label: "具備合理毛利與實際獲利潛力", score: 20, checked: false },
  { id: "sales-feasibility", label: "具備明確成交條件與轉換流程", score: 20, checked: false },
  { id: "repeat-expansion", label: "具有回購、續約或延伸價值", score: 20, checked: false },
  { id: "strategic-scale", label: "符合公司策略且具市場發展潛力", score: 20, checked: false },
];

function commercialCriteriaForBusinessType(type: BusinessType): MarketCriterion[] {
  if (type === "B2C") return initialCommercialCriteriaB2C;
  if (type === "其他") return initialCommercialCriteriaOther;
  return initialCommercialCriteriaB2B;
}

function commercialCriteriaMatchesBusinessType(criteria: MarketCriterion[], type: BusinessType) {
  const expected = new Set(commercialCriteriaForBusinessType(type).map(item => item.id));
  const actual = new Set(criteria.map(item => item.id));
  return expected.size === actual.size && [...expected].every(id => actual.has(id));
}

function normalizeMarketCriteria(value: unknown): MarketCriterion[] {
  if (!Array.isArray(value) || !value.length) return initialMarketCriteria;
  const ids = value.map(item => typeof item === "object" && item ? String((item as { id?: unknown }).id || "") : "");
  const oldIds = ["relevance", "intent", "longtail", "landing", "order-value"];
  return oldIds.some(id => ids.includes(id)) ? initialMarketCriteria : value as MarketCriterion[];
}

const initialReadinessCriteria: Record<string, ReadinessCriterion[]> = {
  content: [
    { id: "core-pages", label: "核心產品／服務頁能承接主要搜尋意圖", score: 18, checked: true, source: "客戶官網" },
    { id: "audience-entry", label: "網站有清楚的目標客群與使用情境入口", score: 15, checked: true, source: "客戶官網" },
    { id: "topic-coverage", label: "核心主題具備足夠完整的內容覆蓋", score: 12, checked: true, source: "評估報告" },
    { id: "cases-faq", label: "具備案例、FAQ 或決策型內容", score: 10, checked: true, source: "客戶官網" },
    { id: "internal-links", label: "文章、分類與承接頁形成合理內部連結", score: 8, checked: true, source: "客戶官網" },
    { id: "intent-match", label: "不同搜尋意圖有對應的頁面類型", score: 15, checked: false, source: "評估報告" },
    { id: "multilingual", label: "目標市場語言內容完整且自然", score: 12, checked: false, source: "待確認" },
    { id: "content-plan", label: "具備可持續執行的內容與更新計畫", score: 10, checked: false, source: "待確認" },
  ],
  eeat: [
    { id: "experience", label: "有實際案例、專案紀錄或第一手經驗", score: 15, checked: true, source: "客戶官網" },
    { id: "expertise", label: "專業背景、團隊能力或技術說明清楚", score: 15, checked: true, source: "客戶官網" },
    { id: "authority", label: "具備媒體、獎項、協會或外部引用", score: 15, checked: true, source: "客戶官網" },
    { id: "company-trust", label: "公司、地址、聯絡與負責人資訊可驗證", score: 15, checked: true, source: "客戶官網" },
    { id: "policies", label: "服務流程、保固、隱私或售後政策完整", score: 10, checked: true, source: "客戶官網" },
    { id: "authors", label: "內容具有作者、審稿者與專業身分", score: 10, checked: false, source: "客戶官網" },
    { id: "reviews", label: "有真實客戶評價與第三方推薦", score: 10, checked: false, source: "待確認" },
    { id: "evidence-chain", label: "重要宣稱能連回可查證的原始證據", score: 10, checked: false, source: "評估報告" },
  ],
  ai: [
    { id: "entity", label: "品牌、公司、業務、地點與服務對象實體清楚", score: 15, checked: true, source: "客戶官網" },
    { id: "answers", label: "核心頁面能直接回答 What／Who／Why／How", score: 12, checked: true, source: "客戶官網" },
    { id: "quotable", label: "內容有明確結論、定義、規格或數據可引用", score: 10, checked: true, source: "客戶官網" },
    { id: "faq-compare", label: "具有 FAQ、比較、適用與不適用情境", score: 10, checked: true, source: "評估報告" },
    { id: "third-party", label: "品牌在可信第三方來源有一致訊號", score: 8, checked: true, source: "評估報告" },
    { id: "structured", label: "頁面結構與結構化資料有助機器理解", score: 15, checked: false, source: "客戶官網" },
    { id: "citations", label: "專業內容標示來源、日期與作者觀點", score: 15, checked: false, source: "客戶官網" },
    { id: "entity-consistency", label: "官網、商家、社群與外部資料實體一致", score: 15, checked: false, source: "待確認" },
  ],
  conversion: [
    { id: "primary-cta", label: "每個核心頁面都有明確主要 CTA", score: 15, checked: true, source: "客戶官網" },
    { id: "audience-cta", label: "不同客群有對應詢價或合作入口", score: 15, checked: true, source: "客戶官網" },
    { id: "form-quality", label: "表單欄位能判斷名單位階與需求", score: 10, checked: true, source: "客戶官網" },
    { id: "friction", label: "行動路徑清楚，填寫與聯絡摩擦合理", score: 10, checked: true, source: "客戶官網" },
    { id: "contact", label: "聯絡方式、回應預期與後續流程清楚", score: 10, checked: true, source: "客戶官網" },
    { id: "events", label: "GA4 已追蹤表單、電話、下載與關鍵事件", score: 15, checked: false, source: "待確認" },
    { id: "lead-magnet", label: "具有規格書、案例集或其他高價值資料", score: 15, checked: false, source: "客戶官網" },
    { id: "followup", label: "下載或詢價後有明確跟進與培育機制", score: 10, checked: false, source: "待確認" },
  ],
  technical: [
    { id: "crawl-index", label: "重要頁面可抓取、可索引且無明顯阻擋", score: 15, checked: true, source: "客戶官網" },
    { id: "mobile-speed", label: "行動裝置可用性與核心載入表現合理", score: 12, checked: true, source: "客戶官網" },
    { id: "metadata", label: "標題、描述、Canonical 與語言訊號正確", score: 11, checked: true, source: "客戶官網" },
    { id: "sitemap", label: "Sitemap、robots 與網站層級可正確引導搜尋引擎", score: 10, checked: true, source: "客戶官網" },
    { id: "analytics", label: "GA4、GSC 與基本轉換追蹤已安裝", score: 10, checked: true, source: "評估報告" },
    { id: "schema", label: "重要實體與內容具適當結構化資料", score: 12, checked: false, source: "客戶官網" },
    { id: "errors", label: "無大量 404、重複頁面或錯誤轉址", score: 10, checked: false, source: "待確認" },
    { id: "security", label: "HTTPS、安全性與表單傳送正常", score: 10, checked: false, source: "客戶官網" },
  ],
};

const growthStages = ["0～3", "3～6", "6～9", "9～12", "12～15", "15～18", "18～21", "21～24"];
const firstInquiryRanges = ["1～3", "3～6", "6～9", "9～12", "12～15"] as const;
type FirstInquiryRange = typeof firstInquiryRanges[number];
function scoreBand(score: number, risk = false) {
  if (risk) return score >= 70 ? "高風險" : score >= 50 ? "中度風險" : "風險可控";
  if (score >= 85) return "強項";
  if (score >= 70) return "機會明確";
  if (score >= 55) return "有潛力・待補強";
  return "優先改善";
}

function scoreTone(score: number, _risk = false) {
  if (score >= 81) return "deep-orange";
  if (score >= 60) return "orange";
  return "light-orange";
}

const sectionMeta: Record<Exclude<DashboardSection, "home">, { number: string; short: string; title: string; subtitle: string; href: string }> = {
  overall: { number: "D01", short: "先看結論", title: "總體投資判斷", subtitle: "SEO 是否值得投入", href: "/overall" },
  market: { number: "D02", short: "看機會與阻力", title: "外部市場與競爭", subtitle: "搜尋市場機會與產業競爭", href: "/market" },
  execution: { number: "D03", short: "看承接能力", title: "內部落地準備", subtitle: "網站、內容與執行條件", href: "/execution" },
  outcome: { number: "D04", short: "看回報情境", title: "商業成果預估", subtitle: "B2B／B2C 漏斗與成果時間", href: "/outcome" },
  blueprint: { number: "P01", short: "規劃工作路徑", title: "執行藍圖", subtitle: "優先順序、承接頁與內容內鏈規劃", href: "/blueprint" },
  progress: { number: "P02", short: "掌握執行狀態", title: "進度追蹤", subtitle: "待處理、進行中與完成項目", href: "/progress" },
  results: { number: "P03", short: "核對實際成效", title: "成果驗證", subtitle: "實際數據與原始預估的差異", href: "/results" },
};

function DecisionIcon({ type }: { type: "investment" | "market" | "readiness" | "outcome" | "traffic" }) {
  const common = { fill: "none", stroke: "currentColor", strokeWidth: 3.2, strokeLinecap: "round" as const, strokeLinejoin: "round" as const };
  return <svg viewBox="0 0 48 48" aria-hidden="true">
    {type === "investment" && <><path {...common} d="M9 34a17 17 0 1 1 30 0" /><path {...common} d="M12 25h4M32 25h4M24 12v4" /><path className="icon-accent icon-needle" {...common} d="m19 30 11-9-5 13a4 4 0 0 1-6-4Z" /></>}
    {type === "market" && <><circle {...common} cx="22" cy="22" r="13" /><path {...common} d="m31.5 31.5 8 8" /><path className="icon-accent icon-trend" {...common} pathLength={1} d="M15.5 26l5-6 4 3 5-7M27 16h2.5v2.5" /></>}
    {type === "readiness" && <><path {...common} d="M20 8h8l1.5 5a15 15 0 0 1 3.5 2l5-1 4 7-3.5 4a15 15 0 0 1 0 4L42 33l-4 7-5-1a15 15 0 0 1-3.5 2L28 46h-8l-1.5-5a15 15 0 0 1-3.5-2l-5 1-4-7 3.5-4a15 15 0 0 1 0-4L6 21l4-7 5 1a15 15 0 0 1 3.5-2Z" /><path className="icon-accent icon-check" {...common} pathLength={1} d="m17 27 5 5 10-11" /></>}
    {type === "outcome" && <><circle {...common} cx="24" cy="24" r="17" /><path {...common} d="M24 4v3M44 24h-3M24 44v-3M4 24h3" /><path className="icon-accent" {...common} d="M24 14v11l7 4" /></>}
    {type === "traffic" && <>
      <g className="icon-person-one"><circle {...common} cx="24" cy="14" r="5" /><path className="icon-accent" {...common} d="M16 38c0-7 3-11 8-11s8 4 8 11" /></g>
      <g className="icon-person-two"><circle {...common} cx="8" cy="19" r="4" /><path className="icon-accent" {...common} d="M1 39c0-6 3-9 7-9 3 0 5 1 7 3" /></g>
      <g className="icon-person-three"><circle {...common} cx="40" cy="19" r="4" /><path className="icon-accent" {...common} d="M47 39c0-6-3-9-7-9-3 0-5 1-7 3" /></g>
    </>}
  </svg>;
}

const firstInquiryRingProgress: Record<FirstInquiryRange, number> = {
  "1～3": 0.9,
  "3～6": 0.7,
  "6～9": 0.5,
  "9～12": 0.3,
  "12～15": 0.1,
};

function getOutcomeRingProgress(isB2C: boolean, firstInquiryRange: FirstInquiryRange | "", sixMonthMonthlyTraffic: number | null) {
  if (isB2C) {
    if (sixMonthMonthlyTraffic === null) return null;
    const trafficScaleMax = (funnelData2C.top.range?.max ?? 50_000) / 12;
    return Math.min(1, Math.max(0, sixMonthMonthlyTraffic / trafficScaleMax));
  }
  return firstInquiryRange ? firstInquiryRingProgress[firstInquiryRange] : null;
}

function useProgressAnimation(enabled: boolean, animationKey: string) {
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    if (!enabled) {
      setProgress(0);
      return;
    }
    let frame = 0;
    let startedAt: number | undefined;
    setProgress(0);
    const animate = (now: number) => {
      startedAt ??= now;
      const fraction = Math.min(1, (now - startedAt) / 1300);
      setProgress(1 - Math.pow(1 - fraction, 3));
      if (fraction < 1) frame = requestAnimationFrame(animate);
    };
    frame = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(frame);
  }, [enabled, animationKey]);

  return progress;
}

function firstInquiryToGrowthStage(range: FirstInquiryRange | "") {
  return range ? firstInquiryRanges.indexOf(range) : 1;
}

function dashboardHref(item: { number: string; href: string }, sharedToken?: string) {
  if (!sharedToken) return item.href;
  const section = { D01: "overall", D02: "market", D03: "execution", D04: "outcome" }[item.number as "D01" | "D02" | "D03" | "D04"];
  return `/shared/${sharedToken}${section ? `?section=${section}` : ""}`;
}

function DecisionIconGrid({ active, compact = false, investmentScore, marketScore, readinessScore, hasAssessment = false, loadedProjectId = "", firstInquiryRange = "", isB2C = false, sixMonthMonthlyTraffic = null, sharedToken }: { active?: Exclude<DashboardSection, "home">; compact?: boolean; investmentScore?: number; marketScore?: number; readinessScore?: number; hasAssessment?: boolean; loadedProjectId?: string; firstInquiryRange?: FirstInquiryRange | ""; isB2C?: boolean; sixMonthMonthlyTraffic?: number | null; sharedToken?: string }) {
  const loadProgress = useProgressAnimation(!compact && hasAssessment, `${loadedProjectId}:${active ?? "home"}`);
  const items = [
    { number: "D01", label: "投資判斷", detail: hasAssessment ? `${investmentScore}／100・有條件投入` : "SEO 是否值得投入", href: "/overall", type: "investment" as const, active: active === "overall" },
    { number: "D02", label: "市場機會", detail: hasAssessment ? `${marketScore}／100・長尾可切入` : "未來搜尋成長空間", href: "/market", type: "market" as const, active: active === "market" },
    { number: "D03", label: "落地準備", detail: hasAssessment ? `${readinessScore}／100・承接能力` : "網站與執行條件", href: "/execution", type: "readiness" as const, active: active === "execution" },
    { number: "D04", label: "成果預估", detail: isB2C ? sixMonthMonthlyTraffic !== null ? `半年後自然搜尋月流量 ${sixMonthMonthlyTraffic.toLocaleString("zh-TW")} 人次` : "半年後自然搜尋月流量待設定" : firstInquiryRange ? `${firstInquiryRange} 個月・首筆有效詢問` : "首筆有效詢問時間待設定", href: "/outcome", type: isB2C ? "traffic" as const : "outcome" as const, active: active === "outcome" },
  ];
  if (!compact) {
    const scores = [investmentScore, marketScore, readinessScore];
    const notes = ["有條件投入", "長尾需求具潛力", "承接能力待補強"];
    return (
      <div className="decision-icon-grid home-score-grid" role="navigation" aria-label="四大決策頁面">
        {items.map((item, index) => {
          const score = scores[index];
          const scoreAvailable = hasAssessment && typeof score === "number" && Number.isFinite(score);
          const displayValue = index === 3 ? (loadedProjectId ? isB2C ? sixMonthMonthlyTraffic !== null ? `${sixMonthMonthlyTraffic.toLocaleString("zh-TW")} 人次／月` : "待設定" : firstInquiryRange ? `${firstInquiryRange} 個月` : "待設定" : "載入中") : (scoreAvailable ? String(Math.round((score ?? 0) * loadProgress)) : "—");
          const outcomeProgress = index === 3 ? getOutcomeRingProgress(isB2C, firstInquiryRange, sixMonthMonthlyTraffic) : null;
          const ringAngle = index === 3 ? (outcomeProgress ?? 0) * 360 * loadProgress : scoreAvailable ? Math.min(100, Math.max(0, score ?? 0)) * 3.6 * loadProgress : 0;
          const ringAvailable = index === 3 ? outcomeProgress !== null && loadedProjectId !== "" : scoreAvailable;
          const note = index === 3 ? isB2C ? "半年後預估自然搜尋月流量" : "首筆新增有效詢問" : (scoreAvailable ? notes[index] : "等待資料評估");
          return (
            <a href={dashboardHref(item, sharedToken)} aria-label={`前往${item.label}：${index === 3 ? displayValue : scoreAvailable ? score : "待評估"}${index === 3 || !scoreAvailable ? "" : "分"}`} key={item.number}>
              <i className={`home-score-ring ${index === 3 ? "outcome-ring" : ""} ${!ringAvailable ? "time-ring" : ""} ${ringAvailable && loadProgress < 1 ? "is-loading" : ""}`} style={{ "--ring-angle": `${ringAngle}deg` } as CSSProperties} aria-hidden="true"><span><DecisionIcon type={item.type} /></span></i>
              <b>{item.number}</b>
              <em className={`home-score-value ${index === 3 ? isB2C ? "time-value traffic-value" : "time-value" : ""}`}>{displayValue}{index !== 3 && <small>／100</small>}</em>
              <strong>{item.label}</strong><small>{note}</small><span className="home-card-cta">查看詳細評估 <em>→</em></span>
            </a>
          );
        })}
      </div>
    );
  }
  return (
    <div className={`decision-icon-grid ${compact ? "compact" : ""}`} role="navigation" aria-label="四大決策頁面">
      {items.map((item) => <a href={dashboardHref(item, sharedToken)} className={item.active ? "active" : ""} aria-current={item.active ? "page" : undefined} aria-label={`前往${item.label}`} key={item.number}><i><DecisionIcon type={item.type} /></i><b>{item.number}</b><strong>{item.label}</strong><small>{item.detail}</small></a>)}
    </div>
  );
}

export function Dashboard({ section = "home", sharedProject }: { section?: DashboardSection; sharedProject?: SharedProject }) {
  const [siteMode, setSiteMode] = useState<SiteMode>("A");
  const [businessType, setBusinessType] = useState<BusinessType>("B2B");
  const [viewMode, setViewMode] = useState<ViewMode>("client");
  const [canReview, setCanReview] = useState(false);
  const [metricsA, setMetricsA] = useState(aMetrics);
  const [metricsB, setMetricsB] = useState(bMetrics);
  const [metricsC, setMetricsC] = useState(cMetrics);
  const [selectedMetric, setSelectedMetric] = useState("market");
  const [detailOpen, setDetailOpen] = useState(false);
  const detailDialog = useRef<HTMLDialogElement>(null);
  const [selectedScenario, setSelectedScenario] = useState("full");
  const [priorities, setPriorities] = useState(initialPriorities);
  const [resultTracking, setResultTracking] = useState<ResultTracking>(initialResultTracking);
  const [year, setYear] = useState<1 | 2 | 3>(1);
  const [funnelValues, setFunnelValues] = useState<FunnelValues>(initialFunnelValues);
  const [funnel2CYearSettings, setFunnel2CYearSettings] = useState<Funnel2CYearSettings>(defaultFunnel2CYearSettings);
  const [partnerCategoryDescription, setPartnerCategoryDescription] = useState("");
  const [fermentationStage, setFermentationStage] = useState(1);
  const [stableGrowthStage, setStableGrowthStage] = useState(3);
  const [marketCriteria, setMarketCriteria] = useState<MarketCriterion[]>(initialMarketCriteria);
  const [commercialCriteria, setCommercialCriteria] = useState<MarketCriterion[]>(initialCommercialCriteriaB2B);
  const [readinessCriteria, setReadinessCriteria] = useState<Record<string, ReadinessCriterion[]>>(initialReadinessCriteria);
  const [readinessAdjustments, setReadinessAdjustments] = useState<Record<string, number>>({ content: 0, eeat: 0, ai: 0, conversion: 0, technical: 0 });
  const [outcomeScoring, setOutcomeScoring] = useState<OutcomeScoringSettings>(defaultOutcomeScoring);
  const [uploadedReportName, setUploadedReportName] = useState("");
  const [assessmentDate, setAssessmentDate] = useState("2026-08-08");
  const [activeProjectId, setActiveProjectId] = useState("");
  const [loadedProjectId, setLoadedProjectId] = useState("");
  const [firstInquiryRange, setFirstInquiryRange] = useState<FirstInquiryRange | "">("");
  const [sixMonthMonthlyTraffic, setSixMonthMonthlyTraffic] = useState<number | null>(null);
  const [heroImageUrl, setHeroImageUrl] = useState("");
  const [heroImageSource, setHeroImageSource] = useState<"auto" | "manual">("auto");
  const [heroImageLoading, setHeroImageLoading] = useState(false);
  const [fieldManagement, setFieldManagement] = useState<FieldManagement>(defaultFieldManagement);
  const [clientName, setClientName] = useState("Mobellio");
  const [websiteUrl, setWebsiteUrl] = useState("");
  const [saveStatus, setSaveStatus] = useState<"idle" | "saved" | "error">("idle");
  const allMetrics = siteMode === "A" ? metricsA : siteMode === "B" ? metricsB : metricsC;
  // 01 需要完整讀取所有評估指標來計算整體分數；欄位篩選只影響 02／03 的明細列表。
  const pageForSection: DashboardPage | null = section === "market" ? "02" : section === "execution" ? "03" : null;
  const pageHasEnabledFields = (page: DashboardPage) => Object.values(fieldManagement).some(setting => setting.enabled && setting.pages.includes(page));
  const fieldKeysForMetric = (metric: Metric) => metric.id === "market" ? ["market_opportunity_score"] : metric.id === "commercial" ? ["commercial_value_score"] : ["metric_id", "metric_score"];
  const metrics = allMetrics.filter(metric => {
    if (!pageForSection) return true;
    return fieldKeysForMetric(metric).every(key => {
      const setting = fieldManagement[key];
      return !setting || (setting.enabled && (setting.pages.length === 0 || setting.pages.includes(pageForSection)));
    });
  });
  const sourceMetrics = metrics.length ? metrics : allMetrics;
  const activeMode = modeMeta[siteMode];
  const activeMetric = sourceMetrics.find((metric) => metric.id === selectedMetric) ?? sourceMetrics[0];
  const completed = priorities.filter((item) => item.status === "已完成").length;
  const progress = Math.round((completed / priorities.length) * 100);
  // 明細頁可以依欄位管理隱藏項目，但整體分數與載入動畫必須使用完整評估資料。
  const readiness = useMemo(() => Math.round(allMetrics.slice(2).reduce((sum, item) => sum + item.score, 0) / (allMetrics.length - 2)), [allMetrics]);
  const marketMetric = allMetrics.find((metric) => metric.id === "market");
  const commercialMetric = allMetrics.find((metric) => metric.id === "commercial");
  const seoSuccessScore = marketMetric && commercialMetric ? (marketMetric.score + commercialMetric.score) / 2 : null;
  const isB2C = businessType === "B2C";
  const outcomeScore = useMemo(() => {
    if (isB2C) {
      const traffic = sixMonthMonthlyTraffic ?? 0;
      return outcomeScoring.toc.find((item) => traffic >= item.minTraffic)?.score ?? 0;
    }
    return firstInquiryRange ? outcomeScoring.tob[firstInquiryRange] ?? 0 : 0;
  }, [isB2C, sixMonthMonthlyTraffic, firstInquiryRange, outcomeScoring]);
  const coreDecisionScore = seoSuccessScore === null ? readiness : (seoSuccessScore + readiness) / 2;
  const outcomeScorePercent = outcomeScore * 10;
  const investmentScore = Math.round(coreDecisionScore * 1 + outcomeScorePercent * 0.1);
  const hasAssessment = Boolean(loadedProjectId) && investmentScore > 0;
  const ringLoadProgress = useProgressAnimation(hasAssessment, `${loadedProjectId}:${section}`);
  const reportSupportItems = hasAssessment
    ? metrics.filter(item => item.score >= 70).slice(0, 3).map(item => `${item.label}：${compactReportExcerpt(item.evidence)}`)
    : ["高客單價，少量精準詢問也具價值", "存在可切入的利基長尾需求", "品牌工藝與設計證據具差異化"];
  const reportRiskItems = hasAssessment
    ? metrics.filter(item => item.score < 70).slice(0, 3).map(item => `${item.label}：${compactReportExcerpt(item.gap)}`)
    : ["海外案例與交付證據仍不足", "內容素材與承接路徑需要補齊", "需設定可驗證的階段性成果"];
  const opportunityGap = seoSuccessScore === null ? null : Math.round(seoSuccessScore) - readiness;
  const displayedMetrics = section === "market"
    ? metrics.filter((metric) => ["market", "commercial", "legacy"].includes(metric.id))
    : section === "execution"
      ? metrics.filter((metric) => !["market", "commercial", "legacy"].includes(metric.id))
      : metrics;
  const currentSection = section === "home" ? null : sectionMeta[section];
  const currentFunnel = funnelValues[year];
  const currentFunnel2CSettings = funnel2CYearSettings[year];
  const partnerValueAmount = amountFromText(currentFunnel.partnerValue);
  const partnerCountAverage = averageFromText(currentFunnel.partners);
  const productPriceAmount = amountFromText(currentFunnel.productPrice);
  const leadAverage = averageFromText(currentFunnel.leads);
  const discussionRate = rateFromText(currentFunnel.discussion);
  const directPurchaseRate = rateFromText(currentFunnel.close);
  const calculatedFunnelOutcome = formatAmount(
    partnerValueAmount !== null && partnerCountAverage !== null && productPriceAmount !== null && leadAverage !== null && discussionRate !== null && directPurchaseRate !== null
      ? partnerCountAverage * partnerValueAmount + leadAverage * discussionRate * directPurchaseRate * productPriceAmount
      : null,
  );

  useEffect(() => {
    if (sharedProject) { setCanReview(false); setViewMode("client"); return; }
    fetch("/api/auth/me", { cache: "no-store" }).then(response => response.ok ? response.json() : null).then(data => {
      const owner = data?.access?.kind === "owner";
      setCanReview(owner);
      if (!owner) setViewMode("client");
    }).catch(() => { setCanReview(false); setViewMode("client"); });
  }, []);

  useEffect(() => {
    const dialog = detailDialog.current;
    if (!dialog) return;
    if (detailOpen && !dialog.open) dialog.showModal();
    if (!detailOpen && dialog.open) dialog.close();
  }, [detailOpen, selectedMetric]);

  useEffect(() => {
    if (!isB2C) setFermentationStage(firstInquiryToGrowthStage(firstInquiryRange));
  }, [firstInquiryRange, isB2C]);

  useEffect(() => {
    function applySavedData(data: Record<string, unknown>, businessTypeForData: BusinessType = businessType) {
      if (data.metricsA) setMetricsA(data.metricsA as Metric[]);
      if (data.metricsB) setMetricsB(data.metricsB as Metric[]);
      if (data.metricsC) setMetricsC(data.metricsC as Metric[]);
      if (data.selectedScenario) setSelectedScenario(String(data.selectedScenario));
      if (data.priorities) setPriorities(data.priorities as Priority[]);
      if (data.resultTracking && typeof data.resultTracking === "object") setResultTracking({ ...initialResultTracking, ...data.resultTracking as Partial<ResultTracking> });
      else setResultTracking(initialResultTracking);
      if (data.funnelValues) setFunnelValues(normalizeFunnelValues(data.funnelValues));
      if (data.funnel2CYearSettings) setFunnel2CYearSettings(normalizeFunnel2CYearSettings(data.funnel2CYearSettings));
      else if (data.funnel2CSettings) setFunnel2CYearSettings(normalizeFunnel2CYearSettings(data.funnel2CSettings));
      else setFunnel2CYearSettings(normalizeFunnel2CYearSettings({}));
      if (typeof data.partnerCategoryDescription === "string") setPartnerCategoryDescription(data.partnerCategoryDescription);
      if (Number.isInteger(data.fermentationStage)) setFermentationStage(Number(data.fermentationStage));
      if (Number.isInteger(data.stableGrowthStage)) setStableGrowthStage(Number(data.stableGrowthStage));
      if (Array.isArray(data.marketCriteria)) setMarketCriteria(normalizeMarketCriteria(data.marketCriteria));
      if (Array.isArray(data.commercialCriteria)) {
        const savedCommercialCriteria = data.commercialCriteria as MarketCriterion[];
        setCommercialCriteria(commercialCriteriaMatchesBusinessType(savedCommercialCriteria, businessTypeForData) ? savedCommercialCriteria : commercialCriteriaForBusinessType(businessTypeForData));
      } else {
        setCommercialCriteria(commercialCriteriaForBusinessType(businessTypeForData));
      }
      if (data.readinessCriteria) setReadinessCriteria(data.readinessCriteria as Record<string, ReadinessCriterion[]>);
      if (data.readinessAdjustments) setReadinessAdjustments(data.readinessAdjustments as Record<string, number>);
      if (data.outcomeScoring) setOutcomeScoring(normalizeOutcomeScoring(data.outcomeScoring));
      if (data.fieldManagement && typeof data.fieldManagement === "object") setFieldManagement({ ...defaultFieldManagement, ...(data.fieldManagement as FieldManagement) });
      if (typeof data.heroImageUrl === "string") setHeroImageUrl(data.heroImageUrl);
      if (data.heroImageSource === "manual" || data.heroImageSource === "auto") setHeroImageSource(data.heroImageSource);
    }
    async function loadProject() {
      try {
        if (sharedProject) {
          setClientName(sharedProject.clientName); setWebsiteUrl(sharedProject.websiteUrl || "");
          if (["B2B", "B2C", "其他"].includes(sharedProject.businessType)) setBusinessType(sharedProject.businessType as BusinessType);
          if (["A", "B", "C"].includes(sharedProject.siteMode)) setSiteMode(sharedProject.siteMode as SiteMode);
          setUploadedReportName(sharedProject.reportName || "尚未上傳評估報告"); setAssessmentDate(sharedProject.assessmentDate || "");
          const projectBusinessType = ["B2B", "B2C", "其他"].includes(sharedProject.businessType) ? sharedProject.businessType as BusinessType : "B2B";
          applySavedData(sharedProject.data, projectBusinessType); setLoadedProjectId(`shared:${sharedProject.token}`); return;
        }
        const listResponse = await fetch("/api/projects");
        const listData = await listResponse.json();
        if (!listResponse.ok || !listData.projects?.length) throw new Error(listData.error || "尚無專案資料");
        const savedId = window.localStorage.getItem("kevin-active-project-id");
        const id = listData.projects.some((project: { id: string }) => project.id === savedId) ? savedId : listData.projects[0].id;
        window.localStorage.setItem("kevin-active-project-id", id);
        setActiveProjectId(id);
        const response = await fetch(`/api/projects/${id}`);
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || "專案載入失敗");
        const project = data.project;
        setClientName(project.clientName);
        setWebsiteUrl(project.websiteUrl || "");
        if (["B2B", "B2C", "其他"].includes(project.businessType)) setBusinessType(project.businessType as BusinessType);
        if (["A", "B", "C"].includes(project.siteMode)) setSiteMode(project.siteMode);
        setUploadedReportName(project.reportName || "尚未上傳評估報告");
        setAssessmentDate(project.assessmentDate || new Date().toLocaleDateString("en-CA"));
        const dashboardData = JSON.parse(project.dashboardData || "{}");
        const savedRange = dashboardData.firstInquiryRange;
        setFirstInquiryRange(typeof savedRange === "string" && firstInquiryRanges.some(range => range === savedRange) ? savedRange as FirstInquiryRange : id === "mobellio-v1" ? "9～12" : "");
        const savedTraffic = dashboardData.sixMonthMonthlyTraffic;
        setSixMonthMonthlyTraffic(typeof savedTraffic === "number" && Number.isFinite(savedTraffic) && savedTraffic >= 0 ? Math.round(savedTraffic) : null);
        const projectBusinessType = ["B2B", "B2C", "其他"].includes(project.businessType) ? project.businessType as BusinessType : "B2B";
        if (Object.keys(dashboardData).length) applySavedData(dashboardData, projectBusinessType);
        else if (id !== "mobellio-v1") {
          const emptyMetric = (item: Metric): Metric => ({ ...item, score: 0, evidence: "尚未完成此專案的資料分析。", gap: "等待評估報告、客戶官網或訪談資料。", action: "完成資料設定後，由 AI 初評並交由 Kevin 審核。" });
          setMetricsA(aMetrics.map(emptyMetric));
          setMetricsB(bMetrics.map(emptyMetric));
          setMetricsC(cMetrics.map(emptyMetric));
          setMarketCriteria(initialMarketCriteria.map(item => ({ ...item, checked: false })));
          setCommercialCriteria(commercialCriteriaForBusinessType(projectBusinessType));
          setReadinessCriteria(Object.fromEntries(Object.entries(initialReadinessCriteria).map(([key, items]) => [key, items.map(item => ({ ...item, checked: false, source: "待確認" as const }))])));
          setPriorities([]);
          setFunnelValues({
            1: { leads: "待評估", discussion: "待評估", close: "待評估", partners: "待評估", partnerValue: "待評估", productPrice: "待評估" },
            2: { leads: "待評估", discussion: "待評估", close: "待評估", partners: "待評估", partnerValue: "待評估", productPrice: "待評估" },
            3: { leads: "待評估", discussion: "待評估", close: "待評估", partners: "待評估", partnerValue: "待評估", productPrice: "待評估" },
          });
        }
        setLoadedProjectId(id);
      } catch {
        setSaveStatus("error");
      }
    }
    loadProject();
  }, [sharedProject]);

  useEffect(() => {
    if (section === "home" && websiteUrl && !heroImageUrl && heroImageSource === "auto") fetchHeroImage();
  }, [section, websiteUrl, heroImageUrl, heroImageSource]);

  async function fetchHeroImage() {
    if (!websiteUrl) return;
    setHeroImageLoading(true);
    try {
      const response = await fetch(`/api/site-preview-image?url=${encodeURIComponent(websiteUrl)}`);
      const data = await response.json();
      if (response.ok && data.imageUrl) {
        setHeroImageUrl(String(data.imageUrl));
        setHeroImageSource("auto");
        setSaveStatus("idle");
      }
    } finally {
      setHeroImageLoading(false);
    }
  }

  async function prepareHeroImage(file: File) {
    const reader = new FileReader();
    const dataUrl = await new Promise<string>((resolve, reject) => { reader.onload = () => resolve(String(reader.result)); reader.onerror = () => reject(reader.error); reader.readAsDataURL(file); });
    const image = new Image();
    image.src = dataUrl;
    await new Promise<void>((resolve, reject) => { image.onload = () => resolve(); image.onerror = () => reject(new Error("圖片讀取失敗")); });
    const maxWidth = 1400;
    const scale = Math.min(1, maxWidth / image.naturalWidth);
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(image.naturalWidth * scale);
    canvas.height = Math.round(image.naturalHeight * scale);
    canvas.getContext("2d")?.drawImage(image, 0, 0, canvas.width, canvas.height);
    setHeroImageUrl(canvas.toDataURL("image/jpeg", 0.82));
    setHeroImageSource("manual");
    setSaveStatus("idle");
  }

  function changeMode(mode: SiteMode) {
    setDetailOpen(false);
    setSiteMode(mode);
    setSelectedMetric("market");
  }

  function changeScore(value: number) {
    const setter = siteMode === "A" ? setMetricsA : siteMode === "B" ? setMetricsB : setMetricsC;
    setter((items) => items.map((item) => item.id === activeMetric.id ? { ...item, score: value } : item));
  }

  function applyMarketCriteria(next: MarketCriterion[]) {
    setMarketCriteria(next);
    const score = Math.min(100, next.filter(item => item.checked).reduce((sum, item) => sum + Math.max(0, item.score || 0), 0));
    const setter = siteMode === "A" ? setMetricsA : siteMode === "B" ? setMetricsB : setMetricsC;
    setter(items => items.map(item => item.id === "market" ? { ...item, score } : item));
  }

  function updateMarketCriterion(id: string, patch: Partial<MarketCriterion>) {
    applyMarketCriteria(marketCriteria.map(item => item.id === id ? { ...item, ...patch } : item));
  }

  function addMarketCriterion() {
    applyMarketCriteria([...marketCriteria, { id: `criterion-${Date.now()}`, label: "新的搜尋市場判斷條件", score: 20, checked: false }]);
  }

  function removeMarketCriterion(id: string) {
    applyMarketCriteria(marketCriteria.filter(item => item.id !== id));
  }

  function applyCommercialCriteria(next: MarketCriterion[]) {
    setCommercialCriteria(next);
    const score = Math.min(100, next.filter(item => item.checked).reduce((sum, item) => sum + Math.max(0, item.score || 0), 0));
    const setter = siteMode === "A" ? setMetricsA : siteMode === "B" ? setMetricsB : setMetricsC;
    setter(items => items.map(item => item.id === "commercial" ? { ...item, score } : item));
  }

  function updateCommercialCriterion(id: string, patch: Partial<MarketCriterion>) {
    applyCommercialCriteria(commercialCriteria.map(item => item.id === id ? { ...item, ...patch } : item));
  }

  function addCommercialCriterion() {
    applyCommercialCriteria([...commercialCriteria, { id: `commercial-${Date.now()}`, label: "新的商業價值判斷條件", score: 20, checked: false }]);
  }

  function removeCommercialCriterion(id: string) {
    applyCommercialCriteria(commercialCriteria.filter(item => item.id !== id));
  }

  function readinessAutoScore(metricId: string, criteria = readinessCriteria[metricId] || []) {
    return Math.min(100, criteria.filter(item => item.checked).reduce((sum, item) => sum + Math.max(0, item.score || 0), 0));
  }

  function applyReadinessCriteria(metricId: string, next: ReadinessCriterion[], adjustment = readinessAdjustments[metricId] || 0) {
    setReadinessCriteria(items => ({ ...items, [metricId]: next }));
    const score = Math.min(100, Math.max(0, readinessAutoScore(metricId, next) + adjustment));
    const setter = siteMode === "A" ? setMetricsA : siteMode === "B" ? setMetricsB : setMetricsC;
    setter(items => items.map(item => item.id === metricId ? { ...item, score } : item));
  }

  function updateReadinessCriterion(metricId: string, id: string, patch: Partial<ReadinessCriterion>) {
    applyReadinessCriteria(metricId, (readinessCriteria[metricId] || []).map(item => item.id === id ? { ...item, ...patch } : item));
  }

  function addReadinessCriterion(metricId: string) {
    applyReadinessCriteria(metricId, [...(readinessCriteria[metricId] || []), { id: `${metricId}-${Date.now()}`, label: "新的內部落地判斷條件", score: 0, checked: false, source: "待確認" }]);
  }

  function removeReadinessCriterion(metricId: string, id: string) {
    applyReadinessCriteria(metricId, (readinessCriteria[metricId] || []).filter(item => item.id !== id));
  }

  function adjustReadinessScore(metricId: string, adjustment: number) {
    setReadinessAdjustments(items => ({ ...items, [metricId]: adjustment }));
    applyReadinessCriteria(metricId, readinessCriteria[metricId] || [], adjustment);
  }

  function cyclePriority(id: number) {
    const order: Priority["status"][] = ["待處理", "進行中", "已完成"];
    setPriorities((items) => items.map((item) => item.id === id ? { ...item, status: order[(order.indexOf(item.status) + 1) % order.length] } : item));
  }

  function updateFunnel(field: "leads" | "discussion" | "close" | "partners" | "partnerValue" | "productPrice", value: string) {
    setFunnelValues((years) => ({ ...years, [year]: { ...years[year], [field]: value } }));
  }

  async function saveDashboard() {
    try {
      if (!activeProjectId) throw new Error("尚未選擇專案");
      const dashboardData = {
        metricsA,
        metricsB,
        metricsC,
        selectedScenario,
        priorities,
        resultTracking,
        funnelValues,
        funnel2CYearSettings,
        partnerCategoryDescription,
        firstInquiryRange,
        sixMonthMonthlyTraffic,
        fermentationStage,
        stableGrowthStage,
        marketCriteria,
        commercialCriteria,
        readinessCriteria,
        readinessAdjustments,
        outcomeScoring,
        fieldManagement,
        heroImageUrl,
        heroImageSource,
        savedAt: new Date().toISOString(),
      };
      const response = await fetch(`/api/projects/${activeProjectId}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ dashboardData }),
      });
      if (!response.ok) throw new Error("儲存失敗");
      setSaveStatus("saved");
      window.setTimeout(() => setSaveStatus("idle"), 2200);
    } catch {
      setSaveStatus("error");
    }
  }

  return (
    <main className="app-shell">
      <header className={`topbar ${sharedProject ? "shared-readonly-topbar" : ""}`}>
        <div className="brand">
          <span className="brand-mark">K</span>
          <span><strong>Kevin SEO Decision Dashboard</strong><small>{sharedProject ? "單一專案唯讀檢視" : "SEO＋AI Search 投資決策儀表板"}</small></span>
        </div>
        <div className="topbar-actions">
          {viewMode === "review" && <button className={`save-button ${saveStatus}`} type="button" onClick={saveDashboard}>{saveStatus === "saved" ? "✓ 已儲存" : saveStatus === "error" ? "儲存失敗・請重試" : "儲存變更"}</button>}
          {canReview && <div className="view-mode-switch" role="group" aria-label="檢視模式">
            <button type="button" className={viewMode === "client" ? "active" : ""} onClick={() => setViewMode("client")}>客戶瀏覽</button>
            <button type="button" className={viewMode === "review" ? "active" : ""} onClick={() => setViewMode("review")}>Kevin 審核</button>
          </div>}
        </div>
      </header>
      <Sidebar active={section} reviewMode={canReview && viewMode === "review"} singleProjectReadonly={Boolean(sharedProject)} readonlyProjectName={clientName} sharedToken={sharedProject?.token} />
      {saveStatus !== "idle" && <div className={`save-toast ${saveStatus}`} role="status"><b>{saveStatus === "saved" ? "✓" : "!"}</b><span><strong>{saveStatus === "saved" ? "變更已儲存" : "儲存失敗"}</strong><small>{saveStatus === "saved" ? "評估設定與分數已經更新。" : "請稍後再試一次。"}</small></span></div>}

      <div className={`workspace sidebar-workspace ${viewMode}-mode`}>
        {section === "home" && (
          <section className="portal-hero">
            <div className="portal-copy">
              <div className="home-project-meta"><span>{clientName}・{activeMode.name}</span><small>評估日期 {assessmentDate.replaceAll("-", ".")}</small></div>
              <p className="kicker">決策評估 DM・SEO＋AI SEARCH 投資決策入口</p>
              <h1>{hasAssessment && opportunityGap !== null && opportunityGap > 0 ? "有條件投入，先補承接再擴大" : "先判斷 SEO 是否值得投入"}</h1>
              <p>從市場機會、網站準備到成果時間，一頁掌握 SEO 投資判斷。</p>
              {hasAssessment && <div className="home-verdict-line"><strong>投資結論｜有條件投入</strong><span>先改善承接，再逐步擴大 SEO 投入。</span></div>}
            </div>
            <div className="portal-website-visual">
              <span className="portal-product-badge">官網產品示意</span>
              {heroImageUrl ? <img src={heroImageUrl} alt={`${clientName} 官網示意圖`} /> : <div className="portal-website-placeholder"><span>WEB</span><strong>{heroImageLoading ? "正在讀取官網代表圖…" : "尚未取得官網示意圖"}</strong><small>可由官網自動抓取，或在 Kevin 審核模式上傳</small></div>}
              <div className="portal-website-caption"><span>客戶官網示意圖</span><small>{heroImageSource === "manual" ? "Kevin 手動上傳・自動調整比例" : "來源：官網代表圖片"}</small></div>
              {viewMode === "review" && <div className="portal-website-controls"><button type="button" onClick={fetchHeroImage} disabled={heroImageLoading}>{heroImageLoading ? "讀取中…" : "重新抓取官網圖片"}</button><label>上傳示意圖<input type="file" accept="image/*" onChange={event => { const file = event.target.files?.[0]; if (file) void prepareHeroImage(file); event.currentTarget.value = ""; }} /></label></div>}
            </div>
            <DecisionIconGrid investmentScore={investmentScore} marketScore={seoSuccessScore === null ? undefined : Math.round(seoSuccessScore)} readinessScore={readiness} hasAssessment={hasAssessment} loadedProjectId={loadedProjectId} firstInquiryRange={firstInquiryRange} isB2C={isB2C} sixMonthMonthlyTraffic={sixMonthMonthlyTraffic} sharedToken={sharedProject?.token} />
            {viewMode === "review" && loadedProjectId && <>
              {isB2C ? <div className="home-range-settings"><label className="home-traffic-setting"><strong>Kevin 設定｜半年後預估自然搜尋月流量</strong><span><input type="number" min="0" step="1" inputMode="numeric" value={sixMonthMonthlyTraffic ?? ""} onChange={event => { const next = Number(event.target.value); setSixMonthMonthlyTraffic(event.target.value === "" || !Number.isFinite(next) ? null : Math.max(0, Math.round(next))); setSaveStatus("idle"); }} placeholder="請輸入預估人次" />人次／月</span></label><small>請依目前專案評估；此數值並非年度流量的月平均。變更後請按右上角「儲存變更」。</small></div> : <div className="home-range-settings"><strong>Kevin 設定｜首筆新增有效詢問預估區間</strong><div role="group" aria-label="首筆新增有效詢問預估區間">{firstInquiryRanges.map(range => <button key={range} type="button" aria-pressed={firstInquiryRange === range} onClick={() => { setFirstInquiryRange(range); setFermentationStage(firstInquiryToGrowthStage(range)); setSaveStatus("idle"); }}>{range} 個月</button>)}</div><small>依目前專案條件選擇，04「初步發酵期」會同步更新。</small></div>}
              <div className="home-range-settings outcome-score-settings"><strong>Kevin 設定｜成果情境計分（額外加權 10%）</strong><small>01 總分＝「搜尋成長機會＋落地準備」平均分數 × 100% ＋「成果情境」分數 × 10%。以下分數可依你的判斷手動調整。</small>
                {!isB2C ? <div className="outcome-score-grid">{firstInquiryRanges.map(range => <label key={range}><span>{range} 個月</span><input type="number" min="0" max="10" step="1" value={outcomeScoring.tob[range]} onChange={event => { const score = Math.min(10, Math.max(0, Number(event.target.value))); setOutcomeScoring(current => ({ ...current, tob: { ...current.tob, [range]: score } })); setSaveStatus("idle"); }} /><em>分</em></label>)}</div> : <div className="outcome-score-grid">{outcomeScoring.toc.map((item, index) => <label key={index}><span>{item.minTraffic.toLocaleString("zh-TW")} 人次以上</span><input type="number" min="0" max="10" step="1" value={item.score} onChange={event => { const score = Math.min(10, Math.max(0, Number(event.target.value))); setOutcomeScoring(current => ({ ...current, toc: current.toc.map((entry, entryIndex) => entryIndex === index ? { ...entry, score } : entry) })); setSaveStatus("idle"); }} /><em>分</em></label>)}</div>}
              </div>
            </>}
            {hasAssessment && opportunityGap !== null && <div className="home-score-insight"><strong>{opportunityGap === 0 ? "機會與準備相近" : `${opportunityGap > 0 ? "機會領先準備" : "準備領先機會"} ${Math.abs(opportunityGap)} 分`}</strong><span>市場機會 {Math.round(seoSuccessScore!)} 分、落地準備 {readiness} 分；{opportunityGap > 0 ? "先補承接頁與信任證據，再放大流量。" : "依市場需求安排下一步投入。"}</span></div>}
          </section>
        )}

        {section !== "home" && (
          <section className="section-nav" aria-label="四大評估頁面導覽">
            <a className="back-home" href={sharedProject ? `/shared/${sharedProject.token}` : "/"}>← 返回決策首頁</a>
            <div className="section-heading"><span>{currentSection?.number}</span><div><small>{currentSection?.short}</small><h1>{currentSection?.title}</h1><p>{currentSection?.subtitle}</p></div></div>
            <DecisionIconGrid active={section} compact firstInquiryRange={firstInquiryRange} isB2C={isB2C} sixMonthMonthlyTraffic={sixMonthMonthlyTraffic} sharedToken={sharedProject?.token} />
          </section>
        )}

        <section className={`source-strip ${section === "home" ? "section-hidden" : ""}`} aria-label="目前評估設定">
          <div><span className="source-icon">DOC</span><span><strong>{uploadedReportName || "尚未上傳評估報告"}</strong><small>{clientName}・評估日期 {assessmentDate.replaceAll("-", ".")}</small></span></div>
          <div className="source-actions"><span className="data-status">商業模式：{businessType}｜網站類型：{activeMode.name}</span>{!sharedProject && <a className="settings-link" href="/data-fields">前往設定</a>}</div>
        </section>

        <section className="type-selector section-hidden" aria-label="網站評估類型">
          <button type="button" className={siteMode === "A" ? "selected" : ""} onClick={() => changeMode("A")}>
            <b>A</b><span><strong>現有網站優化</strong><small>{modeMeta.A.note}</small></span>
          </button>
          <button type="button" className={siteMode === "B" ? "selected" : ""} onClick={() => changeMode("B")}>
            <b>B</b><span><strong>全新網站建置（全新網域）</strong><small>{modeMeta.B.note}</small></span>
          </button>
          <button type="button" className={siteMode === "C" ? "selected" : ""} onClick={() => changeMode("C")}>
            <b>C</b><span><strong>全新網站建置（舊網域）</strong><small>{modeMeta.C.note}</small></span>
          </button>
        </section>

        <section className={`investment-overview ${section !== "overall" || !pageHasEnabledFields("01") ? "section-hidden" : ""}`} aria-label="投資判斷摘要">
          <header className="investment-overview-header">
            <div>
              <p className="kicker">決策評估 / D01 投資判斷</p>
              <h1>總體投資判斷</h1>
              <p>這個專案值不值得投入？</p>
            </div>
            <span>{clientName}・{activeMode.name}</span>
          </header>

          <div className="investment-conclusion">
              <i className={`investment-donut tone-${scoreTone(investmentScore)} ${hasAssessment && ringLoadProgress < 1 ? "is-loading" : ""}`} style={{ background: `conic-gradient(color-mix(in srgb, var(--donut-color) 88%, transparent) ${hasAssessment ? investmentScore * 3.6 * ringLoadProgress : 0}deg, #e7e5e1 0deg)` }} aria-hidden="true">
              <span><strong>{hasAssessment ? investmentScore : "—"}</strong><small>/100</small></span>
            </i>
            <div className="investment-conclusion-copy">
              <span className="investment-label">總體投資適合度</span>
              <h2>{hasAssessment ? "有條件投入" : "等待評估"}</h2>
              <p>{hasAssessment ? "具備市場機會與發展潛力，建議先補強關鍵承接條件，再逐步擴大投入。" : "請先完成評估報告與網站資料設定，再由 Kevin 進行審核。"}</p>
              <span className="investment-status">{hasAssessment ? isB2C ? `半年後預估自然搜尋月流量：${sixMonthMonthlyTraffic !== null ? `${sixMonthMonthlyTraffic.toLocaleString("zh-TW")} 人次／月` : "待設定"}` : `首筆新增有效詢問：${firstInquiryRange ? `預估 ${firstInquiryRange} 個月` : "待設定"}` : "尚未建立專案判斷"}</span>
              <p className="investment-formula-text" aria-label="總體投資適合度計算公式">計算方式：搜尋成長機會與落地準備的平均分數，再加上成果情境加分（0～10 分）。目前搜尋成長機會 {hasAssessment && seoSuccessScore !== null ? `${Math.round(seoSuccessScore)} 分` : "待評估"}、落地準備 {hasAssessment ? `${readiness} 分` : "待評估"}，最後加上成果情境加分。</p>
            </div>
          </div>

          <div className="investment-section-heading"><div><p className="kicker">判斷依據</p><h2>三個面向，快速看懂投入理由</h2></div><span>詳細評估內容分別保留在各明細頁</span></div>
          <div className="investment-evidence-grid">
            <a href="/market" className="investment-evidence-card">
              <i className={`score-donut investment-evidence-ring ${hasAssessment && ringLoadProgress < 1 ? "is-loading" : ""}`} style={{ "--evidence-progress": `${hasAssessment && seoSuccessScore !== null ? Math.max(0, Math.min(100, seoSuccessScore)) * 3.6 * ringLoadProgress : 0}deg`, background: `conic-gradient(color-mix(in srgb, var(--donut-color) 84%, transparent) ${hasAssessment && seoSuccessScore !== null ? Math.max(0, Math.min(100, seoSuccessScore)) * 3.6 * ringLoadProgress : 0}deg, var(--score-gray) 0deg)` } as CSSProperties}><span className="evidence-score"><strong>{hasAssessment && seoSuccessScore !== null ? Math.round(seoSuccessScore) : "—"}</strong><small>/100</small></span></i>
              <div><span>搜尋成長機會</span><strong>{hasAssessment && seoSuccessScore !== null ? `${Math.round(seoSuccessScore)} / 100` : "待評估"}</strong><small>{hasAssessment ? "含搜尋市場與商業價值潛力" : "尚未建立市場判斷"}</small></div>
              <b>查看市場明細 <em>→</em></b>
            </a>
            <a href="/execution" className="investment-evidence-card">
              <i className={`score-donut investment-evidence-ring ${hasAssessment && ringLoadProgress < 1 ? "is-loading" : ""}`} style={{ "--evidence-progress": `${hasAssessment ? Math.max(0, Math.min(100, readiness)) * 3.6 * ringLoadProgress : 0}deg`, background: `conic-gradient(color-mix(in srgb, var(--donut-color) 84%, transparent) ${hasAssessment ? Math.max(0, Math.min(100, readiness)) * 3.6 * ringLoadProgress : 0}deg, var(--score-gray) 0deg)` } as CSSProperties}><span className="evidence-score"><strong>{hasAssessment ? readiness : "—"}</strong><small>/100</small></span></i>
              <div><span>落地承接準備</span><strong>{hasAssessment ? `${readiness} / 100` : "待評估"}</strong><small>{hasAssessment ? scoreBand(readiness) : "尚未建立準備度"}</small></div>
              <b>查看落地明細 <em>→</em></b>
            </a>
            <a href="/outcome" className="investment-evidence-card">
              <i className={`score-donut investment-evidence-ring ${hasAssessment && ringLoadProgress < 1 ? "is-loading" : ""}`} style={{ "--evidence-progress": `${hasAssessment ? Math.max(0, Math.min(100, outcomeScorePercent)) * 3.6 * ringLoadProgress : 0}deg`, background: `conic-gradient(color-mix(in srgb, var(--donut-color) 84%, transparent) ${hasAssessment ? Math.max(0, Math.min(100, outcomeScorePercent)) * 3.6 * ringLoadProgress : 0}deg, var(--score-gray) 0deg)` } as CSSProperties}><span className="evidence-score evidence-outcome-value"><strong>{hasAssessment ? isB2C ? sixMonthMonthlyTraffic !== null ? sixMonthMonthlyTraffic.toLocaleString("zh-TW") : "—" : firstInquiryRange ? `${firstInquiryRange}月` : "—" : "—"}</strong></span></i>
              <div><span>成果情境</span><strong>{isB2C ? "B2C" : "B2B"}</strong><small>{isB2C ? sixMonthMonthlyTraffic !== null ? `半年後 ${sixMonthMonthlyTraffic.toLocaleString("zh-TW")} 人次／月` : "半年後月流量待設定" : firstInquiryRange ? `首筆詢問・${firstInquiryRange} 個月` : "首筆詢問時間待設定"}</small></div>
              <b>查看成果明細 <em>→</em></b>
            </a>
          </div>

          <div className="investment-lower-grid">
            <article className="investment-reminder">
              <div className="investment-section-heading compact"><div><p className="kicker">決策提醒</p><h2>支持投入／投入前需補強</h2></div></div>
              <div className="investment-reminder-columns">
                <div><strong>報告支持投入的摘錄</strong><ul>{reportSupportItems.map((item, index) => <li key={`support-${index}`}>{item}</li>)}</ul></div>
                <div><strong>報告指出的投入前缺口</strong><ul>{reportRiskItems.map((item, index) => <li key={`risk-${index}`}>{item}</li>)}</ul></div>
              </div>
            </article>
            <article className="investment-next-steps">
              <div className="investment-section-heading compact"><div><p className="kicker">建議下一步</p><h2>先完成三件事</h2></div></div>
              <ol>
                <li><span>1</span><div><strong>確認優先市場與關鍵字</strong><small>讓市場機會有清楚的進攻順序</small></div><a href="/market" aria-label="查看市場機會">→</a></li>
                <li><span>2</span><div><strong>補齊案例與信任證據</strong><small>降低客戶評估與詢問的疑慮</small></div><a href="/execution" aria-label="查看落地準備">→</a></li>
                <li><span>3</span><div><strong>設定階段性驗證指標</strong><small>依 B2B／B2C 情境追蹤成果</small></div><a href="/outcome" aria-label="查看成果預估">→</a></li>
              </ol>
            </article>
          </div>
          <p className="investment-mode-note">Kevin 審核模式可展開評分依據與權重；一般模式與品牌顧問模式僅顯示結論摘要。</p>
        </section>

        <section id="assessment-panel" className={`panel score-section ${section !== "market" && section !== "execution" ? "section-hidden" : ""}`}>
          <div className="section-title"><div><p className="kicker">{section === "market" ? "D02・外部機會與阻力" : "D03・內部落地準備"}</p><h2>{section === "market" ? "市場與商業價值評分" : activeMode.scoreTitle}</h2></div><span>點選指標查看證據與改善路徑</span></div>
          <div className="score-layout">
            <div className="metric-list">
              {displayedMetrics.map((metric) => (
                <button key={metric.id} type="button" className={`${activeMetric.id === metric.id && detailOpen ? "active" : ""} tone-${scoreTone(metric.score, metric.risk)}`} onClick={() => { setSelectedMetric(metric.id); setDetailOpen(true); }} aria-haspopup="dialog" aria-label={`${metric.label}：${metric.score} 分，${scoreBand(metric.score, metric.risk)}。點擊查看評分內容`}>
                  <i className={`score-donut ${hasAssessment && ringLoadProgress < 1 ? "is-loading" : ""}`} style={{ background: `conic-gradient(color-mix(in srgb, var(--donut-color) 84%, transparent) ${metric.score * 3.6 * ringLoadProgress}deg, var(--score-gray) 0deg)` }}><strong>{metric.score}</strong><small>/100</small></i>
                  <span className="metric-copy"><b>{metric.label}</b><small>{scoreBand(metric.score, metric.risk)}</small></span>
                  <span className="metric-open">查看內容 <b>→</b></span>
                </button>
              ))}
            </div>
          </div>
          <dialog
            ref={detailDialog}
            className={`score-dialog tone-${scoreTone(activeMetric.score, activeMetric.risk)}`}
            aria-labelledby="score-dialog-title"
            onCancel={() => setDetailOpen(false)}
            onClose={() => setDetailOpen(false)}
            onClick={(event) => { if (event.target === event.currentTarget) setDetailOpen(false); }}
          >
            <div className="score-dialog-card">
              <button className="dialog-close" type="button" onClick={() => setDetailOpen(false)} aria-label="關閉評分內容">×</button>
              <p className="dialog-eyebrow">評分內容</p>
              <div className="evidence-head"><span id="score-dialog-title">{activeMetric.label}</span><strong>{activeMetric.score}<small>/100</small></strong></div>
              <span className={`score-label tone-${scoreTone(activeMetric.score, activeMetric.risk)}`}>{scoreBand(activeMetric.score, activeMetric.risk)}</span>
              {activeMetric.id === "market" && viewMode === "review" && (
                <fieldset className="market-checklist">
                  <legend><span>搜尋市場判斷條件</span><strong>{marketCriteria.filter(item => item.checked).length}/{marketCriteria.length} 項・合計 {activeMetric.score} 分</strong></legend>
                  <p>勾選符合條件的項目，並設定每項分數；已勾選分數自動加總，最高 100 分。此區只有 Kevin 審核模式看得到。</p>
                  <div className="market-criteria-editor">
                    {marketCriteria.map((criterion) => (
                      <div key={criterion.id} className={`market-criterion-row ${criterion.checked ? "checked" : ""}`}>
                        <input
                          type="checkbox"
                          checked={criterion.checked}
                          aria-label={`是否符合：${criterion.label}`}
                          onChange={() => updateMarketCriterion(criterion.id, { checked: !criterion.checked })}
                        />
                        <div className="criterion-main"><input className="criterion-name" type="text" value={criterion.label} aria-label="判斷條件名稱" onChange={event => updateMarketCriterion(criterion.id, { label: event.target.value })} />{criterion.evidence && <p className="criterion-evidence"><b>報告依據</b>{criterion.evidence}</p>}</div>
                        <label className="criterion-score"><span>分數／20</span><input type="number" min="0" max="20" value={criterion.score} onChange={event => updateMarketCriterion(criterion.id, { score: Math.min(20, Math.max(0, Number(event.target.value))) })} /></label>
                        <button type="button" className="criterion-delete" onClick={() => removeMarketCriterion(criterion.id)} aria-label={`刪除 ${criterion.label}`}>刪除</button>
                      </div>
                    ))}
                  </div>
                  <button type="button" className="criterion-add" onClick={addMarketCriterion}>＋ 新增判斷條件</button>
                </fieldset>
              )}
              {activeMetric.id === "commercial" && viewMode === "review" && (
                <fieldset className="market-checklist">
                  <legend><span>{isB2C ? "B2C 商業價值判斷" : "B2B 商業價值判斷"}</span><strong>{commercialCriteria.filter(item => item.checked).length}/{commercialCriteria.length} 項・合計 {activeMetric.score} 分</strong></legend>
                  <p>依目前商業模式評估；每個項目最高 20 分，報告讀入後會依內容證據自動給分，Kevin 可再審核調整。</p>
                  <div className="market-criteria-editor">
                    {commercialCriteria.map(criterion => (
                      <div key={criterion.id} className={`market-criterion-row ${criterion.checked ? "checked" : ""}`}>
                        <input type="checkbox" checked={criterion.checked} aria-label={`是否符合：${criterion.label}`} onChange={() => updateCommercialCriterion(criterion.id, { checked: !criterion.checked })} />
                        <div className="criterion-main"><input className="criterion-name" type="text" value={criterion.label} aria-label="商業價值判斷條件名稱" onChange={event => updateCommercialCriterion(criterion.id, { label: event.target.value })} />{criterion.evidence && <p className="criterion-evidence"><b>報告依據</b>{criterion.evidence}</p>}</div>
                        <label className="criterion-score"><span>分數／20</span><input type="number" min="0" max="20" value={criterion.score} onChange={event => updateCommercialCriterion(criterion.id, { score: Math.min(20, Math.max(0, Number(event.target.value))) })} /></label>
                        <button type="button" className="criterion-delete" onClick={() => removeCommercialCriterion(criterion.id)} aria-label={`刪除 ${criterion.label}`}>刪除</button>
                      </div>
                    ))}
                  </div>
                  <button type="button" className="criterion-add" onClick={addCommercialCriterion}>＋ 新增商業價值條件</button>
                </fieldset>
              )}
              {readinessCriteria[activeMetric.id] && viewMode === "review" && (
                <fieldset className="market-checklist readiness-checklist">
                  <legend><span>{activeMetric.label}・評估項目</span><strong>{readinessCriteria[activeMetric.id].filter(item => item.checked).length}/{readinessCriteria[activeMetric.id].length} 項・自動 {readinessAutoScore(activeMetric.id)} 分</strong></legend>
                  <p>系統未來可依據評估報告或客戶官網自動勾選；目前已先建立建議項目。你可新增、刪除、修改分數，並以人工微調校正最終分數。</p>
                  <div className="criteria-source-legend"><span><b className="source-dot report" />評估報告</span><span><b className="source-dot website" />客戶官網</span><span><b className="source-dot pending" />待確認</span></div>
                  <div className="market-criteria-editor">
                    {readinessCriteria[activeMetric.id].map(criterion => (
                      <div key={criterion.id} className={`market-criterion-row ${criterion.checked ? "checked" : ""}`}>
                        <input type="checkbox" checked={criterion.checked} aria-label={`是否符合：${criterion.label}`} onChange={() => updateReadinessCriterion(activeMetric.id, criterion.id, { checked: !criterion.checked })} />
                        <div className="criterion-main"><input className="criterion-name" type="text" value={criterion.label} aria-label="評估項目名稱" onChange={event => updateReadinessCriterion(activeMetric.id, criterion.id, { label: event.target.value })} /><select value={criterion.source} aria-label="判斷來源" onChange={event => updateReadinessCriterion(activeMetric.id, criterion.id, { source: event.target.value as ReadinessCriterion["source"] })}><option>評估報告</option><option>客戶官網</option><option>待確認</option></select>{criterion.evidence && <p className="criterion-evidence"><b>報告依據</b>{criterion.evidence}</p>}</div>
                        <label className="criterion-score"><span>分數</span><input type="number" min="0" max="100" value={criterion.score} onChange={event => updateReadinessCriterion(activeMetric.id, criterion.id, { score: Math.min(100, Math.max(0, Number(event.target.value))) })} /></label>
                        <button type="button" className="criterion-delete" onClick={() => removeReadinessCriterion(activeMetric.id, criterion.id)} aria-label={`刪除 ${criterion.label}`}>刪除</button>
                      </div>
                    ))}
                  </div>
                  <button type="button" className="criterion-add" onClick={() => addReadinessCriterion(activeMetric.id)}>＋ 新增評估項目</button>
                  <div className="manual-adjustment"><span><b>自動計分</b><strong>{readinessAutoScore(activeMetric.id)}</strong></span><i>＋</i><label><b>Kevin 微調</b><input type="number" min="-15" max="15" value={readinessAdjustments[activeMetric.id] || 0} onChange={event => adjustReadinessScore(activeMetric.id, Math.min(15, Math.max(-15, Number(event.target.value))))} /></label><i>＝</i><span className="adjustment-result"><b>最終分數</b><strong>{activeMetric.score}</strong></span></div>
                </fieldset>
              )}
              <div className="score-evidence-sections"><div><h3>報告證據</h3><ul>{reportExcerptItems(activeMetric.evidence, "報告尚未提供獨立證據摘錄") .map((item, index) => <li key={`evidence-${index}`}>{item}</li>)}</ul></div><div><h3>目前缺口</h3><ul>{reportExcerptItems(activeMetric.gap, "報告尚未提供獨立缺口摘錄").map((item, index) => <li key={`gap-${index}`}>{item}</li>)}</ul></div><div><h3>建議行動</h3><ul>{reportExcerptItems(activeMetric.action, "報告尚未提供獨立行動摘錄").map((item, index) => <li key={`action-${index}`}>{item}</li>)}</ul></div></div>
              {viewMode === "review" && !readinessCriteria[activeMetric.id] && <label className="score-control"><span>Kevin 調整分數 <strong>{activeMetric.score}</strong></span><input type="range" min="0" max="100" value={activeMetric.score} onChange={(e) => changeScore(Number(e.target.value))} /></label>}
              <p className="dialog-hint">按 Esc、右上角 × 或視窗外即可關閉</p>
            </div>
          </dialog>
        </section>

        <section className={`split-grid ${section !== "outcome" || !pageHasEnabledFields("04") ? "section-hidden" : ""}`}>
          <section id="outcome-tracking" className="panel funnel-section">
            <div className="section-title"><div><p className="kicker">D04・商業成果情境</p><h2>{isB2C ? funnelData2C.title : "有效商機漏斗"}</h2></div><div className="year-toggle"><button className={year === 1 ? "active" : ""} onClick={() => setYear(1)} type="button">第一年</button><button className={year === 2 ? "active" : ""} onClick={() => setYear(2)} type="button">第二年</button><button className={year === 3 ? "active" : ""} onClick={() => setYear(3)} type="button">第三年</button></div></div>
            {isB2C ? <Funnel2C year={year} reviewMode={viewMode === "review"} settings={currentFunnel2CSettings} onChange={(next) => setFunnel2CYearSettings((years) => ({ ...years, [year]: next }))} /> : <>
            <div className="commercial-funnel" aria-label={`${year === 1 ? "第一" : year === 2 ? "第二" : "第三"}年有效商機行銷漏斗`}>
              <div className="funnel-stack">
                <div className="funnel-stage funnel-stage-one"><span><b>STAGE 01</b>頂層商機接觸</span><div className="funnel-stage-value">{viewMode === "review" ? <label className="funnel-edit"><input aria-label={`${year === 1 ? "第一" : year === 2 ? "第二" : "第三"}年有效商機接觸`} value={currentFunnel.leads} onChange={(event) => updateFunnel("leads", event.target.value)} /><small>組／年</small></label> : <strong>{currentFunnel.leads}<small>組／年</small></strong>}</div><small>從精準搜尋與內容入口進入</small></div>
                <div className="funnel-stage funnel-stage-two"><span><b>STAGE 02</b>深入洽談</span><div className="funnel-stage-value">{viewMode === "review" ? <label className="funnel-edit"><input aria-label={`${year === 1 ? "第一" : year === 2 ? "第二" : "第三"}年深入洽談`} value={currentFunnel.discussion} onChange={(event) => updateFunnel("discussion", event.target.value)} /></label> : <strong>{currentFunnel.discussion}</strong>}</div><small>具明確需求並進入評估與報價</small></div>
                <div className="funnel-stage funnel-stage-three"><span><b>STAGE 03</b>直接買家成交</span><div className="funnel-stage-value">{viewMode === "review" ? <label className="funnel-edit"><input aria-label={`${year === 1 ? "第一" : year === 2 ? "第二" : "第三"}年直接買家成交`} value={currentFunnel.close} onChange={(event) => updateFunnel("close", event.target.value)} /></label> : <strong>{currentFunnel.close}</strong>}</div><small>完成商務條件確認並正式簽約</small></div>
                <div className="funnel-drop" aria-hidden="true" />
              </div>
              <div className="funnel-results">
                <div>
                  <span>夥伴成果</span><small>長期放大商機來源</small>
                  <div className="funnel-result-field partner-category-field"><b>核心戰略夥伴類別</b>{viewMode === "review" ? <label className="funnel-edit"><textarea aria-label="核心戰略夥伴類別說明" value={partnerCategoryDescription} onChange={(event) => setPartnerCategoryDescription(event.target.value)} placeholder="例如：室內設計師、高端家具經銷商、建築師" rows={3} /></label> : <p>{partnerCategoryDescription || "尚未設定"}</p>}</div>
                  <div className="funnel-result-field"><b>核心戰略夥伴數增加</b>{viewMode === "review" ? <label className="funnel-edit"><input aria-label={`${year === 1 ? "第一" : year === 2 ? "第二" : "第三"}年核心戰略夥伴數增加`} value={currentFunnel.partners} onChange={(event) => updateFunnel("partners", event.target.value)} placeholder="例如：2～3 組" /></label> : <strong>{currentFunnel.partners}</strong>}</div>
                  <div className="funnel-result-field"><b>每一核心戰略夥伴預估價值</b>{viewMode === "review" ? <label className="funnel-edit"><input aria-label={`${year === 1 ? "第一" : year === 2 ? "第二" : "第三"}年每一核心戰略夥伴預估價值`} value={currentFunnel.partnerValue} onChange={(event) => updateFunnel("partnerValue", event.target.value)} placeholder="例如：NT$ 100～200 萬" /></label> : <strong>{currentFunnel.partnerValue}</strong>}</div>
                </div>
                <div className="product-price-result"><span>產品價值基準</span><small>作為商業成果估算依據</small><div className="funnel-result-field"><b>產品單價</b>{viewMode === "review" ? <label className="funnel-edit"><input aria-label={`${year === 1 ? "第一" : year === 2 ? "第二" : "第三"}年產品單價`} value={currentFunnel.productPrice} onChange={(event) => updateFunnel("productPrice", event.target.value)} placeholder="例如：NT$ 250 萬" /></label> : <strong>{currentFunnel.productPrice}</strong>}</div></div>
                <div className="revenue-result"><span>漏斗最終成果</span><small>整合夥伴價值與產品成交價值</small><b>預估增加營收金額</b><strong>{calculatedFunnelOutcome}</strong><em>（核心戰略夥伴數增加 × 每一核心戰略夥伴預估價值）＋（頂層商機平均值 × 深入洽談平均值 × 直接購買機率 × 產品單價），結果四捨五入</em></div>
              </div>
            </div>
            {viewMode === "review" && <p className="funnel-edit-hint">目前為 Kevin 審核模式，可輸入本年度漏斗、核心戰略夥伴數、每一夥伴預估價值與產品單價；漏斗最終成果會自動計算。</p>}
            <div className="growth-timelines">
              <div className="timeline-mode"><strong>首筆新增有效詢問預估：{firstInquiryRange ? `${firstInquiryRange} 個月` : "待設定"}</strong><span>{viewMode === "review" ? "Kevin 審核模式・可拖拉調整" : "訪客模式・僅供閱讀"}</span></div>
              <section className="phase-slider" aria-label="初步發酵期時間設定">
                <div className="phase-head"><div><b>1</b><span><strong>初步發酵期</strong><small>{isB2C ? "觀察收錄與搜尋曝光訊號；不等同有效詢問" : "與首頁的首筆新增有效詢問預估同步"}</small></span></div><em>{isB2C ? `${growthStages[fermentationStage]} 個月` : firstInquiryRange ? `${firstInquiryRange} 個月` : "待設定"}</em></div>
                <div className="phase-track"><div>
                  <input aria-label="初步發酵期" type="range" min="0" max="7" step="1" value={fermentationStage} disabled={viewMode !== "review" || !isB2C} onChange={(event) => setFermentationStage(Number(event.target.value))} style={{ "--timeline-progress": `${(fermentationStage / 7) * 100 * (hasAssessment ? ringLoadProgress : 1)}%` } as CSSProperties} />
                  <div className="phase-scale">{growthStages.map((stage, index) => <span key={stage} className={index === fermentationStage ? "active" : ""}><i />{stage}<small>月</small></span>)}</div>
                </div></div>
              </section>
              <section className="phase-slider" aria-label="穩定成長期時間設定">
                <div className="phase-head"><div><b>2</b><span><strong>穩定成長期</strong><small>詢客每月數量維持在一定區間</small></span></div><em>{growthStages[stableGrowthStage]} 個月</em></div>
                <div className="phase-track"><div>
                  <input aria-label="穩定成長期" type="range" min="0" max="7" step="1" value={stableGrowthStage} disabled={viewMode !== "review"} onChange={(event) => setStableGrowthStage(Number(event.target.value))} style={{ "--timeline-progress": `${(stableGrowthStage / 7) * 100 * (hasAssessment ? ringLoadProgress : 1)}%` } as CSSProperties} />
                  <div className="phase-scale">{growthStages.map((stage, index) => <span key={stage} className={index === stableGrowthStage ? "active" : ""}><i />{stage}<small>月</small></span>)}</div>
                </div></div>
              </section>
            </div>
            </>}
            <p className="fine-print">{clientName} 專案規劃情境，非成果保證；所有數值應依本專案證據與實際成果持續校準。</p>
          </section>

        </section>

        <section className={`blueprint-layout ${section !== "blueprint" ? "section-hidden" : ""}`}>
          <section className="panel pathway-section">
            <div className="section-title"><div><p className="kicker">P01・專案執行・內容路徑</p><h2>核心成長路徑</h2></div></div>
            <div className="pathway"><div><b>1</b><span>核心關鍵字</span></div><i>→</i><div><b>2</b><span>對應承接頁</span></div><i>→</i><div><b>3</b><span>SEO 支援文章</span></div><i>→</i><div><b>4</b><span>內鏈導回核心頁</span></div></div>
            <p className="fine-print">以主題群組支援真正能承接詢價或訂單的核心頁，避免建立彼此競爭的薄弱頁面。</p>
          </section>
          <section id="priority-blueprint" className="panel priority-section">
            <div className="section-title"><div><p className="kicker">P01・專案執行・優先順序</p><h2>P0～P2 執行藍圖</h2></div><span>先確認工作內容，再到進度追蹤更新狀態</span></div>
            <div className="priority-list blueprint-priority-list">
              {priorities.map((item) => <article key={item.id}><span className={`priority ${item.level.toLowerCase()}`}>{item.level}</span><div><strong>{item.title}</strong><p>{item.reason}</p></div><span className={`status ${item.status}`}>{item.status}</span></article>)}
            </div>
          </section>
        </section>

        <section id="progress-tracking" className={`panel priority-section ${section !== "progress" ? "section-hidden" : ""}`}>
          <div className="section-title"><div><p className="kicker">P02・專案執行・進度追蹤</p><h2>工作項目執行狀態</h2></div><div className="progress-label"><span>已完成 {completed}/{priorities.length}</span><strong>{progress}%</strong></div></div>
          <div className="overall-progress"><b style={{ width: `${progress}%` }} /></div>
          <div className="priority-list">
            {priorities.map((item) => <article key={item.id}><span className={`priority ${item.level.toLowerCase()}`}>{item.level}</span><div><strong>{item.title}</strong><p>{item.reason}</p></div><button type="button" className={`status ${item.status}`} onClick={() => cyclePriority(item.id)}>{item.status}</button></article>)}
          </div>
          <p className="interaction-hint">點擊狀態可依序切換「待處理 → 進行中 → 已完成」。</p>
        </section>

        <section className={`panel results-validation ${section !== "results" ? "section-hidden" : ""}`}>
          <div className="section-title"><div><p className="kicker">P03・專案執行・成果驗證</p><h2>實際成果與預估差異</h2></div><span>{viewMode === "review" ? "Kevin 審核模式可編輯" : "客戶瀏覽模式僅顯示已確認成果"}</span></div>
          <div className="result-tracking-grid">
            {([
              ["rankingKeywords", "關鍵字進榜數", "例如：15 組"],
              ["organicTraffic", "自然流量變化", "例如：較基準期增加 114%"],
              ["qualifiedConversions", isB2C ? "有效訂單" : "有效詢問", isB2C ? "例如：32 筆" : "例如：8 組"],
              ["actualRevenue", "實際增加營收", "例如：NT$ 1,500,000"],
              ["aiVisibility", "AI Search／品牌曝光", "例如：3 個核心主題獲得引用"],
            ] as const).map(([field, label, placeholder]) => <article key={field}><span>{label}</span>{viewMode === "review" ? <input aria-label={label} value={resultTracking[field]} onChange={(event) => setResultTracking((current) => ({ ...current, [field]: event.target.value }))} placeholder={placeholder} /> : <strong>{resultTracking[field] || "尚未填寫"}</strong>}</article>)}
          </div>
          <div className="result-notes-grid">
            <label><span>預估值與實際值差異</span>{viewMode === "review" ? <textarea value={resultTracking.forecastComparison} onChange={(event) => setResultTracking((current) => ({ ...current, forecastComparison: event.target.value }))} placeholder="說明實際成果高於或低於預估的原因" rows={4} /> : <p>{resultTracking.forecastComparison || "尚未填寫"}</p>}</label>
            <label><span>下一階段調整建議</span>{viewMode === "review" ? <textarea value={resultTracking.nextAction} onChange={(event) => setResultTracking((current) => ({ ...current, nextAction: event.target.value }))} placeholder="填寫下一階段應維持、加碼或修正的項目" rows={4} /> : <p>{resultTracking.nextAction || "尚未填寫"}</p>}</label>
          </div>
          {viewMode === "review" && <p className="interaction-hint">修改後請點選右上角「儲存變更」，成果會保存於目前專案。</p>}
        </section>
      </div>
    </main>
  );
}

export default function Home() {
  return <Dashboard section="home" />;
}

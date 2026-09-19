"use client";

import { useEffect, useState } from "react";
import Sidebar from "../sidebar";
import { buildAssessmentFromReport } from "../../lib/report-assessment";

type Field = { name: string; key: string; type: string };
type DashboardPage = "01" | "02" | "03" | "04";
type FieldManagement = Record<string, { enabled: boolean; pages: DashboardPage[] }>;
type MarketCriterion = { id: string; label: string; score: number; checked: boolean; evidence?: string };
type CommercialCriterion = MarketCriterion;
type Group = { title: string; note: string; fields: Field[] };
type SiteMode = "A" | "B" | "C";
type FirstInquiryRange = "1～3" | "3～6" | "6～9" | "9～12" | "12～15";
type OutcomeScoringSettings = { tob: Record<FirstInquiryRange, number>; toc: Array<{ minTraffic: number; score: number }> };
const defaultOutcomeScoring: OutcomeScoringSettings = {
  tob: { "1～3": 10, "3～6": 6, "6～9": 2, "9～12": 0, "12～15": 0 },
  toc: [{ minTraffic: 5000, score: 10 }, { minTraffic: 4000, score: 8 }, { minTraffic: 3000, score: 6 }, { minTraffic: 2000, score: 4 }, { minTraffic: 1000, score: 2 }],
};
const commercialCriteriaByBusinessType: Record<string, CommercialCriterion[]> = {
  B2B: [
    { id: "contract-value", label: "單一專案／合約具有足夠經濟價值", score: 20, checked: false },
    { id: "profit-potential", label: "具備合理毛利與實際獲利潛力", score: 20, checked: false },
    { id: "sales-feasibility", label: "具備明確成交條件與銷售承接流程", score: 20, checked: false },
    { id: "repeat-expansion", label: "具有續約、追加採購或長期合作價值", score: 20, checked: false },
    { id: "strategic-scale", label: "符合公司策略且具夥伴／市場擴張潛力", score: 20, checked: false },
  ],
  B2C: [
    { id: "average-order-value", label: "平均客單價足以形成商業價值", score: 20, checked: false },
    { id: "profit-potential", label: "具備合理毛利率與實際獲利潛力", score: 20, checked: false },
    { id: "purchase-conversion", label: "產品與購買流程具備轉換條件", score: 20, checked: false },
    { id: "repeat-purchase", label: "具有回購、會員或顧客終身價值", score: 20, checked: false },
    { id: "brand-scale", label: "具備品牌擴張與產品延伸潛力", score: 20, checked: false },
  ],
  其他: [
    { id: "economic-value", label: "產品／服務具有明確經濟價值", score: 20, checked: false },
    { id: "profit-potential", label: "具備合理毛利與實際獲利潛力", score: 20, checked: false },
    { id: "sales-feasibility", label: "具備明確成交條件與轉換流程", score: 20, checked: false },
    { id: "repeat-expansion", label: "具有回購、續約或延伸價值", score: 20, checked: false },
    { id: "strategic-scale", label: "符合公司策略且具市場發展潛力", score: 20, checked: false },
  ],
};
function commercialCriteriaMatchesBusinessType(criteria: CommercialCriterion[], type: string) {
  const expected = new Set((commercialCriteriaByBusinessType[type] || commercialCriteriaByBusinessType.B2B).map(item => item.id));
  const actual = new Set(criteria.map(item => item.id));
  return expected.size === actual.size && [...expected].every(id => actual.has(id));
}
const siteModes: Record<SiteMode, { title: string; note: string }> = {
  A: { title: "現有網站優化", note: "保留網站，補內容、承接頁與內部連結" },
  B: { title: "全新網站建置（全新網域）", note: "從零建立網域、架構、內容與搜尋資產" },
  C: { title: "全新網站建置（舊網域）", note: "重建網站並保留舊網域的搜尋資產" },
};

const defaultGroups: Group[] = [
  { title: "案件與評估來源", note: "辨識案件、資料版本與評估依據。", fields: [
    { name: "客戶／品牌名稱", key: "client_name", type: "文字｜Mobellio" },
    { name: "案件代號", key: "case_id", type: "文字｜MOBELLIO-2026-01" },
    { name: "評估日期", key: "assessment_date", type: "日期｜2026-08-08" },
    { name: "評估報告名稱", key: "source_report_name", type: "文字｜SEO＋AI Search 初步評估報告" },
    { name: "報告版本", key: "source_report_version", type: "文字｜v1.2" },
    { name: "資料來源與連結", key: "source_references", type: "清單／網址｜GA4、GSC、Ubersuggest、訪談" },
    { name: "資料完整度狀態", key: "data_completeness_status", type: "單選｜完整／部分完整／待補" },
    { name: "待補資料", key: "missing_data_items", type: "清單｜GA4、歷史詢價、平均客單價" },
    { name: "評估網站類型", key: "site_mode", type: "單選｜A 現有網站／B 新網域／C 舊網域重建" },
    { name: "主要市場與語言", key: "target_markets", type: "多選／清單｜美國英文、德國德文" },
  ]},
  { title: "總體投資判斷", note: "呈現老闆最先需要理解的投入結論。", fields: [
    { name: "初步投資判斷", key: "investment_verdict", type: "單選｜建議投入／有條件投入／暫不建議" },
    { name: "判斷主標題", key: "verdict_headline", type: "長文字｜值得投入 SEO，但應先補齊承接路徑" },
    { name: "判斷說明", key: "verdict_summary", type: "長文字｜商業理由、限制與前提" },
    { name: "成果觀察期", key: "expected_observation_period", type: "文字／區間｜6～12 個月" },
    { name: "目前準備度", key: "readiness_score", type: "數字｜61（0～100）" },
    { name: "核心策略", key: "primary_strategy", type: "文字｜內容承接" },
    { name: "策略摘要", key: "primary_strategy_note", type: "文字｜核心頁＋文章＋內鏈" },
    { name: "投資前提", key: "investment_conditions", type: "清單｜完成追蹤、補海外流程、提供案例" },
    { name: "主要風險", key: "investment_risks", type: "清單｜素材不足、決策週期長" },
  ]},
  { title: "市場與商業價值", note: "記錄市場證據、商業意圖與成交價值。", fields: [
    { name: "搜尋市場機會分數", key: "market_opportunity_score", type: "數字｜75（0～100）" },
    { name: "商業價值潛力分數", key: "commercial_value_score", type: "數字｜90（0～100）" },
    { name: "市場評估證據", key: "market_evidence", type: "長文字｜市場、關鍵字與需求證據" },
    { name: "市場資料缺口", key: "market_gap", type: "長文字｜待補市場或成交資料" },
    { name: "市場建議行動", key: "market_action", type: "長文字｜優先市場與驗證方式" },
    { name: "核心產品／服務", key: "priority_offers", type: "清單｜901 Carfa、客製專案" },
    { name: "高價值客群", key: "priority_audiences", type: "清單｜收藏家、設計師、經銷商" },
    { name: "關鍵字主題群", key: "keyword_clusters", type: "清單｜跑車沙發、汽車家具、商空家具" },
    { name: "主要搜尋意圖", key: "search_intents", type: "多選｜商業研究型／比較型／交易型" },
    { name: "平均客單價／訂單價值", key: "average_order_value", type: "幣別數字或區間｜USD 27,000+" },
    { name: "搜尋市場條件勾選", key: "market_criteria_checks", type: "布林值清單｜true／false" },
  ]},
  { title: "內部落地準備度", note: "各能力項目可隨網站類型與客戶現況調整。", fields: [
    { name: "評估指標名稱", key: "metric_label", type: "文字｜網站與內容承接" },
    { name: "評估指標鍵值", key: "metric_id", type: "文字｜content_readiness" },
    { name: "指標分數", key: "metric_score", type: "數字｜63（0～100）" },
    { name: "已有證據", key: "metric_evidence", type: "長文字｜現有頁面、素材與追蹤證據" },
    { name: "目前缺口", key: "metric_gap", type: "長文字｜缺客群入口與案例" },
    { name: "建議行動", key: "metric_action", type: "長文字｜補核心頁、文章與內鏈" },
    { name: "是否為風險指標", key: "metric_is_risk", type: "布林值｜true／false" },
    { name: "內容素材準備度", key: "materials_readiness_score", type: "數字｜62（0～100）" },
    { name: "E-E-A-T／品牌信任分數", key: "eeat_score", type: "數字｜70（0～100）" },
    { name: "AI Search 準備度", key: "ai_search_readiness_score", type: "數字｜55（0～100）" },
    { name: "詢價轉換準備度", key: "conversion_readiness_score", type: "數字｜60（0～100）" },
    { name: "技術與追蹤準備度", key: "technical_tracking_score", type: "數字｜58（0～100）" },
    { name: "網站架構／移轉準備度", key: "architecture_migration_score", type: "數字｜52（0～100）" },
  ]},
  { title: "商業成果情境與時間預期", note: "包含合作前推估與合作後成果驗證；推估不應當作成果保證。", fields: [
    { name: "情境名稱", key: "scenario_name", type: "文字｜網站＋內容＋海外曝光" },
    { name: "情境成功分數", key: "scenario_score", type: "數字｜78（0～100）" },
    { name: "情境說明", key: "scenario_note", type: "長文字｜強化搜尋、品牌與第三方訊號" },
    { name: "選定情境", key: "selected_scenario_id", type: "單選｜site／content／full" },
    { name: "成果年度", key: "projection_year", type: "整數｜1／2／3" },
    { name: "預估有效商機", key: "projected_leads", type: "文字區間｜3～8" },
    { name: "深入洽談率", key: "projected_discussion_rate", type: "百分比區間｜20%～40%" },
    { name: "成交率", key: "projected_close_rate", type: "百分比區間｜5%～15%" },
    { name: "合作夥伴成果", key: "projected_partners", type: "文字／數字｜待評估" },
    { name: "營收成果", key: "projected_revenue", type: "幣別區間／待評估" },
    { name: "首筆新增有效詢問預估區間", key: "first_inquiry_range", type: "單選｜1～3／3～6／6～9／9～12／12～15 個月" },
    { name: "半年後預估自然搜尋月流量", key: "six_month_monthly_organic_traffic", type: "B2C 整數｜人次／月" },
    { name: "發酵期階段", key: "fermentation_stage", type: "整數｜1（對應 0～3 個月）" },
    { name: "穩定成長期階段", key: "stable_growth_stage", type: "整數｜3（對應 6～9 個月）" },
    { name: "B2C 預估進站自然月流量", key: "b2c_monthly_organic_traffic", type: "各年度數值｜3,333.33 人次／月" },
    { name: "B2C 年度自然流量基準", key: "b2c_annual_organic_traffic", type: "自動計算｜月流量 × 12，約 40,000 人次／年" },
    { name: "B2C 加入購物車率", key: "b2c_atc_rate", type: "百分比｜12%" },
    { name: "B2C 全站購買轉換率", key: "b2c_conversion_rate", type: "百分比｜2.5%" },
    { name: "B2C 平均客單價", key: "b2c_average_order_value", type: "幣別數字｜NT$ 1,500" },
    { name: "B2C 舊客回購率", key: "b2c_repeat_purchase_rate", type: "百分比｜20%" },
    { name: "B2C 等值廣告節省金額", key: "b2c_annual_ad_savings", type: "幣別數字｜NT$ 250,000／年" },
    { name: "B2C 目前成長階段", key: "b2c_timeline_stage", type: "整數｜1（對應 3～6 個月）" },
    { name: "推估依據與限制", key: "projection_assumptions", type: "長文字｜受預算、素材與市場影響" },
    { name: "實際關鍵字進榜數", key: "actual_ranking_keywords", type: "文字／數字｜15 組" },
    { name: "實際自然流量變化", key: "actual_organic_traffic_change", type: "文字／百分比｜較基準期增加 114%" },
    { name: "實際有效詢問／訂單", key: "actual_qualified_conversions", type: "文字／數字｜8 組詢問／32 筆訂單" },
    { name: "實際增加營收", key: "actual_revenue", type: "幣別數字／文字｜NT$ 1,500,000" },
    { name: "AI Search／品牌曝光成果", key: "actual_ai_visibility", type: "文字｜3 個核心主題獲得引用" },
    { name: "預估值與實際值差異", key: "forecast_actual_variance", type: "長文字｜說明高於或低於預估的原因" },
    { name: "下一階段調整建議", key: "next_stage_action", type: "長文字｜維持、加碼或修正項目" },
  ]},
  { title: "內容與內鏈執行路徑", note: "把搜尋需求連接到承接頁、證據與轉換。", fields: [
    { name: "路徑名稱", key: "pathway_name", type: "文字｜海外收藏家詢價路徑" },
    { name: "目標客群", key: "pathway_audience", type: "文字｜海外汽車收藏家" },
    { name: "搜尋／內容主題", key: "content_topic", type: "文字｜跑車沙發選購與規格" },
    { name: "內容類型", key: "content_type", type: "單選｜核心頁／文章／案例／FAQ／比較頁" },
    { name: "內容標題", key: "content_title", type: "文字｜Car-inspired sofa buying guide" },
    { name: "目標關鍵字", key: "target_keywords", type: "清單｜car sofa、automotive furniture" },
    { name: "搜尋意圖", key: "content_search_intent", type: "單選｜資訊型／商業研究型／交易型" },
    { name: "承接頁面", key: "destination_page", type: "網址／頁面 ID｜/products/901-carfa" },
    { name: "內部連結來源", key: "internal_link_sources", type: "URL 清單｜文章、分類頁、案例頁" },
    { name: "CTA／轉換目標", key: "conversion_goal", type: "文字｜索取報價／預約諮詢／下載型錄" },
    { name: "負責人", key: "content_owner", type: "文字｜Kevin／客戶窗口／寫手" },
    { name: "預計上線日", key: "planned_publish_date", type: "日期｜2026-10-15" },
    { name: "實際上線日", key: "actual_publish_date", type: "日期／空值" },
    { name: "內容狀態", key: "content_status", type: "單選｜待規劃／製作中／待審／已上線／待優化" },
  ]},
  { title: "優先改善項目與執行進度", note: "可依專案推進持續更新。", fields: [
    { name: "改善項目 ID", key: "priority_id", type: "整數／文字｜1" },
    { name: "優先級", key: "priority_level", type: "單選｜P0／P1／P2" },
    { name: "改善項目名稱", key: "priority_title", type: "文字｜確認表單收件與 GA4 事件" },
    { name: "執行原因／商業影響", key: "priority_reason", type: "長文字｜說明不執行的影響" },
    { name: "執行狀態", key: "priority_status", type: "單選｜待處理／進行中／已完成" },
    { name: "負責人", key: "priority_owner", type: "文字｜Kevin／客戶／網站商" },
    { name: "預計完成日", key: "priority_due_date", type: "日期｜2026-09-30" },
    { name: "實際完成日", key: "priority_completed_date", type: "日期／空值" },
    { name: "進度百分比", key: "priority_progress", type: "百分比｜50%" },
    { name: "執行備註", key: "priority_notes", type: "長文字｜等待客戶提供後台權限" },
    { name: "成果證據／連結", key: "completion_evidence", type: "網址／附件清單｜GSC、頁面 URL、截圖" },
  ]},
  { title: "自動計算欄位", note: "由其他欄位計算產生，不建議人工輸入覆蓋。", fields: [
    { name: "SEO 成功機率指標", key: "seo_success_score", type: "公式｜（搜尋市場分數＋商業價值分數）÷ 2" },
    { name: "整體準備度", key: "overall_readiness_score", type: "公式｜指定內部落地指標平均值" },
    { name: "改善項目完成數", key: "completed_priority_count", type: "公式｜status＝已完成的項目數" },
    { name: "改善總項目數", key: "total_priority_count", type: "公式｜改善項目總筆數" },
    { name: "整體執行進度", key: "overall_progress_percent", type: "公式｜已完成 ÷ 總項目 × 100%" },
    { name: "B2C 意向商品加車人次", key: "b2c_cart_users", type: "公式｜年度自然流量 × 加入購物車率" },
    { name: "B2C 預估有效訂單", key: "b2c_orders", type: "公式｜年度自然流量 × 全站購買轉換率" },
    { name: "B2C 預估增加營業額", key: "b2c_revenue", type: "公式｜預估有效訂單 × 平均客單價" },
    { name: "分數評語", key: "score_band", type: "公式／文字｜強項／機會明確／待補強／優先改善" },
    { name: "分數色階", key: "score_tone", type: "公式／枚舉｜淺橘／橘／深橘" },
    { name: "最近更新時間", key: "updated_at", type: "系統日期時間｜2026-08-17 15:30" },
  ]},
];

const pageFieldKeywords: Record<DashboardPage, RegExp> = {
  "01": /investment|verdict|readiness_score|primary_strategy|primary_strategy_note|investment_conditions|investment_risks|expected_observation_period/,
  "02": /market|priority_offers|priority_audiences|keyword_clusters|search_intents|average_order_value/,
  "03": /metric|materials|eeat|ai_search|conversion|technical|architecture|legacy|migration/,
  "04": /scenario|projected|b2c_|first_inquiry|actual_|forecast|next_stage|fermentation|stable_growth/,
};

function defaultFieldManagement(): FieldManagement {
  return Object.fromEntries(defaultGroups.flatMap(group => group.fields.map(field => [field.key, {
    enabled: true,
    pages: (Object.keys(pageFieldKeywords) as DashboardPage[]).filter(page => pageFieldKeywords[page].test(field.key)),
  }])));
}

const fixedItems = [
  "網站固定標題：Kevin SEO Decision Dashboard",
  "副標題：SEO＋AI Search 投資決策儀表板",
  "01 總體投資判斷（SEO 是否值得投入）",
  "02 外部市場與競爭（搜尋市場機會與產業競爭）",
  "03 內部落地準備（網站、內容與執行條件）",
  "04 商業成果預估（B2B／B2C 漏斗與成果時間）",
  "四大決策 Icon 導航與返回決策首頁入口",
  "專案執行的執行藍圖、進度追蹤與成果驗證頁面",
  "A／B／C 三種網站評估類型的名稱與定義",
  "頁面版面結構、評分區間規則與品牌視覺樣式",
];

export default function DataFieldsPage() {
  const [groups, setGroups] = useState<Group[]>(defaultGroups);
  const [editing, setEditing] = useState(false);
  const [saveStatus, setSaveStatus] = useState<"idle" | "saved">("idle");
  const [reportName, setReportName] = useState("Mobellio SEO＋AI Search 初步評估報告");
  const [assessmentDate, setAssessmentDate] = useState("2026-08-08");
  const [siteMode, setSiteMode] = useState<SiteMode>("A");
  const [activeProjectId, setActiveProjectId] = useState("");
  const [clientName, setClientName] = useState("Mobellio");
  const [projectName, setProjectName] = useState("Mobellio SEO 投資評估");
  const [websiteUrl, setWebsiteUrl] = useState("https://www.mobellio.com/zh-tw/home");
  const [businessType, setBusinessType] = useState("B2B");
  const [outcomeScoring, setOutcomeScoring] = useState<OutcomeScoringSettings>(defaultOutcomeScoring);
  const [savedDashboardData, setSavedDashboardData] = useState<Record<string, unknown>>({});
  const [settingsStatus, setSettingsStatus] = useState<"idle" | "saved">("idle");
  const [analysisStatus, setAnalysisStatus] = useState<"idle" | "reading" | "ready" | "error">("idle");
  const [analysisMessage, setAnalysisMessage] = useState("");
  const [pendingDashboardData, setPendingDashboardData] = useState<Record<string, unknown> | null>(null);
  const [savedFirstInquiryRange, setSavedFirstInquiryRange] = useState("");
  const [savedSixMonthMonthlyTraffic, setSavedSixMonthMonthlyTraffic] = useState<number | null>(null);
  const [marketCriteria, setMarketCriteria] = useState<MarketCriterion[]>([]);
  const [commercialCriteria, setCommercialCriteria] = useState<CommercialCriterion[]>([]);
  const [fieldManagement, setFieldManagement] = useState<FieldManagement>(() => defaultFieldManagement());
  const total = groups.reduce((sum, group) => sum + group.fields.length, 0);

  useEffect(() => {
    fetch("/api/auth/me").then(response => response.ok ? response.json() : null).then(data => { if (data?.access?.kind !== "owner") window.location.href = "/login"; }).catch(() => { window.location.href = "/login"; });
    async function loadCurrentProject() {
      try {
        const listResponse = await fetch("/api/projects");
        const listData = await listResponse.json();
        if (!listResponse.ok || !listData.projects?.length) throw new Error("專案載入失敗");
        const savedId = window.localStorage.getItem("kevin-active-project-id");
        const id = listData.projects.some((project: { id: string }) => project.id === savedId) ? savedId : listData.projects[0].id;
        window.localStorage.setItem("kevin-active-project-id", id);
        setActiveProjectId(id);
        const response = await fetch(`/api/projects/${id}`);
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || "專案載入失敗");
        const project = data.project;
        setClientName(project.clientName);
        setProjectName(project.name);
        setWebsiteUrl(project.websiteUrl);
        setBusinessType(project.businessType);
        setReportName(project.reportName || "");
        setAssessmentDate(project.assessmentDate || new Date().toLocaleDateString("en-CA"));
        if (["A", "B", "C"].includes(project.siteMode)) setSiteMode(project.siteMode);
        const dashboardData = JSON.parse(project.dashboardData || "{}");
        setSavedDashboardData(dashboardData);
        if (dashboardData.fieldManagement && typeof dashboardData.fieldManagement === "object") {
          setFieldManagement({ ...defaultFieldManagement(), ...(dashboardData.fieldManagement as FieldManagement) });
        }
        if (Array.isArray(dashboardData.marketCriteria)) setMarketCriteria(dashboardData.marketCriteria as MarketCriterion[]);
        if (Array.isArray(dashboardData.commercialCriteria)) {
          const savedCommercialCriteria = dashboardData.commercialCriteria as CommercialCriterion[];
          setCommercialCriteria(commercialCriteriaMatchesBusinessType(savedCommercialCriteria, project.businessType) ? savedCommercialCriteria : (commercialCriteriaByBusinessType[project.businessType] || commercialCriteriaByBusinessType.B2B));
        } else {
          setCommercialCriteria(commercialCriteriaByBusinessType[project.businessType] || commercialCriteriaByBusinessType.B2B);
        }
        if (dashboardData.outcomeScoring) {
          setOutcomeScoring({ ...defaultOutcomeScoring, ...dashboardData.outcomeScoring, tob: { ...defaultOutcomeScoring.tob, ...dashboardData.outcomeScoring.tob }, toc: defaultOutcomeScoring.toc.map((item, index) => ({ ...item, ...(dashboardData.outcomeScoring.toc?.[index] || {}) })) });
        }
        setSavedFirstInquiryRange(typeof dashboardData.firstInquiryRange === "string" ? dashboardData.firstInquiryRange : "");
        const savedTraffic = dashboardData.sixMonthMonthlyTraffic;
        setSavedSixMonthMonthlyTraffic(typeof savedTraffic === "number" && Number.isFinite(savedTraffic) && savedTraffic >= 0 ? Math.round(savedTraffic) : null);
      } catch { setSettingsStatus("idle"); }
    }
    try {
      const saved = window.localStorage.getItem("kevin-seo-field-names-v1");
      if (saved) {
        const names = JSON.parse(saved) as Record<string, string>;
        setGroups(defaultGroups.map(group => ({ ...group, fields: group.fields.map(field => ({ ...field, name: names[field.key] || field.name })) })));
      }
    } catch { /* 保留預設名稱 */ }
    loadCurrentProject();
  }, []);

  function changeFieldName(key: string, name: string) {
    setGroups(items => items.map(group => ({ ...group, fields: group.fields.map(field => field.key === key ? { ...field, name } : field) })));
    setSaveStatus("idle");
  }

  function saveNames() {
    const names = Object.fromEntries(groups.flatMap(group => group.fields.map(field => [field.key, field.name.trim() || defaultGroups.flatMap(item => item.fields).find(item => item.key === field.key)?.name || field.name])));
    window.localStorage.setItem("kevin-seo-field-names-v1", JSON.stringify(names));
    setGroups(items => items.map(group => ({ ...group, fields: group.fields.map(field => ({ ...field, name: names[field.key] })) })));
    setEditing(false);
    setSaveStatus("saved");
    window.setTimeout(() => setSaveStatus("idle"), 2200);
  }

  function resetNames() {
    if (!window.confirm("確定要將所有中文欄位名稱還原為預設值嗎？")) return;
    window.localStorage.removeItem("kevin-seo-field-names-v1");
    setGroups(defaultGroups);
    setSaveStatus("idle");
  }

  function toggleFieldPage(key: string, page: DashboardPage) {
    setFieldManagement(current => ({
      ...current,
      [key]: {
        ...(current[key] || { enabled: true, pages: [] }),
        pages: (current[key]?.pages || []).includes(page)
          ? (current[key]?.pages || []).filter(item => item !== page)
          : [...(current[key]?.pages || []), page],
      },
    }));
    setSettingsStatus("idle");
  }

  function toggleFieldEnabled(key: string) {
    setFieldManagement(current => ({ ...current, [key]: { ...(current[key] || { pages: [] }), enabled: !(current[key]?.enabled ?? true) } }));
    setSettingsStatus("idle");
  }

  async function extractReportText(file: File) {
    const extension = file.name.split(".").pop()?.toLowerCase();
    if (extension === "txt" || extension === "md") return file.text();
    if (extension === "docx") {
      const mammoth = await import("mammoth");
      const result = await mammoth.extractRawText({ arrayBuffer: await file.arrayBuffer() });
      return result.value;
    }
    if (extension === "pdf") {
      const pdfjs = await import("pdfjs-dist/legacy/build/pdf.mjs");
      pdfjs.GlobalWorkerOptions.workerSrc = new URL("pdfjs-dist/legacy/build/pdf.worker.min.mjs", import.meta.url).toString();
      const document = await pdfjs.getDocument({ data: new Uint8Array(await file.arrayBuffer()) }).promise;
      const pages: string[] = [];
      for (let pageNumber = 1; pageNumber <= document.numPages; pageNumber += 1) {
        const page = await document.getPage(pageNumber);
        const content = await page.getTextContent();
        pages.push(content.items.map(item => "str" in item ? item.str : "").join(" "));
      }
      return pages.join("\n");
    }
    throw new Error("目前支援 PDF、DOCX、TXT 與 MD 格式");
  }

  async function selectReport(file?: File) {
    if (!file) return;
    const nextReportName = file.name.replace(/\.[^.]+$/, "");
    const nextAssessmentDate = new Date().toLocaleDateString("en-CA");
    setReportName(nextReportName);
    setAssessmentDate(nextAssessmentDate);
    setAnalysisStatus("reading");
    setAnalysisMessage("正在讀取報告內容並套用評估項目……");
    setSettingsStatus("idle");
    try {
      const text = await extractReportText(file);
      if (text.trim().length < 80) throw new Error("報告中可辨識的文字太少，請改用可選取文字的 PDF 或 DOCX 檔案");
      const configuredCriteria = marketCriteria.some(item => ["audience-fit", "demand-evidence", "intent", "competition", "growth"].includes(item.id)) ? marketCriteria : undefined;
      const configuredCommercial = commercialCriteria.length && commercialCriteriaMatchesBusinessType(commercialCriteria, businessType) ? commercialCriteria : undefined;
      const dashboardData = { ...buildAssessmentFromReport(text, siteMode, configuredCriteria, businessType as "B2B" | "B2C" | "其他", configuredCommercial), reportText: text, reportTextSavedAt: new Date().toISOString() };
      setPendingDashboardData(dashboardData);
      setAnalysisStatus("ready");
      setAnalysisMessage("報告已完成初評；儲存設定後，01、02、03 將顯示自動勾選與基礎分數。");
    } catch (error) {
      setPendingDashboardData(null);
      setAnalysisStatus("error");
      setAnalysisMessage(error instanceof Error ? error.message : "報告讀取失敗，請確認檔案格式後重試");
    }
  }

  function recalculateSavedReport() {
    const reportText = typeof pendingDashboardData?.reportText === "string"
      ? pendingDashboardData.reportText
      : typeof savedDashboardData.reportText === "string"
        ? savedDashboardData.reportText
        : "";
    if (!reportText.trim()) {
      setAnalysisStatus("error");
      setAnalysisMessage("目前案件只保存了報告名稱，尚未保存報告原文；請先重新上傳一次報告，之後即可直接按此按鈕重新計分。");
      return;
    }
    setAnalysisStatus("reading");
    setAnalysisMessage("正在依目前的市場、商業模式與評估條件重新計分……");
    const configuredCriteria = marketCriteria.some(item => ["audience-fit", "demand-evidence", "intent", "competition", "growth"].includes(item.id)) ? marketCriteria : undefined;
    const configuredCommercial = commercialCriteria.length && commercialCriteriaMatchesBusinessType(commercialCriteria, businessType) ? commercialCriteria : undefined;
    const dashboardData = {
      ...buildAssessmentFromReport(reportText, siteMode, configuredCriteria, businessType as "B2B" | "B2C" | "其他", configuredCommercial),
      reportText,
      reportTextSavedAt: typeof savedDashboardData.reportTextSavedAt === "string" ? savedDashboardData.reportTextSavedAt : new Date().toISOString(),
      recalculatedAt: new Date().toISOString(),
    };
    setPendingDashboardData(dashboardData);
    setAnalysisStatus("ready");
    setAnalysisMessage("已依目前評估標準重新計分；請按「儲存設定並套用初評」正式更新案件。");
  }

  async function saveCaseSettings() {
    if (!activeProjectId) return;
    const dashboardData = { ...savedDashboardData, ...(pendingDashboardData || {}), outcomeScoring, firstInquiryRange: savedFirstInquiryRange, sixMonthMonthlyTraffic: savedSixMonthMonthlyTraffic, fieldManagement };
    const response = await fetch(`/api/projects/${activeProjectId}`, { method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify({ clientName, name: projectName, websiteUrl, businessType, reportName, assessmentDate, siteMode, dashboardData: { ...dashboardData, commercialCriteria } }) });
    if (!response.ok) return;
    setSavedDashboardData(dashboardData);
    setSettingsStatus("saved");
    if (pendingDashboardData) {
      setAnalysisMessage("初評分數已儲存，可前往 01、02、03 查看並使用 Kevin 審核模式調整。");
      setPendingDashboardData(null);
    }
    window.setTimeout(() => setSettingsStatus("idle"), 2200);
  }

  return <main className="app-shell">
    <header className="topbar">
      <a className="brand brand-link" href="/"><span className="brand-mark">K</span><span><strong>Kevin SEO Decision Dashboard</strong><small>SEO＋AI Search 投資決策儀表板</small></span></a>
      <div className="topbar-actions">
        {editing && <button className="save-button" type="button" onClick={saveNames}>儲存中文名稱</button>}
        <button className={`mode-button ${editing ? "active" : ""}`} type="button" onClick={() => setEditing(value => !value)}>{editing ? "取消編輯" : "編輯中文名稱"}</button>
      </div>
    </header>
    <Sidebar active="data-fields" reviewMode />
    {(settingsStatus === "saved" || saveStatus === "saved") && <div className="save-toast saved" role="status"><b>✓</b><span><strong>{settingsStatus === "saved" ? "案件設定已儲存" : "中文名稱已儲存"}</strong><small>{settingsStatus === "saved" ? "01、02、03 會同步顯示最新設定。" : "欄位鍵名維持不變。"}</small></span></div>}
    <div className="workspace field-catalog sidebar-workspace">
      <section className="field-hero">
        <a className="field-back" href="/">← 返回決策首頁</a><p className="kicker">M02・DATA SETTINGS</p><h1>資料設定</h1>
        <p>這裡管理評估資料的名稱、啟用狀態與套用位置。下方「決策頁面 01～04」代表資料要顯示在哪一個決策頁，不是本頁的欄位群組編號。</p>
        <div className="field-summary"><span><strong>8</strong> 個欄位群組</span><span><strong>{total}</strong> 個可管理欄位</span><span><strong>{fixedItems.length}</strong> 個固定項目</span></div>
      </section>
      <section className="case-settings panel" aria-labelledby="case-settings-title">
        <div className="settings-head"><div><p className="kicker">CASE SETTINGS</p><h2 id="case-settings-title">{clientName}・案件與評估設定</h2><p>此頁資料只會更新目前專案，不會覆蓋其他客戶。</p></div><span>{settingsStatus === "saved" ? "✓ 設定已儲存" : "獨立專案"}</span></div>
        <div className="project-form-grid compact-project-fields"><label><span>客戶／品牌名稱</span><input value={clientName} onChange={event => setClientName(event.target.value)} /></label><label><span>專案名稱</span><input value={projectName} onChange={event => setProjectName(event.target.value)} /></label><label className="wide"><span>客戶官網</span><input type="url" value={websiteUrl} onChange={event => setWebsiteUrl(event.target.value)} placeholder="https://www.example.com" /></label><label><span>商業模式</span><select value={businessType} onChange={event => { const nextBusinessType = event.target.value; setBusinessType(nextBusinessType); setCommercialCriteria(commercialCriteriaByBusinessType[nextBusinessType] || commercialCriteriaByBusinessType.B2B); setSettingsStatus("idle"); }}><option>B2B</option><option>B2C</option><option>其他</option></select></label></div>
        <div className="report-setting">
          <div className="report-current"><span className="source-icon">DOC</span><span><strong>{reportName}</strong><small>評估日期 {assessmentDate.replaceAll("-", ".")}</small></span></div>
          <label className="upload-report"><span>{analysisStatus === "reading" ? "正在分析報告……" : "上傳新的評估報告"}</span><input type="file" accept=".pdf,.docx,.txt,.md" disabled={analysisStatus === "reading"} onChange={event => selectReport(event.target.files?.[0])} /></label>
          <button className="save-button" type="button" disabled={analysisStatus === "reading"} onClick={recalculateSavedReport}>↻ 依目前標準重新計分</button>
        </div>
        <p className="assessment-flow-note"><b>評估流程：</b>報告讀入或重新計分後，系統會依目前的評估條件自動產生分數；接著到 D02／D03 的 Kevin 審核模式查看證據、調整勾選與確認最終分數。</p>
        {analysisMessage && <div className={`report-analysis-status ${analysisStatus}`} role="status"><b>{analysisStatus === "reading" ? "…" : analysisStatus === "error" ? "!" : "✓"}</b><span><strong>{analysisStatus === "error" ? "報告無法完成初評" : analysisStatus === "reading" ? "報告分析中" : "自動初評已完成"}</strong><small>{analysisMessage}</small></span></div>}
        <div className="settings-date"><label htmlFor="assessment-date">評估日期</label><input id="assessment-date" type="date" value={assessmentDate} onChange={event => { setAssessmentDate(event.target.value); setSettingsStatus("idle"); }} /></div>
        <fieldset className="settings-modes"><legend>網站類型</legend><div>{(Object.keys(siteModes) as SiteMode[]).map(mode => <button type="button" className={siteMode === mode ? "selected" : ""} onClick={() => { setSiteMode(mode); setSettingsStatus("idle"); }} key={mode}><b>{mode}</b><span><strong>{siteModes[mode].title}</strong><small>{siteModes[mode].note}</small></span></button>)}</div></fieldset>
        <div className="settings-save"><small>英文鍵名及 01～03 頁面結構不會受到影響。</small><button className="save-button" type="button" disabled={analysisStatus === "reading"} onClick={saveCaseSettings}>{settingsStatus === "saved" ? "✓ 已儲存設定" : pendingDashboardData ? "儲存設定並套用初評" : "儲存案件設定"}</button></div>
      </section>
      <section className="case-settings panel outcome-settings-panel" aria-labelledby="outcome-score-settings-title">
        <div className="settings-head"><div><p className="kicker">OUTCOME SCORING</p><h2 id="outcome-score-settings-title">成果情境分數設定</h2><p>僅 Kevin 審核模式可調整；01 會依這些設定自動重新計算。</p></div><span>成果情境佔 10%</span></div>
        <p className="settings-formula">01 總分＝「搜尋成長機會＋落地準備」平均分數 × 100% ＋「成果情境」分數 × 10%</p>
        {businessType === "B2B" ? <div className="outcome-score-grid data-fields-score-grid">{(Object.keys(outcomeScoring.tob) as FirstInquiryRange[]).map(range => <label key={range}><span>首筆詢問 {range} 個月</span><input type="number" min="0" max="10" value={outcomeScoring.tob[range]} onChange={event => { const score = Math.min(10, Math.max(0, Number(event.target.value))); setOutcomeScoring(current => ({ ...current, tob: { ...current.tob, [range]: score } })); setSettingsStatus("idle"); }} /><em>分</em></label>)}</div> : <div className="outcome-score-grid data-fields-score-grid">{outcomeScoring.toc.map((item, index) => <label key={index}><span>月流量 {item.minTraffic.toLocaleString("zh-TW")} 以上</span><input type="number" min="0" max="10" value={item.score} onChange={event => { const score = Math.min(10, Math.max(0, Number(event.target.value))); setOutcomeScoring(current => ({ ...current, toc: current.toc.map((entry, entryIndex) => entryIndex === index ? { ...entry, score } : entry) })); setSettingsStatus("idle"); }} /><em>分</em></label>)}</div>}
        <div className="settings-save"><small>目前商業模式：{businessType}。分數修改後請按下方「儲存案件設定」。</small><button className="save-button" type="button" onClick={saveCaseSettings}>{settingsStatus === "saved" ? "✓ 已儲存設定" : "儲存案件設定"}</button></div>
      </section>
      <section className="field-edit-bar" aria-live="polite">
        <div><b>{editing ? "中文欄位編輯模式" : saveStatus === "saved" ? "✓ 中文名稱已儲存" : "中文名稱可自訂"}</b><small>{editing ? "直接修改表格第一欄，完成後按「儲存中文名稱」。" : "修改結果會保留在你目前使用的瀏覽器。"}</small></div>
        <button type="button" onClick={resetNames}>還原預設名稱</button>
      </section>
      <nav className="field-jump" aria-label="欄位群組快速導覽">{groups.map((group, index) => <a key={group.title} href={`#field-group-${index + 1}`}><b>群組 {index + 1}</b>{group.title}</a>)}</nav>
      <section className="field-management-note panel"><b>欄位管理規則</b><span>「欄位群組」只是資料整理分類；勾選「啟用」後，欄位才會使用；勾選「決策頁面 01～04」則決定它要套用到哪個決策頁。欄位鍵名固定，中文名稱可自訂。</span><button className="save-button" type="button" onClick={saveCaseSettings}>儲存欄位設定</button></section>
      {groups.map((group, index) => <section className="field-group panel" id={`field-group-${index + 1}`} key={group.title}>
        <div className="field-group-head"><span>群組 {index + 1}</span><div><h2>{group.title}</h2><p>{group.note}</p></div><em>{group.fields.length} 個欄位</em></div>
        <div className="field-table-wrap"><table className="field-table"><thead><tr><th>啟用</th><th>中文名稱{editing ? "（可修改）" : ""}</th><th>欄位鍵名</th><th>套用的決策頁面</th><th>資料型態或示例</th></tr></thead><tbody>{group.fields.map(field => { const setting = fieldManagement[field.key] || { enabled: true, pages: [] }; return <tr key={field.key}><td><input type="checkbox" checked={setting.enabled} aria-label={`啟用 ${field.name}`} onChange={() => toggleFieldEnabled(field.key)} /></td><td>{editing ? <input className="field-name-input" value={field.name} aria-label={`${field.key} 的中文名稱`} onChange={event => changeFieldName(field.key, event.target.value)} /> : field.name}</td><td><code>{field.key}</code></td><td><div className="field-page-toggles">{(["01", "02", "03", "04"] as DashboardPage[]).map(page => <label key={page}><input type="checkbox" checked={setting.pages.includes(page)} aria-label={`${field.name} 套用於決策頁 ${page}`} onChange={() => toggleFieldPage(field.key, page)} /><span>決策頁 {page}</span></label>)}</div></td><td>{field.type}</td></tr>; })}</tbody></table></div>
      </section>)}
      <section className="fixed-fields panel"><div className="field-group-head"><span>FIX</span><div><h2>固定項目・不需維護</h2><p>這些屬於系統框架與識別元素，不隨單一客戶資料更動。</p></div><em>固定</em></div><div className="fixed-grid">{fixedItems.map(item => <div key={item}><b>✓</b><span>{item}</span></div>)}</div></section>
    </div>
  </main>;
}

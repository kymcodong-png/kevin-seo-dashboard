import type { CSSProperties } from "react";
import { calculateFunnel2C, funnelData2C, type Funnel2CSettings } from "./funnel-config";

type Funnel2CProps = {
  reviewMode: boolean;
  year: 1 | 2 | 3;
  settings: Funnel2CSettings;
  onChange: (next: Funnel2CSettings) => void;
};

const numberFormatter = new Intl.NumberFormat("zh-TW", { maximumFractionDigits: 0 });
const decimalFormatter = new Intl.NumberFormat("zh-TW", { maximumFractionDigits: 2 });
const currencyFormatter = new Intl.NumberFormat("zh-TW", { style: "currency", currency: "TWD", maximumFractionDigits: 0 });

function rangeText(min: number, max: number, unit: string) {
  return `${numberFormatter.format(min)}～${numberFormatter.format(max)} ${unit}`;
}

export default function Funnel2C({ reviewMode, year, settings, onChange }: Funnel2CProps) {
  const result = calculateFunnel2C(settings);
  const update = (field: keyof Funnel2CSettings, value: number) => onChange({ ...settings, [field]: field === "monthlyOrganicTraffic" ? Math.round(Math.max(0, value) * 100) / 100 : Math.max(0, value) });
  const input = (field: keyof Funnel2CSettings, label: string, suffix: string, step = 1) => reviewMode ? (
    <label className="funnel-edit funnel-2c-edit"><input type="number" min="0" step={step} aria-label={label} value={settings[field]} onChange={(event) => update(field, Number(event.target.value))} /><small>{suffix}</small></label>
  ) : <strong>{(step < 1 ? decimalFormatter : numberFormatter).format(settings[field])}<small>{suffix}</small></strong>;
  const industryRange = (minField: keyof Funnel2CSettings, maxField: keyof Funnel2CSettings, label: string, unit: string, step = 1) => reviewMode ? (
    <span className="industry-range-edit">
      <input type="number" min="0" step={step} aria-label={`${label}下限`} value={settings[minField]} onChange={(event) => update(minField, Number(event.target.value))} />
      <i>～</i>
      <input type="number" min="0" step={step} aria-label={`${label}上限`} value={settings[maxField]} onChange={(event) => update(maxField, Number(event.target.value))} />
      <small>{unit}</small>
    </span>
  ) : <span>{rangeText(settings[minField], settings[maxField], unit)}</span>;
  const yearLabel = year === 1 ? "第一年" : year === 2 ? "第二年" : "第三年";

  return <>
    <div className="commercial-funnel funnel-2c" aria-label={`B2C ${yearLabel}線上營收轉換漏斗`}>
      <div className="funnel-stack">
        <div className="funnel-stage funnel-stage-one"><span><b>{funnelData2C.top.code}</b>{funnelData2C.top.label}</span><div className="funnel-stage-value"><strong>{numberFormatter.format(result.annualOrganicTraffic)}<small>人次／年</small></strong></div><div className="funnel-2c-monthly"><b>預估月流量</b>{input("monthlyOrganicTraffic", `${yearLabel}預估進站自然月流量`, "人次／月", 0.01)}<small>年流量＝月流量 × 12（四捨五入）</small></div><small className="funnel-stage-description">{funnelData2C.top.description}<span className="funnel-industry-range"><b>產業範圍</b>{industryRange("organicTrafficRangeMin", "organicTrafficRangeMax", "預估進站自然流量產業範圍", "人次／年")}</span></small></div>
        <div className="funnel-conversion"><b>{funnelData2C.atc.label}</b><div className="funnel-industry-range"><span>產業範圍</span>{industryRange("atcIndustryMin", "atcIndustryMax", "加入購物車率產業範圍", "%", 0.1)}</div><em>{funnelData2C.atc.estimateLabel} {input("atcRate", "加入購物車率", "%", 0.1)}</em></div>
        <div className="funnel-stage funnel-stage-two"><span><b>{funnelData2C.middle.code}</b>{funnelData2C.middle.label}</span><div className="funnel-stage-value"><strong>約 {numberFormatter.format(result.cartUsers)}<small>人次</small></strong></div><small>{funnelData2C.middle.description}</small></div>
        <div className="funnel-conversion"><b>{funnelData2C.cvr.label}</b><div className="funnel-industry-range"><span>產業範圍</span>{industryRange("cvrIndustryMin", "cvrIndustryMax", "全站購買轉換率產業範圍", "%", 0.1)}</div><em>{funnelData2C.cvr.estimateLabel} {input("conversionRate", "全站購買轉換率", "%", 0.1)}</em></div>
        <div className="funnel-stage funnel-stage-three"><span><b>{funnelData2C.bottom.code}</b>{funnelData2C.bottom.label}</span><div className="funnel-stage-value"><strong>{numberFormatter.format(result.orders)}<small>筆／年</small></strong></div><small>{funnelData2C.bottom.description}</small></div>
        <div className="funnel-drop" aria-hidden="true" />
      </div>
      <div className="funnel-results funnel-2c-results">
        <div className="revenue-result"><span>成果 A</span><small>{funnelData2C.outcomes.revenueDescription}</small><b>{funnelData2C.outcomes.revenueLabel}</b><strong>{currencyFormatter.format(result.revenue)}</strong><div className="funnel-result-field"><b>平均客單價（AOV）</b>{input("averageOrderValue", "平均客單價", "元")}</div><em>計算基準：預估 {numberFormatter.format(result.orders)} 筆訂單 × 平均客單價 {currencyFormatter.format(settings.averageOrderValue)}</em></div>
        <div><span>成果 B</span><small>{funnelData2C.outcomes.retentionDescription}</small><b>{funnelData2C.outcomes.retentionLabel}</b><div className="funnel-result-field"><b>舊客回購率</b>{input("repeatPurchaseRate", "舊客回購率", "%", 0.1)}</div><div className="funnel-result-field"><b>等值省下廣告費／年</b>{reviewMode ? input("annualAdSavings", "等值省下廣告費", "元") : <strong>{currencyFormatter.format(settings.annualAdSavings)}</strong>}</div></div>
      </div>
    </div>
    {reviewMode && <p className="funnel-edit-hint">目前為 Kevin 審核模式，可調整{yearLabel}的產業範圍、預估月流量、ATC、CVR、平均客單價、回購率與廣告節省金額；年流量與成果會即時計算並獨立儲存。</p>}
    <div className="consumer-timeline">
      <div className="timeline-mode"><span>{reviewMode ? "Kevin 審核模式・可調整目前階段" : "目前成長階段"}</span></div>
      <input aria-label="B2C SEO 成長階段" type="range" min="0" max="3" step="1" value={settings.timelineStage} disabled={!reviewMode} onChange={(event) => update("timelineStage", Number(event.target.value))} style={{ "--timeline-progress": `${(settings.timelineStage / 3) * 100}%` } as CSSProperties} />
      <div className="consumer-timeline-stages">{funnelData2C.timeline.map((stage, index) => <article className={index === settings.timelineStage ? "active" : ""} key={stage.range}><b>{stage.range}</b><p>{stage.description}</p></article>)}</div>
    </div>
  </>;
}

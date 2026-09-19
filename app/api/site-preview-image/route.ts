function absoluteUrl(value: string, base: URL) {
  try { return new URL(value, base).toString(); } catch { return ""; }
}

export async function GET(request: Request) {
  const raw = new URL(request.url).searchParams.get("url") || "";
  let target: URL;
  try { target = new URL(raw); } catch { return Response.json({ error: "官網網址格式不正確" }, { status: 400 }); }
  if (!["http:", "https:"].includes(target.protocol)) return Response.json({ error: "僅支援 http 或 https 官網" }, { status: 400 });
  try {
    const response = await fetch(target, { headers: { "user-agent": "Mozilla/5.0 (compatible; KevinSEO/1.0)" }, signal: AbortSignal.timeout(8000) });
    if (!response.ok) throw new Error("官網暫時無法讀取");
    const html = (await response.text()).slice(0, 2_000_000);
    const candidates: Array<{ value: string; score: number }> = [];
    const metaPattern = /<meta\b[^>]*>/gi;
    for (const match of html.matchAll(metaPattern)) {
      const tag = match[0];
      const key = tag.match(/(?:property|name)=["']([^"']+)["']/i)?.[1]?.toLowerCase() || "";
      if (!/(og:image|twitter:image|image_src)/.test(key)) continue;
      const value = tag.match(/content=["']([^"']+)["']/i)?.[1];
      if (value) candidates.push({ value, score: 4 });
    }
    const imgPattern = /<img([^>]+)>/gi;
    for (const match of html.matchAll(imgPattern)) {
      const attrs = match[1];
      const source = attrs.match(/(?:src|data-src|data-lazy-src|data-original)=["']([^"']+)["']/i)?.[1];
      if (!source) continue;
      const context = `${attrs} ${source}`.toLowerCase();
      const productScore = /(product|產品|商品|collection|catalog|shop|store|item|model|chair|sofa|家具|設備|香水|花露水|mingsing)/i.test(context) ? 10 : 2;
      candidates.push({ value: source, score: productScore });
      const srcset = attrs.match(/srcset=["']([^"']+)["']/i)?.[1];
      if (srcset) {
        const largest = srcset.split(",").map(item => item.trim().split(/\s+/)[0]).filter(Boolean).pop();
        if (largest) candidates.push({ value: largest, score: productScore + 1 });
      }
    }
    const imageUrl = candidates
      .sort((a, b) => b.score - a.score)
      .map(item => absoluteUrl(item.value, target))
      .find(item => item && !item.startsWith("data:"));
    if (!imageUrl) throw new Error("找不到可用圖片");
    return Response.json({ imageUrl });
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : "官網圖片讀取失敗" }, { status: 502 });
  }
}

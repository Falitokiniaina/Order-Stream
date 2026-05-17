export interface DeviceInfoPayload {
  device_type: string;
  os_name: string;
  os_version: string;
  brand_model: string;
  browser_name: string;
  browser_version: string;
  screen_width: number;
  screen_height: number;
  pixel_ratio: number;
  screen_orientation: string;
  cpu_cores: number | null;
  ram_gb: number | null;
  touch_support: boolean;
  connection_type: string | null;
  connection_speed_mbps: number | null;
  save_data_mode: boolean;
  timezone: string;
  browser_language: string;
  browser_languages: string[];
  session_id: string;
  page_url: string;
  referrer: string | null;
  cookies_enabled: boolean;
  do_not_track: boolean;
  client_datetime: string;
}

// ── UA-string brand/model patterns (fallback when Client Hints unavailable) ──
interface BrandPattern { brand: string; modelRe: RegExp; modelGroup: number; modelTransform?: (s: string) => string }
const BRAND_PATTERNS: BrandPattern[] = [
  // Apple — model implicit from OS token
  { brand: "Apple",   modelRe: /iPhone/,                         modelGroup: 0, modelTransform: () => "iPhone" },
  { brand: "Apple",   modelRe: /iPad/,                           modelGroup: 0, modelTransform: () => "iPad" },
  // Samsung (SM-XXXXX or SAMSUNG XXXX)
  { brand: "Samsung", modelRe: /(?:SM-|SAMSUNG )([A-Z0-9]{2,}[-A-Z0-9]*)/i, modelGroup: 1 },
  // Google Pixel
  { brand: "Google",  modelRe: /Pixel (\d+[a-zA-Z ]*)/,         modelGroup: 1, modelTransform: s => `Pixel ${s.trim()}` },
  // OnePlus
  { brand: "OnePlus", modelRe: /(?:OnePlus|HD1[A-Z0-9]+) ?([A-Z0-9 ]+)?/i, modelGroup: 1, modelTransform: s => s?.trim() || "" },
  // Xiaomi / Redmi / POCO
  { brand: "Xiaomi",  modelRe: /Redmi ([A-Z0-9 ]+?)(?:\s+Build|\))/i, modelGroup: 1, modelTransform: s => `Redmi ${s.trim()}` },
  { brand: "Xiaomi",  modelRe: /POCO ([A-Z0-9 ]+?)(?:\s+Build|\))/i,  modelGroup: 1, modelTransform: s => `POCO ${s.trim()}` },
  { brand: "Xiaomi",  modelRe: /M\d{4}[A-Z0-9]+/,               modelGroup: 0 },
  // Huawei
  { brand: "Huawei",  modelRe: /HUAWEI ([A-Z0-9-]+)/i,          modelGroup: 1 },
  { brand: "Huawei",  modelRe: /VOG-|CLT-|ELE-|LYA-|ANA-|OCE-|BRQ-/i, modelGroup: 0 },
  // OPPO
  { brand: "OPPO",    modelRe: /OPPO ([A-Z0-9 ]+?)(?:\s+Build|\))/i, modelGroup: 1 },
  // Realme
  { brand: "Realme",  modelRe: /RMX\d+|Realme ([A-Z0-9 ]+?)(?:\s+Build|\))/i, modelGroup: 1 },
  // Motorola
  { brand: "Motorola",modelRe: /Moto(?:rola)? ([A-Z0-9 ]+?)(?:\s+Build|\))/i, modelGroup: 1, modelTransform: s => `Moto ${s.trim()}` },
  { brand: "Motorola",modelRe: /moto ([a-z0-9 ]+?)(?:\s+Build|\))/i, modelGroup: 1, modelTransform: s => `Moto ${s.trim()}` },
  // Sony Xperia
  { brand: "Sony",    modelRe: /(?:Sony )?Xperia ([A-Z0-9 ]+?)(?:\s+Build|\))/i, modelGroup: 1, modelTransform: s => `Xperia ${s.trim()}` },
  // LG
  { brand: "LG",      modelRe: /LG-?([A-Z0-9]+)/i,              modelGroup: 1 },
  // Nokia
  { brand: "Nokia",   modelRe: /Nokia([A-Z0-9. ]+?)(?:\s+Build|\))/i, modelGroup: 1, modelTransform: s => s.trim() },
  // Asus
  { brand: "Asus",    modelRe: /(?:ASUS_|Asus)([A-Z0-9_]+)/i,   modelGroup: 1 },
];

function parseBrandModelFromUA(ua: string): string {
  for (const p of BRAND_PATTERNS) {
    const m = ua.match(p.modelRe);
    if (!m) continue;
    const raw = p.modelGroup === 0 ? m[0] : m[p.modelGroup] ?? "";
    const model = p.modelTransform ? p.modelTransform(raw) : raw.trim();
    return model ? `${p.brand} ${model}` : p.brand;
  }
  // Generic fallback: pull the meaningful part after "Android"
  const android = ua.match(/Android [^;)]+;\s*([^;)]+)/);
  if (android) return android[1].trim();
  // Generic fallback for everything else: first two UA paren tokens
  const paren = ua.match(/\(([^)]+)\)/);
  if (paren) {
    const parts = paren[1].split(";").map(s => s.trim()).filter(Boolean);
    return parts.slice(0, 2).join(" – ");
  }
  return "";
}

// ── User Agent Client Hints (Chromium-based browsers only) ──────────────────
type UADataHints = {
  model?: string;
  platform?: string;
  platformVersion?: string;
  mobile?: boolean;
  brands?: { brand: string; version: string }[];
  fullVersionList?: { brand: string; version: string }[];
};
type NavigatorWithUAData = Navigator & {
  userAgentData?: { getHighEntropyValues: (hints: string[]) => Promise<UADataHints> };
};

async function getClientHints(): Promise<{ brand_model: string; os_name: string; os_version: string; browser_name: string; browser_version: string; device_type: string | null } | null> {
  const nav = navigator as NavigatorWithUAData;
  if (!nav.userAgentData?.getHighEntropyValues) return null;
  try {
    const hints = await nav.userAgentData.getHighEntropyValues([
      "model", "platform", "platformVersion", "mobile",
      "brands", "fullVersionList",
    ]);

    // Brand/model
    const model = hints.model?.trim() ?? "";
    let brand_model = "";
    if (model) {
      // Try to match a known brand prefix that might be in the UA, else use as-is
      const ua = navigator.userAgent;
      const brandMatch = BRAND_PATTERNS.find(p => p.modelRe.test(ua));
      const brand = brandMatch?.brand ?? "";
      brand_model = brand ? `${brand} ${model}` : model;
    }

    // OS
    const os_name = hints.platform ?? "";
    const os_version = hints.platformVersion ?? "";

    // Browser — prefer fullVersionList, fallback to brands
    const versionList = hints.fullVersionList ?? hints.brands ?? [];
    // Filter out "Not A Brand" / "Chromium" fakes; prefer real brand
    const preferred = versionList.find(b =>
      !b.brand.includes("Not") && !b.brand.includes("Brand") && b.brand !== "Chromium"
    ) ?? versionList[0];
    const browser_name = preferred?.brand ?? "";
    const browser_version = preferred?.version?.split(".")[0] ?? "";

    const device_type = hints.mobile === true ? "mobile" : hints.mobile === false ? "desktop" : null;

    return { brand_model, os_name, os_version, browser_name, browser_version, device_type };
  } catch {
    return null;
  }
}

// ── UA-string OS/Browser parsers (fallback) ─────────────────────────────────
function parseOSFromUA(ua: string): { os_name: string; os_version: string } {
  if (/Windows NT (\d+\.\d+)/.test(ua)) {
    const v = parseFloat(RegExp.$1);
    return { os_name: "Windows", os_version: v >= 10 ? "10/11" : v >= 6.3 ? "8.1" : v >= 6.2 ? "8" : v >= 6.1 ? "7" : RegExp.$1 };
  }
  if (/Android (\d+(\.\d+)?)/.test(ua)) return { os_name: "Android", os_version: RegExp.$1 };
  if (/iPhone OS (\d+_\d+)/.test(ua) || /CPU OS (\d+_\d+)/.test(ua)) return { os_name: "iOS", os_version: RegExp.$1.replace(/_/g, ".") };
  if (/Mac OS X (\d+[._]\d+)/.test(ua)) return { os_name: "macOS", os_version: RegExp.$1.replace(/_/g, ".") };
  if (/CrOS/.test(ua)) return { os_name: "ChromeOS", os_version: "" };
  if (/Linux/.test(ua)) return { os_name: "Linux", os_version: "" };
  return { os_name: "Unknown", os_version: "" };
}

function parseBrowserFromUA(ua: string): { browser_name: string; browser_version: string } {
  if (/Edg\/(\d+)/.test(ua))              return { browser_name: "Edge",             browser_version: RegExp.$1 };
  if (/OPR\/(\d+)/.test(ua))              return { browser_name: "Opera",            browser_version: RegExp.$1 };
  if (/SamsungBrowser\/(\d+)/.test(ua))   return { browser_name: "Samsung Internet", browser_version: RegExp.$1 };
  if (/YaBrowser\/(\d+)/.test(ua))        return { browser_name: "Yandex",           browser_version: RegExp.$1 };
  if (/UCBrowser\/(\d+)/.test(ua))        return { browser_name: "UC Browser",       browser_version: RegExp.$1 };
  if (/Firefox\/(\d+)/.test(ua))          return { browser_name: "Firefox",          browser_version: RegExp.$1 };
  if (/Chrome\/(\d+)/.test(ua))           return { browser_name: "Chrome",           browser_version: RegExp.$1 };
  if (/Version\/(\d+).*Safari/.test(ua))  return { browser_name: "Safari",           browser_version: RegExp.$1 };
  return { browser_name: "Unknown", browser_version: "" };
}

// ── Main export ──────────────────────────────────────────────────────────────
export async function collectDeviceInfo(sessionId: string): Promise<DeviceInfoPayload> {
  const ua = navigator.userAgent;

  // 1. Try Client Hints (Chromium only, async, more reliable)
  const hints = await getClientHints();

  // 2. UA-string fallbacks
  const uaOS      = parseOSFromUA(ua);
  const uaBrowser = parseBrowserFromUA(ua);
  const uaBrandModel = parseBrandModelFromUA(ua);

  // 3. Device type
  const isTablet = /iPad|Android(?!.*Mobile)/i.test(ua) || (navigator.maxTouchPoints > 1 && /Mac/.test(ua));
  const isMobileUA = !isTablet && /Mobi|Android|iPhone|iPod|Windows Phone/i.test(ua);
  const deviceTypeFromUA = isTablet ? "tablet" : isMobileUA ? "mobile" : "desktop";

  // 4. Merge: Client Hints preferred, UA-string as fallback
  const os_name      = hints?.os_name      || uaOS.os_name;
  const os_version   = hints?.os_version   || uaOS.os_version;
  const browser_name = hints?.browser_name || uaBrowser.browser_name;
  const browser_version = hints?.browser_version || uaBrowser.browser_version;
  // brand_model: Client Hints returns the actual hardware model — always prefer it
  const brand_model  = hints?.brand_model  || uaBrandModel;
  const device_type  = hints?.device_type  || deviceTypeFromUA;

  // 5. Connection
  const conn = (navigator as unknown as { connection?: { effectiveType?: string; downlink?: number; saveData?: boolean } }).connection ?? {};
  const connection_type = (conn as { effectiveType?: string }).effectiveType ?? null;
  const connection_speed_mbps = (conn as { downlink?: number }).downlink ?? null;
  const save_data_mode = (conn as { saveData?: boolean }).saveData ?? false;

  // 6. Screen orientation
  const orientationType = screen.orientation?.type ?? "";
  const screen_orientation = orientationType.startsWith("portrait") ? "portrait"
    : orientationType.startsWith("landscape") ? "landscape"
    : window.innerHeight > window.innerWidth ? "portrait" : "landscape";

  return {
    device_type,
    os_name,
    os_version,
    brand_model,
    browser_name,
    browser_version,
    screen_width: screen.width,
    screen_height: screen.height,
    pixel_ratio: window.devicePixelRatio ?? 1,
    screen_orientation,
    cpu_cores: navigator.hardwareConcurrency ?? null,
    ram_gb: (navigator as unknown as { deviceMemory?: number }).deviceMemory ?? null,
    touch_support: navigator.maxTouchPoints > 0,
    connection_type,
    connection_speed_mbps,
    save_data_mode,
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    browser_language: navigator.language,
    browser_languages: [...navigator.languages],
    session_id: sessionId,
    page_url: window.location.href,
    referrer: document.referrer || null,
    cookies_enabled: navigator.cookieEnabled,
    do_not_track: navigator.doNotTrack === "1",
    client_datetime: new Date().toISOString(),
  };
}

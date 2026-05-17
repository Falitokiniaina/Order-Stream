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

export function collectDeviceInfo(sessionId: string): DeviceInfoPayload {
  const ua = navigator.userAgent;

  // ── Device type ─────────────────────────────────────────────────────────────
  const isTablet = /iPad|Android(?!.*Mobile)/i.test(ua) || (navigator.maxTouchPoints > 1 && /Mac/.test(ua));
  const isMobile = !isTablet && /Mobi|Android|iPhone|iPod|Windows Phone/i.test(ua);
  const device_type = isTablet ? "tablet" : isMobile ? "mobile" : "desktop";

  // ── OS ──────────────────────────────────────────────────────────────────────
  let os_name = "Unknown";
  let os_version = "";
  if (/Windows NT (\d+\.\d+)/.test(ua)) {
    const v = parseFloat(RegExp.$1);
    os_name = "Windows";
    os_version = v >= 10 ? "10/11" : v >= 6.3 ? "8.1" : v >= 6.2 ? "8" : v >= 6.1 ? "7" : RegExp.$1;
  } else if (/Android (\d+(\.\d+)?)/.test(ua)) {
    os_name = "Android"; os_version = RegExp.$1;
  } else if (/iPhone OS (\d+_\d+)/.test(ua) || /CPU OS (\d+_\d+)/.test(ua)) {
    os_name = "iOS"; os_version = RegExp.$1.replace(/_/g, ".");
  } else if (/Mac OS X (\d+[._]\d+)/.test(ua)) {
    os_name = "macOS"; os_version = RegExp.$1.replace(/_/g, ".");
  } else if (/CrOS/.test(ua)) {
    os_name = "ChromeOS";
  } else if (/Linux/.test(ua)) {
    os_name = "Linux";
  }

  // ── Browser ─────────────────────────────────────────────────────────────────
  let browser_name = "Unknown";
  let browser_version = "";
  if (/Edg\/(\d+)/.test(ua)) {
    browser_name = "Edge"; browser_version = RegExp.$1;
  } else if (/OPR\/(\d+)/.test(ua)) {
    browser_name = "Opera"; browser_version = RegExp.$1;
  } else if (/SamsungBrowser\/(\d+)/.test(ua)) {
    browser_name = "Samsung Internet"; browser_version = RegExp.$1;
  } else if (/Chrome\/(\d+)/.test(ua)) {
    browser_name = "Chrome"; browser_version = RegExp.$1;
  } else if (/Firefox\/(\d+)/.test(ua)) {
    browser_name = "Firefox"; browser_version = RegExp.$1;
  } else if (/Version\/(\d+).*Safari/.test(ua)) {
    browser_name = "Safari"; browser_version = RegExp.$1;
  }

  // ── Brand / Model (best effort from UA) ────────────────────────────────────
  let brand_model = "";
  const modelMatch = ua.match(/\(([^)]+)\)/);
  if (modelMatch) {
    const parts = modelMatch[1].split(";").map(s => s.trim());
    brand_model = parts.slice(0, 2).join(" — ");
  }

  // ── Connection ──────────────────────────────────────────────────────────────
  const conn = (navigator as unknown as { connection?: { effectiveType?: string; downlink?: number; saveData?: boolean } }).connection ?? {};
  const connection_type = conn.effectiveType ?? null;
  const connection_speed_mbps = conn.downlink ?? null;
  const save_data_mode = conn.saveData ?? false;

  // ── Screen ──────────────────────────────────────────────────────────────────
  const orientationType = (screen.orientation?.type ?? "");
  const screen_orientation = orientationType.startsWith("portrait") ? "portrait" : orientationType.startsWith("landscape") ? "landscape" : window.innerHeight > window.innerWidth ? "portrait" : "landscape";

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

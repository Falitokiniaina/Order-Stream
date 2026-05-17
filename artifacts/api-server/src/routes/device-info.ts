import { Router } from "express";
import { db, deviceInfoTable } from "@workspace/db";
import { eq } from "drizzle-orm";

const router = Router();

async function geolocateIP(ip: string): Promise<Record<string, unknown>> {
  try {
    if (!ip || ip === "::1" || ip === "127.0.0.1" || ip.startsWith("172.") || ip.startsWith("10.") || ip.startsWith("192.168.")) return {};
    const cleanIp = ip.split(",")[0].trim();
    const res = await fetch(`http://ip-api.com/json/${cleanIp}?fields=status,country,regionName,city,isp,lat,lon`);
    if (!res.ok) return {};
    const data = await res.json() as Record<string, unknown>;
    if (data["status"] !== "success") return {};
    return {
      ip_country: data["country"],
      ip_region: data["regionName"],
      ip_city: data["city"],
      ip_isp: data["isp"],
      ip_lat_approx: data["lat"],
      ip_lng_approx: data["lon"],
    };
  } catch {
    return {};
  }
}

router.post("/orders/:id/device-info", async (req, res) => {
  const orderId = parseInt(req.params["id"]);
  if (isNaN(orderId)) return res.status(400).json({ error: "Invalid order id" });

  try {
    const rawIp = (req.headers["x-forwarded-for"] as string | undefined) || req.ip || "";
    const ip = rawIp.split(",")[0].trim();
    const geo = await geolocateIP(ip);
    const b = req.body as Record<string, unknown>;

    await db.insert(deviceInfoTable).values({
      order_id: orderId,
      device_type: b["device_type"] as string ?? null,
      os_name: b["os_name"] as string ?? null,
      os_version: b["os_version"] as string ?? null,
      brand_model: b["brand_model"] as string ?? null,
      browser_name: b["browser_name"] as string ?? null,
      browser_version: b["browser_version"] as string ?? null,
      screen_width: b["screen_width"] as number ?? null,
      screen_height: b["screen_height"] as number ?? null,
      pixel_ratio: b["pixel_ratio"] as number ?? null,
      screen_orientation: b["screen_orientation"] as string ?? null,
      cpu_cores: b["cpu_cores"] as number ?? null,
      ram_gb: b["ram_gb"] as number ?? null,
      touch_support: b["touch_support"] as boolean ?? null,
      connection_type: b["connection_type"] as string ?? null,
      connection_speed_mbps: b["connection_speed_mbps"] as number ?? null,
      save_data_mode: b["save_data_mode"] as boolean ?? null,
      ip_address: ip || null,
      ip_country: geo["ip_country"] as string ?? null,
      ip_region: geo["ip_region"] as string ?? null,
      ip_city: geo["ip_city"] as string ?? null,
      ip_isp: geo["ip_isp"] as string ?? null,
      ip_lat_approx: geo["ip_lat_approx"] as number ?? null,
      ip_lng_approx: geo["ip_lng_approx"] as number ?? null,
      timezone: b["timezone"] as string ?? null,
      browser_language: b["browser_language"] as string ?? null,
      browser_languages: b["browser_languages"] as string[] ?? null,
      session_id: b["session_id"] as string ?? null,
      page_url: b["page_url"] as string ?? null,
      referrer: b["referrer"] as string ?? null,
      cookies_enabled: b["cookies_enabled"] as boolean ?? null,
      do_not_track: b["do_not_track"] as boolean ?? null,
      client_datetime: b["client_datetime"] ? new Date(b["client_datetime"] as string) : null,
      server_datetime: new Date(),
    });

    res.json({ success: true });
  } catch (err) {
    req.log.error({ err }, "Save device info error");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/orders/:id/device-info", async (req, res) => {
  const orderId = parseInt(req.params["id"]);
  if (isNaN(orderId)) return res.status(400).json({ error: "Invalid order id" });

  try {
    const [info] = await db.select().from(deviceInfoTable).where(eq(deviceInfoTable.order_id, orderId)).limit(1);
    if (!info) return res.status(404).json({ error: "Not found" });
    res.json(info);
  } catch (err) {
    req.log.error({ err }, "Get device info error");
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;

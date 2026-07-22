import { useCallback, useEffect, useState } from "react";
import { Rail, Topbar, LiveIndicator, LangSwitch, ThemeButton, Icon, type RailItem } from "@golden-one/ui";
import { makeT, type Lang, type TKey } from "./i18n";
import { api, type LockOptions } from "./api";
import type { Device, AuditEntry, Stats } from "./types";
import { Dashboard } from "./screens/Dashboard";
import { Devices } from "./screens/Devices";
import { DeviceDetail } from "./screens/DeviceDetail";
import { Enroll } from "./screens/Enroll";
import { Audit } from "./screens/Audit";
import { Settings } from "./screens/Settings";

type Route = "dashboard" | "devices" | "detail" | "enroll" | "audit" | "settings";

export default function App() {
  const [lang, setLang] = useState<Lang>("ru");
  const [dark, setDark] = useState(true);
  const [route, setRoute] = useState<Route>("dashboard");
  const [currentId, setCurrentId] = useState<string | null>(null);
  const [devices, setDevices] = useState<Device[]>([]);
  const [audit, setAudit] = useState<AuditEntry[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  const t = makeT(lang);

  const refresh = useCallback(async () => {
    const [d, a, s] = await Promise.all([api.listDevices(), api.audit(), api.stats()]);
    setDevices(d); setAudit(a); setStats(s);
  }, []);

  useEffect(() => { void refresh(); }, [refresh]);
  useEffect(() => { document.documentElement.dataset.theme = dark ? "dark" : "light"; }, [dark]);
  useEffect(() => { document.documentElement.lang = lang; }, [lang]);

  const showToast = (msg: string) => { setToast(msg); window.setTimeout(() => setToast(null), 2200); };

  const openDevice = (id: string) => { setCurrentId(id); setRoute("detail"); };
  const current = devices.find((d) => d.id === currentId) ?? null;

  const doLock = async (opts: LockOptions) => { if (!current) return; await api.setLock(current.id, "locked", opts); await refresh(); showToast(t("toastLocked")); };
  const doUnlock = async () => { if (!current) return; await api.setLock(current.id, "unlocked"); await refresh(); showToast(t("toastUnlocked")); };
  const doCommand = async (kind: "locate" | "sound") => { if (!current) return; await api.command(current.id, kind); await refresh(); showToast(kind === "locate" ? t("toastLocate") : t("toastSound")); };

  const overdue = devices.filter((d) => d.loan === "overdue").length;
  const railItems: RailItem[] = [
    { id: "dashboard", label: t("dashboard"), icon: "dash" },
    { id: "devices", label: t("devices"), icon: "devices", badge: overdue || undefined },
    { id: "enroll", label: t("enroll"), icon: "enroll" },
    { id: "audit", label: t("audit"), icon: "audit" },
    { id: "settings", label: t("settings"), icon: "settings" },
  ];
  const activeRail = route === "detail" ? "devices" : route;

  const titleKey: Record<Route, [TKey, TKey]> = {
    dashboard: ["dashboard", "subDash"], devices: ["devices", "subDevices"], detail: ["devices", "subDevices"],
    enroll: ["enroll", "subEnroll"], audit: ["audit", "subAudit"], settings: ["settings", "subSettings"],
  };
  const [tk, sk] = titleKey[route];

  return (
    <div className="go-app" style={{ display: "grid", gridTemplateColumns: "78px 1fr", minHeight: "100vh", background: "var(--go-bg)", color: "var(--go-text)" }}>
      <Rail
        items={railItems}
        active={activeRail}
        onSelect={(id) => setRoute(id as Route)}
        footer={<div style={{ width: 38, height: 38, borderRadius: 11, background: "linear-gradient(135deg,#2c3444,#1c2230)", display: "grid", placeItems: "center", fontWeight: 700, fontSize: 12 }}>АК</div>}
      />
      <div style={{ display: "flex", flexDirection: "column", minWidth: 0 }}>
        <Topbar
          title={route === "detail" && current ? current.name : t(tk)}
          crumb={t(sk)}
          search={
            <div style={{ marginLeft: 12, flex: 1, maxWidth: 320, position: "relative" }}>
              <Icon name="search" style={{ position: "absolute", left: 10, top: 8, width: 15, height: 15, color: "var(--go-faint)" }} />
              <input className="go-input go-mono" style={{ paddingLeft: 32, fontSize: 12.5 }} placeholder={t("searchPh")} />
            </div>
          }
          live={<LiveIndicator>{t("liveMdm")}</LiveIndicator>}
          right={<>
            <LangSwitch value={lang} onChange={(v) => setLang(v as Lang)} />
            <ThemeButton onClick={() => setDark((v) => !v)} />
          </>}
        />
        <main style={{ padding: "16px 22px", flex: 1 }}>
          {route === "dashboard" && <Dashboard t={t} stats={stats} devices={devices} audit={audit} onOpenDevice={openDevice} onViewAll={() => setRoute("devices")} />}
          {route === "devices" && <Devices t={t} devices={devices} onOpenDevice={openDevice} />}
          {route === "detail" && current && <DeviceDetail t={t} device={current} audit={audit} onBack={() => setRoute("devices")} onLock={doLock} onUnlock={doUnlock} onCommand={doCommand} />}
          {route === "enroll" && <Enroll t={t} onCheck={() => showToast(t("toastSup"))} onRegister={() => showToast(t("toastRegistered"))} />}
          {route === "audit" && <Audit t={t} audit={audit} />}
          {route === "settings" && <Settings t={t} lang={lang} setLang={setLang} dark={dark} toggleTheme={() => setDark((v) => !v)} />}
        </main>
      </div>
      {toast && (
        <div style={{ position: "fixed", bottom: 22, left: "50%", transform: "translateX(-50%)", background: "var(--go-panel-3)", border: "1px solid var(--go-border-2)", color: "var(--go-text)", padding: "11px 18px", borderRadius: 10, fontSize: 12.5, fontWeight: 650, zIndex: 200, boxShadow: "var(--go-shadow)", display: "flex", gap: 8, alignItems: "center" }}>
          <span style={{ color: "var(--go-green)", display: "grid" }}><Icon name="check" width={16} height={16} /></span>{toast}
        </div>
      )}
    </div>
  );
}

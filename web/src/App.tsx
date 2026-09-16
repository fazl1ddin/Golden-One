import { useCallback, useEffect, useMemo, useState } from "react";
import { Rail, Topbar, LiveIndicator, LangSwitch, ThemeButton, Icon, Button, type RailItem } from "@golden-one/ui";
import { makeT, type Lang, type TKey } from "./i18n.js";
import { api, ApiError, onUnauthorized, tokenStore } from "./api/index.js";
import { can, type Device, type AuditEntry, type Session, type Stats } from "./types.js";
import { Dashboard } from "./screens/Dashboard.js";
import { Devices } from "./screens/Devices.js";
import { DeviceDetail } from "./screens/DeviceDetail.js";
import { Enroll } from "./screens/Enroll.js";
import { Audit } from "./screens/Audit.js";
import { Settings } from "./screens/Settings.js";
import { Login } from "./screens/Login.js";

type Route = "dashboard" | "devices" | "detail" | "enroll" | "audit" | "settings";

const ROLE_LABEL: Record<Session["role"], TKey> = {
  ADMIN: "roleAdmin",
  COLLECTIONS: "roleCollections",
  POS_OPERATOR: "rolePos",
};

export default function App() {
  const [lang, setLang] = useState<Lang>("ru");
  const [dark, setDark] = useState(true);
  const [session, setSession] = useState<Session | null>(null);
  const [booting, setBooting] = useState(true);

  const [route, setRoute] = useState<Route>("dashboard");
  const [currentId, setCurrentId] = useState<string | null>(null);
  const [devices, setDevices] = useState<Device[]>([]);
  const [audit, setAudit] = useState<AuditEntry[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [mdmProvider, setMdmProvider] = useState<string | null>(null);
  const [toast, setToast] = useState<{ text: string; tone: "ok" | "bad" } | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);

  // makeT returns a new function each call, so memoise it: t feeds describe,
  // which feeds refresh, which an effect depends on. Without this the effect
  // re-runs on every render and the app polls the API in a tight loop.
  const t = useMemo(() => makeT(lang), [lang]);

  const notify = useCallback((text: string, tone: "ok" | "bad" = "ok") => {
    setToast({ text, tone });
    window.setTimeout(() => setToast(null), 2600);
  }, []);

  /** Turns any thrown error into something an operator can act on. */
  const describe = useCallback(
    (err: unknown): string => {
      if (err instanceof ApiError) {
        if (err.code === "NETWORK_ERROR") return t("errNetwork");
        if (err.status === 403) return t("errForbidden");
        return err.message;
      }
      return t("errGeneric");
    },
    [t],
  );

  /* ── Session ───────────────────────────────────────────────────────────── */

  // A token in storage is not proof of a live session: it may have expired or
  // been revoked. Ask the API who we are before showing the console.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!tokenStore.get()) {
        setBooting(false);
        return;
      }
      try {
        const user = await api.me();
        if (!cancelled) setSession(user);
      } catch {
        if (!cancelled) setSession(null);
      } finally {
        if (!cancelled) setBooting(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(
    () =>
      onUnauthorized(() => {
        setSession(null);
        setRoute("dashboard");
      }),
    [],
  );

  const signIn = useCallback(async (email: string, password: string) => {
    const user = await api.login(email, password);
    setSession(user);
  }, []);

  const signOut = useCallback(() => {
    api.logout();
    setSession(null);
    setDevices([]);
    setAudit([]);
    setStats(null);
    setRoute("dashboard");
  }, []);

  /* ── Data ──────────────────────────────────────────────────────────────── */

  const refresh = useCallback(async () => {
    if (!session) return;
    setLoadError(null);
    try {
      const [devicePage, statsResult] = await Promise.all([api.devices(), api.stats()]);
      setDevices(devicePage.items);
      setStats(statsResult);

      // Audit is restricted: a point-of-sale operator legitimately gets a 403
      // here, which is not an error worth showing them.
      if (can(session.role, "audit:read")) {
        const auditPage = await api.audit(50);
        setAudit(auditPage.items);
      } else {
        setAudit([]);
      }
    } catch (err) {
      if (err instanceof ApiError && err.isAuthError) return;
      setLoadError(describe(err));
    }
  }, [session, describe]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  // Re-read on navigation: the console is a monitoring surface, and a stale
  // lock state is worse than a moment's delay.
  useEffect(() => {
    if (route === "dashboard" || route === "devices" || route === "audit") void refresh();
  }, [route, refresh]);

  /**
   * Re-validate the session periodically and when the tab regains focus.
   * The API revokes a token the moment an operator is deactivated, but nothing
   * pushes that to the browser — without this poll a dismissed operator keeps
   * looking at a console full of customer data until they try to act.
   */
  useEffect(() => {
    if (!session) return;
    const check = () => {
      void api.me().catch(() => {
        /* a 401 clears the token and fires onUnauthorized */
      });
    };
    const timer = window.setInterval(check, 60_000);
    const onFocus = () => {
      if (document.visibilityState === "visible") check();
    };
    document.addEventListener("visibilitychange", onFocus);
    window.addEventListener("focus", onFocus);
    return () => {
      window.clearInterval(timer);
      document.removeEventListener("visibilitychange", onFocus);
      window.removeEventListener("focus", onFocus);
    };
  }, [session]);

  useEffect(() => {
    if (!session) return;
    api
      .readiness()
      .then((r) => setMdmProvider(r.checks.mdmProvider))
      .catch(() => setMdmProvider(null));
  }, [session]);

  /**
   * While a command is in flight the device sits in a *_PENDING state that only
   * the backend reconciler can resolve, so poll until nothing is pending.
   */
  const hasPending = useMemo(
    () => devices.some((d) => d.lock === "lockPending" || d.lock === "unlockPending"),
    [devices],
  );

  useEffect(() => {
    if (!session || !hasPending) return;
    const timer = window.setInterval(() => void refresh(), 5000);
    return () => window.clearInterval(timer);
  }, [session, hasPending, refresh]);

  useEffect(() => {
    document.documentElement.dataset.theme = dark ? "dark" : "light";
  }, [dark]);
  useEffect(() => {
    document.documentElement.lang = lang;
  }, [lang]);

  /* ── Actions ───────────────────────────────────────────────────────────── */

  const current = devices.find((d) => d.id === currentId) ?? null;

  const openDevice = (id: string) => {
    setCurrentId(id);
    setRoute("detail");
  };

  const run = useCallback(
    async (action: () => Promise<void>, okMessage: string) => {
      try {
        await action();
        await refresh();
        notify(okMessage, "ok");
      } catch (err) {
        notify(describe(err), "bad");
      }
    },
    [refresh, notify, describe],
  );

  const doLock = (input: { message: string; phone: string; reason?: string }) =>
    current ? run(() => api.lock(current.id, input).then(() => undefined), t("toastLocked")) : undefined;

  const doUnlock = (reason?: string) =>
    current ? run(() => api.unlock(current.id, reason).then(() => undefined), t("toastUnlocked")) : undefined;

  const doCommand = (kind: "locate" | "sound") => {
    if (!current) return;
    void run(async () => {
      if (kind === "locate") await api.locate(current.id);
      else await api.sound(current.id);
    }, kind === "locate" ? t("toastLocate") : t("toastSound"));
  };

  /* ── Shell ─────────────────────────────────────────────────────────────── */

  if (booting) {
    return (
      <div
        className="go-app"
        style={{ minHeight: "100vh", display: "grid", placeItems: "center", color: "var(--go-muted)" }}
      >
        {t("loading")}
      </div>
    );
  }

  if (!session) return <Login lang={lang} setLang={setLang} onSignIn={signIn} />;

  const overdue = devices.filter((d) => d.loan === "overdue").length;
  const railItems: RailItem[] = [
    { id: "dashboard", label: t("dashboard"), icon: "dash" },
    { id: "devices", label: t("devices"), icon: "devices", badge: overdue || undefined },
    ...(can(session.role, "device:enroll")
      ? [{ id: "enroll", label: t("enroll"), icon: "enroll" as const }]
      : []),
    ...(can(session.role, "audit:read")
      ? [{ id: "audit", label: t("audit"), icon: "audit" as const }]
      : []),
    { id: "settings", label: t("settings"), icon: "settings" },
  ];

  const titleKey: Record<Route, [TKey, TKey]> = {
    dashboard: ["dashboard", "subDash"],
    devices: ["devices", "subDevices"],
    detail: ["devices", "subDevices"],
    enroll: ["enroll", "subEnroll"],
    audit: ["audit", "subAudit"],
    settings: ["settings", "subSettings"],
  };
  const [tk, sk] = titleKey[route];
  const crumb = route === "dashboard" ? `${t(ROLE_LABEL[session.role])} · ${session.name}` : t(sk);

  return (
    <div
      className="go-app"
      style={{
        display: "grid",
        gridTemplateColumns: "78px 1fr",
        minHeight: "100vh",
        background: "var(--go-bg)",
        color: "var(--go-text)",
      }}
    >
      <Rail
        items={railItems}
        active={route === "detail" ? "devices" : route}
        onSelect={(id) => setRoute(id as Route)}
        footer={
          <button
            onClick={signOut}
            title={t("logout")}
            style={{
              width: 38,
              height: 38,
              borderRadius: 11,
              background: "linear-gradient(135deg,#2c3444,#1c2230)",
              border: "none",
              cursor: "pointer",
              color: "var(--go-text)",
              fontWeight: 700,
              fontSize: 12,
            }}
          >
            {session.name
              .split(/\s+/)
              .slice(0, 2)
              .map((p) => p[0]?.toUpperCase() ?? "")
              .join("")}
          </button>
        }
      />
      <div style={{ display: "flex", flexDirection: "column", minWidth: 0 }}>
        <Topbar
          title={route === "detail" && current ? current.name : t(tk)}
          crumb={crumb}
          search={
            <div style={{ marginLeft: 12, flex: 1, maxWidth: 320, position: "relative" }}>
              <Icon
                name="search"
                style={{ position: "absolute", left: 10, top: 8, width: 15, height: 15, color: "var(--go-faint)" }}
              />
              <input
                className="go-input go-mono"
                style={{ paddingLeft: 32, fontSize: 12.5 }}
                placeholder={t("searchPh")}
                onKeyDown={(e) => {
                  if (e.key !== "Enter") return;
                  const value = (e.target as HTMLInputElement).value.trim();
                  void api
                    .devices(value ? { search: value } : {})
                    .then((page) => {
                      setDevices(page.items);
                      setRoute("devices");
                    })
                    .catch((err) => notify(describe(err), "bad"));
                }}
              />
            </div>
          }
          live={
            <LiveIndicator>
              {mdmProvider ? `MDM online · ${mdmProvider}` : t("errNetwork")}
            </LiveIndicator>
          }
          right={
            <>
              <LangSwitch value={lang} onChange={(v) => setLang(v as Lang)} />
              <ThemeButton onClick={() => setDark((v) => !v)} />
            </>
          }
        />
        <main style={{ padding: "16px 22px", flex: 1 }}>
          {loadError && (
            <div
              role="alert"
              style={{
                display: "flex",
                alignItems: "center",
                gap: 12,
                background: "var(--go-red-soft)",
                color: "var(--go-red)",
                padding: "10px 14px",
                borderRadius: 10,
                fontSize: 12.5,
                marginBottom: 14,
              }}
            >
              <span style={{ flex: 1 }}>{loadError}</span>
              <Button variant="ghost" onClick={() => void refresh()}>
                {t("retry")}
              </Button>
            </div>
          )}

          {route === "dashboard" && (
            <Dashboard
              t={t}
              stats={stats}
              devices={devices}
              audit={audit}
              onOpenDevice={openDevice}
              onViewAll={() => setRoute("devices")}
            />
          )}
          {route === "devices" && <Devices t={t} devices={devices} onOpenDevice={openDevice} />}
          {route === "detail" && current && (
            <DeviceDetail
              t={t}
              device={current}
              audit={audit}
              role={session.role}
              onBack={() => setRoute("devices")}
              onLock={doLock}
              onUnlock={doUnlock}
              onCommand={doCommand}
            />
          )}
          {route === "enroll" && (
            <Enroll
              t={t}
              onEnrolled={async (name) => {
                await refresh();
                notify(`${t("toastRegistered")}: ${name}`, "ok");
              }}
              onError={(err) => notify(describe(err), "bad")}
            />
          )}
          {route === "audit" && <Audit t={t} audit={audit} devices={devices} />}
          {route === "settings" && (
            <Settings
              t={t}
              lang={lang}
              setLang={setLang}
              dark={dark}
              toggleTheme={() => setDark((v) => !v)}
              session={session}
              mdmProvider={mdmProvider}
              onSignOut={signOut}
            />
          )}
        </main>
      </div>

      {toast && (
        <div
          role="status"
          style={{
            position: "fixed",
            bottom: 22,
            left: "50%",
            transform: "translateX(-50%)",
            background: "var(--go-panel-3)",
            border: `1px solid ${toast.tone === "bad" ? "var(--go-red)" : "var(--go-border-2)"}`,
            color: "var(--go-text)",
            padding: "11px 18px",
            borderRadius: 10,
            fontSize: 12.5,
            fontWeight: 650,
            zIndex: 200,
            boxShadow: "var(--go-shadow)",
            display: "flex",
            gap: 8,
            alignItems: "center",
            maxWidth: 520,
          }}
        >
          <span style={{ color: toast.tone === "bad" ? "var(--go-red)" : "var(--go-green)", display: "grid" }}>
            <Icon name={toast.tone === "bad" ? "warn" : "check"} width={16} height={16} />
          </span>
          {toast.text}
        </div>
      )}
    </div>
  );
}

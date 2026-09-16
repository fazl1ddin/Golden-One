import { Panel, PanelHeader, Badge, Toggle, LangSwitch, Button } from "@golden-one/ui";
import { apiBaseUrl } from "../api/index.js";
import type { Session } from "../types.js";
import type { Lang, makeT, TKey } from "../i18n.js";

type T = ReturnType<typeof makeT>;

const ROLE_LABEL: Record<Session["role"], TKey> = {
  ADMIN: "roleAdmin",
  COLLECTIONS: "roleCollections",
  POS_OPERATOR: "rolePos",
};

function Row({ title, sub, control }: { title: string; sub: React.ReactNode; control: React.ReactNode }) {
  return (
    <div style={{
      padding: "14px 18px", borderTop: "1px solid var(--go-border)",
      display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12,
    }}>
      <div><div style={{ fontWeight: 650 }}>{title}</div><div className="go-cm">{sub}</div></div>
      {control}
    </div>
  );
}

export function Settings({ t, lang, setLang, dark, toggleTheme, session, mdmProvider, onSignOut }: {
  t: T; lang: Lang; setLang: (l: Lang) => void;
  dark: boolean; toggleTheme: () => void;
  session: Session; mdmProvider: string | null; onSignOut: () => void;
}) {
  return (
    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
      <Panel>
        <PanelHeader title={t("setAccount")} />
        <Row title={session.name} sub={session.email}
          control={<Badge tone="steel" dot={false}>{t(ROLE_LABEL[session.role])}</Badge>} />
        <Row title={t("setSession")} sub={t("logout")}
          control={<Button variant="ghost" onClick={onSignOut}>{t("logout")}</Button>} />
      </Panel>

      <Panel>
        <PanelHeader title={t("setMdm")} />
        {/* Read from /health/ready, so this reflects the running backend rather
            than a value typed into the UI. */}
        <Row title={t("setProviderLive")} sub={<span className="go-mono">{apiBaseUrl}</span>}
          control={mdmProvider
            ? <Badge tone="green">{mdmProvider}</Badge>
            : <Badge tone="red">{t("errNetwork")}</Badge>} />
        <Row title={t("setApi")} sub={<span className="go-mono">{apiBaseUrl}</span>}
          control={<Badge tone="gray" dot={false}>API</Badge>} />
      </Panel>

      <Panel style={{ gridColumn: "1 / -1" }}>
        <PanelHeader title={t("setRoles")} />
        <Row title={t("setLang")} sub="RU / UZ"
          control={<LangSwitch value={lang} onChange={(v) => setLang(v as Lang)} />} />
        <Row title={t("setTheme")} sub="Dark / Light"
          control={<Toggle on={dark} onToggle={toggleTheme} />} />
      </Panel>
    </div>
  );
}

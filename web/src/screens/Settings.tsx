import { Panel, PanelHeader, Badge, Toggle, LangSwitch, Label, Input, Textarea } from "@golden-one/ui";
import type { Lang, makeT } from "../i18n";

type T = ReturnType<typeof makeT>;

export function Settings({ t, lang, setLang, dark, toggleTheme }: {
  t: T; lang: Lang; setLang: (l: Lang) => void; dark: boolean; toggleTheme: () => void;
}) {
  const row = (title: string, sub: React.ReactNode, control: React.ReactNode) => (
    <div style={{ padding: "14px 18px", borderTop: "1px solid var(--go-border)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
      <div><div style={{ fontWeight: 650 }}>{title}</div><div className="go-cm">{sub}</div></div>
      {control}
    </div>
  );
  return (
    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
      <Panel>
        <PanelHeader title={t("setMdm")} />
        {row(t("setProvider"), "Mosyle Business", <Badge tone="gray" dot={false}>API</Badge>)}
        {row(t("setStatus"), <span className="go-mono">api.mosyle.com</span>, <Badge tone="green">{t("connected")}</Badge>)}
      </Panel>
      <Panel>
        <PanelHeader title={t("setRoles")} />
        {row(t("setLang"), "RU / UZ", <LangSwitch value={lang} onChange={(v) => setLang(v as Lang)} />)}
        {row(t("setTheme"), "Dark / Light", <Toggle on={dark} onToggle={toggleTheme} />)}
      </Panel>
      <Panel style={{ gridColumn: "1 / -1" }}>
        <PanelHeader title={t("setTemplate")} />
        <div style={{ padding: "16px 18px" }}>
          <div style={{ marginBottom: 12 }}>
            <Label>{t("lockMsgLabel")}</Label>
            <Textarea defaultValue="Устройство заблокировано в связи с просрочкой платежа. Для разблокировки обратитесь в Golden One." />
          </div>
          <div><Label>{t("lockPhoneLabel")}</Label><Input className="go-mono" defaultValue="+998 71 200-00-00" /></div>
        </div>
      </Panel>
    </div>
  );
}

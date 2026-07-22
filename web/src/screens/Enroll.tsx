import { Panel, PanelHeader, Button, Icon, Label, Input, Select } from "@golden-one/ui";
import type { makeT } from "../i18n";

type T = ReturnType<typeof makeT>;

export function Enroll({ t, onCheck, onRegister }: { t: T; onCheck: () => void; onRegister: () => void }) {
  const steps = [t("eStep1"), t("eStep2"), t("eStep3"), t("eStep4")];
  return (
    <div style={{ maxWidth: 660, display: "flex", flexDirection: "column", gap: 14 }}>
      <Panel>
        <PanelHeader title={t("enrollStep")} />
        <div style={{ padding: "16px 20px" }}>
          {steps.map((s, i) => (
            <div key={i} style={{ display: "flex", gap: 11, padding: "7px 0", alignItems: "center", color: "var(--go-muted)", fontSize: 12.5 }}>
              <span style={{ width: 22, height: 22, borderRadius: 6, background: "var(--go-cy-soft)", color: "var(--go-cy)", display: "grid", placeItems: "center", fontWeight: 700, flexShrink: 0, fontSize: 11 }}>{i + 1}</span>
              {s}
            </div>
          ))}
        </div>
      </Panel>
      <Panel>
        <div style={{ padding: 18 }}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <div><Label>{t("eCustomer")}</Label><Input placeholder="Фамилия Имя Отчество" /></div>
            <div><Label>{t("ePhone")}</Label><Input placeholder="+998 __ ___-__-__" /></div>
            <div><Label>{t("eContract")}</Label><Input className="go-mono" placeholder="GO-2026-____" /></div>
            <div><Label>{t("eModel")}</Label><Select><option>iPhone 15</option><option>iPhone 15 Pro</option><option>iPhone 14</option><option>iPhone 13</option></Select></div>
            <div><Label>{t("eSerial")}</Label><Input className="go-mono" placeholder="XXXXXXXXXX" /></div>
            <div><Label>{t("eImei")}</Label><Input className="go-mono" placeholder="35 XXXXXX XXXXXX X" /></div>
          </div>
          <div style={{ display: "flex", gap: 9, marginTop: 12 }}>
            <Button variant="ghost" onClick={onCheck}><Icon name="check" />{t("eCheck")}</Button>
            <Button variant="cy" onClick={onRegister}>{t("eRegister")}</Button>
          </div>
        </div>
      </Panel>
    </div>
  );
}

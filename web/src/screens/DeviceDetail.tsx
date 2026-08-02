import { useState } from "react";
import {
  Panel, PanelHeader, Field, Button, Icon, Modal, Warn, LostModePreview,
  Label, Select, Textarea, Input,
} from "@golden-one/ui";
import type { Device, AuditEntry } from "../types";
import type { makeT } from "../i18n";
import type { LockOptions } from "../api";
import { loanBadge, mdmBadge, lockBadge, fmtAgo, evColor, evIcon } from "../helpers";

type T = ReturnType<typeof makeT>;
const DEFAULT_MSG = "Устройство заблокировано в связи с просрочкой платежа. Для разблокировки обратитесь в Golden One.";
const DEFAULT_PHONE = "+998 71 200-00-00";

export function DeviceDetail({ t, device, audit, onBack, onLock, onUnlock, onCommand }: {
  t: T; device: Device; audit: AuditEntry[];
  onBack: () => void;
  onLock: (opts: LockOptions) => void;
  onUnlock: () => void;
  onCommand: (kind: "locate" | "sound") => void;
}) {
  const [modal, setModal] = useState<"lock" | "unlock" | null>(null);
  const info: [string, React.ReactNode][] = [
    ["fModel", device.model], ["fSerial", <span className="go-mono">{device.serial}</span>],
    ["fImei", <span className="go-mono">{device.imei}</span>], ["fOs", device.ios],
    ["fSup", "Supervised ✓"], ["fEnroll", mdmBadge(device.mdm, t)], ["fLastSeen", device.lastSeen],
  ];
  const loan: [string, React.ReactNode][] = [
    ["fContract", <span className="go-mono">{device.contract}</span>],
    ["fAmount", <span><span className="go-mono">{device.amount}</span> сум</span>],
    ["fMonthly", <span><span className="go-mono">{device.monthly}</span> сум</span>],
    ["fPaid", <span><span className="go-mono">{device.paid}</span> сум</span>],
    ["fNext", <span className="go-mono">{device.next}</span>],
    ["fDays", device.daysOverdue > 0 ? <span className={`go-over go-mono${device.daysOverdue >= 20 ? " go-over--hi" : ""}`}>{device.daysOverdue} {t("daysOverdue")}</span> : "—"],
  ];
  const hist = audit.filter((a) => a.dev === device.name);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      <Button variant="ghost" style={{ alignSelf: "flex-start" }} onClick={onBack}>{t("btnBack")}</Button>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 320px", gap: 14 }}>
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          <Panel>
            <div style={{ display: "flex", gap: 16, alignItems: "center", padding: "18px 20px" }}>
              <div style={{ width: 50, height: 78, borderRadius: 11, flexShrink: 0, border: "2px solid var(--go-border-2)", background: "var(--go-panel-2)" }} />
              <div>
                <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
                  <span style={{ fontSize: 17, fontWeight: 700 }}>{device.name}</span>{lockBadge(device.lock, t)}
                </div>
                <div className="go-cm" style={{ marginTop: 3 }}>{device.model} · {device.phone}</div>
              </div>
            </div>
            <PanelHeader title={t("devInfo")} />
            {info.map(([k, v]) => <Field key={k} label={t(k as never)} value={v} />)}
          </Panel>
          <Panel>
            <PanelHeader title={t("loanInfo")} action={loanBadge(device.loan, t)} />
            {loan.map(([k, v]) => <Field key={k} label={t(k as never)} value={v} />)}
          </Panel>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          <Panel>
            <div style={{ padding: "16px 18px" }}>
              <h4 style={{ fontSize: 13, textTransform: "uppercase", letterSpacing: ".4px", marginBottom: 4 }}>{t("actionsTitle")}</h4>
              <p className="go-cm" style={{ marginBottom: 14 }}>{t("actionsHint")}</p>
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {device.lock === "locked"
                  ? <Button variant="cy" block onClick={() => setModal("unlock")}><Icon name="unlock" />{t("btnUnlock")}</Button>
                  : <Button variant="red" block onClick={() => setModal("lock")}><Icon name="lock" />{t("btnLock")}</Button>}
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                  <Button variant="ghost" onClick={() => onCommand("locate")}><Icon name="locate" />{t("btnLocate")}</Button>
                  <Button variant="ghost" onClick={() => onCommand("sound")}><Icon name="sound" />{t("btnSound")}</Button>
                </div>
              </div>
            </div>
          </Panel>
          <Panel>
            <PanelHeader title={t("cmdHistory")} />
            <div className="go-feed">
              {hist.length ? hist.map((a, i) => (
                <div className="go-ev" key={i}>
                  <div className="go-ev__ico" style={{ background: `color-mix(in srgb, var(${evColor[a.act]}) 15%, transparent)`, color: `var(${evColor[a.act]})` }}><Icon name={evIcon[a.act]} /></div>
                  <div><div className="go-ev__t">{t(a.act)}</div><div className="go-ev__time">{a.who} · {fmtAgo(a.t, t)}</div></div>
                </div>
              )) : <div style={{ padding: 40, textAlign: "center", color: "var(--go-faint)" }}>—</div>}
            </div>
          </Panel>
        </div>
      </div>

      {modal === "lock" && <LockModal t={t} device={device} onClose={() => setModal(null)} onConfirm={(o) => { setModal(null); onLock(o); }} />}
      {modal === "unlock" && <UnlockModal t={t} device={device} onClose={() => setModal(null)} onConfirm={() => { setModal(null); onUnlock(); }} />}
    </div>
  );
}

function LockModal({ t, device, onClose, onConfirm }: { t: T; device: Device; onClose: () => void; onConfirm: (o: LockOptions) => void }) {
  const [reason, setReason] = useState(t("reasonOverdue"));
  const [message, setMessage] = useState(DEFAULT_MSG);
  const [phone, setPhone] = useState(DEFAULT_PHONE);
  return (
    <Modal icon="lock" tone="red" title={t("lockTitle")} subtitle={`${t("lockSub")} · ${device.name}`} onClose={onClose}
      footer={<>
        <Button variant="ghost" onClick={onClose}>{t("cancel")}</Button>
        <Button variant="red" onClick={() => onConfirm({ reason, message, phone })}><Icon name="lock" />{t("confirmLock")}</Button>
      </>}>
      <Warn>{t("lockWarn")}</Warn>
      <div style={{ marginBottom: 12 }}><Label>{t("lockReason")}</Label>
        <Select value={reason} onChange={(e) => setReason(e.target.value)}>
          <option>{t("reasonOverdue")}</option><option>{t("reasonFraud")}</option><option>{t("reasonOther")}</option>
        </Select></div>
      <div style={{ marginBottom: 12 }}><Label>{t("lockMsgLabel")}</Label>
        <Textarea value={message} onChange={(e) => setMessage(e.target.value)} /></div>
      <div style={{ marginBottom: 14 }}><Label>{t("lockPhoneLabel")}</Label>
        <Input className="go-mono" value={phone} onChange={(e) => setPhone(e.target.value)} /></div>
      <LostModePreview title={t("previewTitle")} message={message} phone={phone} />
    </Modal>
  );
}

function UnlockModal({ t, device, onClose, onConfirm }: { t: T; device: Device; onClose: () => void; onConfirm: () => void }) {
  const [ok, setOk] = useState(false);
  return (
    <Modal icon="unlock" tone="green" title={t("unlockTitle")} subtitle={`${t("unlockSub")} · ${device.name}`} onClose={onClose}
      footer={<>
        <Button variant="ghost" onClick={onClose}>{t("cancel")}</Button>
        <Button variant="cy" disabled={!ok} onClick={onConfirm}><Icon name="unlock" />{t("confirmUnlock")}</Button>
      </>}>
      <label style={{ display: "flex", gap: 10, alignItems: "flex-start", padding: 12, border: "1px solid var(--go-border)", borderRadius: 10, cursor: "pointer", fontSize: 12.5 }}>
        <input type="checkbox" checked={ok} onChange={(e) => setOk(e.target.checked)} style={{ marginTop: 2, width: 15, height: 15, accentColor: "var(--go-cy)" }} />
        <span>{t("unlockConfirm")}</span>
      </label>
    </Modal>
  );
}

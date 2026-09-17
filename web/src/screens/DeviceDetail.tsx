import { useState } from "react";
import {
  Panel, PanelHeader, Field, Button, Icon, Modal, Warn, LostModePreview,
  Label, Select, Textarea, Input,
} from "@golden-one/ui";
import type { ApiRole } from "../api/types.js";
import type { Device, AuditEntry } from "../types.js";
import { can } from "../types.js";
import type { makeT } from "../i18n.js";
import type { ApiPaymentMethod } from "../api/types.js";
import { PaymentModal } from "./PaymentModal.js";
import { loanBadge, mdmBadge, lockBadge, fmtSince, actionLabel, actionStyle, isPending } from "../helpers.js";

type T = ReturnType<typeof makeT>;
const DEFAULT_MSG =
  "Устройство заблокировано в связи с просрочкой платежа. Для разблокировки обратитесь в Golden One.";
const DEFAULT_PHONE = "+998 71 200-00-00";

export function DeviceDetail({ t, device, audit, role, onBack, onLock, onUnlock, onCommand, onPayment }: {
  t: T;
  device: Device;
  audit: AuditEntry[];
  role: ApiRole;
  onBack: () => void;
  onLock: (input: { message: string; phone: string; reason?: string }) => void;
  onUnlock: (reason?: string) => void;
  onCommand: (kind: "locate" | "sound") => void;
  onPayment: (input: { amount: number; method: ApiPaymentMethod; note?: string }) => void;
}) {
  const [modal, setModal] = useState<"lock" | "unlock" | "payment" | null>(null);
  const mayLock = can(role, "device:lock");
  const mayCommand = can(role, "device:command");
  const mayTakePayment = can(role, "contract:payment");
  const pending = isPending(device.lock);

  const info: [string, React.ReactNode][] = [
    ["fModel", device.model],
    ["fSerial", <span className="go-mono">{device.serial}</span>],
    ["fImei", <span className="go-mono">{device.imei}</span>],
    ["fOs", device.ios],
    ["fSup", device.supervised ? "Supervised ✓" : "—"],
    ["fEnroll", mdmBadge(device.mdm, t)],
    ["fLastSeen2", fmtSince(device.lastSeenAt, t)],
  ];
  const loan: [string, React.ReactNode][] = [
    ["fContract", <span className="go-mono">{device.contract}</span>],
    ["fAmount", <span><span className="go-mono">{device.amount}</span> сум</span>],
    ["fMonthly", <span><span className="go-mono">{device.monthly}</span> сум</span>],
    ["fPaid", <span><span className="go-mono">{device.paid}</span> сум</span>],
    ["fNext", <span className="go-mono">{device.next}</span>],
    // Only shown when there is something to clear: a zero here would read as a
    // debt rather than as "nothing outstanding".
    ...(device.arrearsValue > 0
      ? ([["fArrears", <span className="go-over"><span className="go-mono">{device.arrears}</span> сум</span>]] as [string, React.ReactNode][])
      : []),
    ["fDays", device.daysOverdue > 0
      ? <span className={`go-over go-mono${device.daysOverdue >= 20 ? " go-over--hi" : ""}`}>
          {device.daysOverdue} {t("daysOverdue")}
        </span>
      : "—"],
  ];
  const history = audit.filter((a) => a.deviceId === device.id);

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
                  <span style={{ fontSize: 17, fontWeight: 700 }}>{device.name}</span>
                  {lockBadge(device.lock, t)}
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
              <h4 style={{ fontSize: 13, textTransform: "uppercase", letterSpacing: ".4px", marginBottom: 4 }}>
                {t("actionsTitle")}
              </h4>
              <p className="go-cm" style={{ marginBottom: 14 }}>{t("actionsHint")}</p>

              {/* The command is queued with the MDM but the phone has not
                  confirmed it. Say so plainly instead of letting the operator
                  assume the customer's phone is already locked. */}
              {pending && (
                <div style={{
                  display: "flex", gap: 9, alignItems: "flex-start", marginBottom: 14,
                  background: "var(--go-amber-soft)", color: "var(--go-amber)",
                  padding: "10px 12px", borderRadius: 9, fontSize: 12,
                }}>
                  <Icon name="warn" width={15} height={15} style={{ flexShrink: 0, marginTop: 1 }} />
                  <span>{device.lock === "lockPending" ? t("lockPendingHint") : t("unlockPendingHint")}</span>
                </div>
              )}

              {!mayLock && !mayCommand && !mayTakePayment ? (
                <div className="go-cm">{t("noAccess")}</div>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  {mayTakePayment && device.loan !== "paid" && (
                    <Button variant="ghost" block onClick={() => setModal("payment")}>
                      <Icon name="check" />{t("recordPayment")}
                    </Button>
                  )}
                  {mayLock && (
                    device.lock === "locked" || device.lock === "unlockPending" ? (
                      <Button variant="cy" block disabled={pending} onClick={() => setModal("unlock")}>
                        <Icon name="unlock" />{t("btnUnlock")}
                      </Button>
                    ) : (
                      <Button variant="red" block disabled={pending} onClick={() => setModal("lock")}>
                        <Icon name="lock" />{t("btnLock")}
                      </Button>
                    )
                  )}
                  {mayCommand && (
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                      <Button variant="ghost" onClick={() => onCommand("locate")}>
                        <Icon name="locate" />{t("btnLocate")}
                      </Button>
                      <Button variant="ghost" onClick={() => onCommand("sound")}>
                        <Icon name="sound" />{t("btnSound")}
                      </Button>
                    </div>
                  )}
                </div>
              )}
            </div>
          </Panel>

          <Panel>
            <PanelHeader title={t("cmdHistory")} />
            <div className="go-feed">
              {history.length ? history.map((a) => {
                const style = actionStyle(a.action);
                return (
                  <div className="go-ev" key={a.id}>
                    <div className="go-ev__ico" style={{
                      background: `color-mix(in srgb, var(${style.color}) 15%, transparent)`,
                      color: `var(${style.color})`,
                    }}>
                      <Icon name={style.icon as never} />
                    </div>
                    <div>
                      <div className="go-ev__t">{actionLabel(a.action, t)}</div>
                      <div className="go-ev__time">{a.who} · {fmtSince(a.createdAt, t)}</div>
                    </div>
                  </div>
                );
              }) : (
                <div style={{ padding: 30, textAlign: "center", color: "var(--go-faint)" }}>
                  {t("cmdHistoryEmpty")}
                </div>
              )}
            </div>
          </Panel>
        </div>
      </div>

      {modal === "lock" && (
        <LockModal t={t} device={device} onClose={() => setModal(null)}
          onConfirm={(o) => { setModal(null); onLock(o); }} />
      )}
      {modal === "payment" && (
        <PaymentModal t={t} device={device} onClose={() => setModal(null)}
          onConfirm={(input) => { setModal(null); onPayment(input); }} />
      )}
      {modal === "unlock" && (
        <UnlockModal t={t} device={device} onClose={() => setModal(null)}
          onConfirm={(reason) => { setModal(null); onUnlock(reason); }} />
      )}
    </div>
  );
}

function LockModal({ t, device, onClose, onConfirm }: {
  t: T; device: Device; onClose: () => void;
  onConfirm: (o: { message: string; phone: string; reason?: string }) => void;
}) {
  const [reason, setReason] = useState(t("reasonOverdue"));
  const [message, setMessage] = useState(DEFAULT_MSG);
  const [phone, setPhone] = useState(DEFAULT_PHONE);
  const valid = message.trim().length > 0 && phone.trim().length > 2;

  return (
    <Modal icon="lock" tone="red" title={t("lockTitle")} subtitle={`${t("lockSub")} · ${device.name}`}
      onClose={onClose}
      footer={<>
        <Button variant="ghost" onClick={onClose}>{t("cancel")}</Button>
        <Button variant="red" disabled={!valid}
          onClick={() => onConfirm({ message: message.trim(), phone: phone.trim(), reason })}>
          <Icon name="lock" />{t("confirmLock")}
        </Button>
      </>}>
      <Warn>{t("lockWarn")}</Warn>
      <div style={{ marginBottom: 12 }}>
        <Label>{t("lockReason")}</Label>
        <Select value={reason} onChange={(e) => setReason(e.target.value)}>
          <option>{t("reasonOverdue")}</option>
          <option>{t("reasonFraud")}</option>
          <option>{t("reasonOther")}</option>
        </Select>
      </div>
      <div style={{ marginBottom: 12 }}>
        <Label>{t("lockMsgLabel")}</Label>
        <Textarea value={message} onChange={(e) => setMessage(e.target.value)} />
      </div>
      <div style={{ marginBottom: 14 }}>
        <Label>{t("lockPhoneLabel")}</Label>
        <Input className="go-mono" value={phone} onChange={(e) => setPhone(e.target.value)} />
      </div>
      <LostModePreview title={t("previewTitle")} message={message} phone={phone} />
    </Modal>
  );
}

function UnlockModal({ t, device, onClose, onConfirm }: {
  t: T; device: Device; onClose: () => void; onConfirm: (reason?: string) => void;
}) {
  const [ok, setOk] = useState(false);
  return (
    <Modal icon="unlock" tone="green" title={t("unlockTitle")} subtitle={`${t("unlockSub")} · ${device.name}`}
      onClose={onClose}
      footer={<>
        <Button variant="ghost" onClick={onClose}>{t("cancel")}</Button>
        <Button variant="cy" disabled={!ok} onClick={() => onConfirm(t("unlockConfirm"))}>
          <Icon name="unlock" />{t("confirmUnlock")}
        </Button>
      </>}>
      <label style={{
        display: "flex", gap: 10, alignItems: "flex-start", padding: 12,
        border: "1px solid var(--go-border)", borderRadius: 10, cursor: "pointer", fontSize: 12.5,
      }}>
        <input type="checkbox" checked={ok} onChange={(e) => setOk(e.target.checked)}
          style={{ marginTop: 2, width: 15, height: 15, accentColor: "var(--go-cy)" }} />
        <span>{t("unlockConfirm")}</span>
      </label>
    </Modal>
  );
}

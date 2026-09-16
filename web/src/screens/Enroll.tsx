import { useState } from "react";
import { Panel, PanelHeader, Button, Icon, Label, Input, Select } from "@golden-one/ui";
import { api, ApiError } from "../api/index.js";
import type { makeT } from "../i18n.js";

type T = ReturnType<typeof makeT>;

interface Form {
  fullName: string; phone: string; doc: string;
  number: string; amount: string; monthly: string;
  model: string; serial: string; imei: string; ios: string;
}

const EMPTY: Form = {
  fullName: "", phone: "", doc: "",
  number: "", amount: "", monthly: "",
  model: "iPhone 15", serial: "", imei: "", ios: "17.5",
};

/** Only digits survive; the API requires exactly 15 for an IMEI. */
const digits = (v: string) => v.replace(/\D/g, "");

export function Enroll({ t, onEnrolled, onError }: {
  t: T;
  onEnrolled: (name: string) => Promise<void> | void;
  onError: (err: unknown) => void;
}) {
  const [form, setForm] = useState<Form>(EMPTY);
  const [busy, setBusy] = useState(false);
  const [fieldError, setFieldError] = useState<string | null>(null);

  const set = <K extends keyof Form>(key: K, value: Form[K]) =>
    setForm((f) => ({ ...f, [key]: value }));

  const steps = [t("eStep1"), t("eStep2"), t("eStep3"), t("eStep4")];

  async function submit() {
    if (busy) return;
    setFieldError(null);

    // Fail here rather than making the operator wait for a round trip to learn
    // the IMEI was a digit short.
    if (form.imei.length !== 15) {
      setFieldError("IMEI: 15 цифр");
      return;
    }
    if (!/^[A-Za-z0-9]{8,14}$/.test(form.serial)) {
      setFieldError("Serial: 8–14 символов");
      return;
    }

    setBusy(true);
    try {
      const device = await api.enroll({
        customer: { fullName: form.fullName.trim(), phone: form.phone.trim(), doc: form.doc.trim() },
        contract: {
          number: form.number.trim(),
          amount: Number(digits(form.amount) || 0),
          monthly: Number(digits(form.monthly) || 0),
        },
        device: {
          serial: form.serial.trim(),
          imei: form.imei,
          model: form.model,
          ios: form.ios.trim(),
        },
      });
      setForm(EMPTY);
      await onEnrolled(device.name);
    } catch (err) {
      // A 409 here usually means this phone is already financed — worth showing
      // verbatim rather than flattening to a generic failure.
      if (err instanceof ApiError && (err.status === 409 || err.status === 400)) {
        setFieldError(err.message);
      } else {
        onError(err);
      }
    } finally {
      setBusy(false);
    }
  }

  async function checkSupervision() {
    setFieldError(null);
    if (!form.serial.trim()) {
      setFieldError("Serial");
      return;
    }
    // The real check happens server-side during enrollment, against the MDM.
    setFieldError(t("eCheckHint"));
  }

  const complete =
    form.fullName && form.phone && form.doc && form.number &&
    form.amount && form.monthly && form.serial && form.imei;

  return (
    <div style={{ maxWidth: 660, display: "flex", flexDirection: "column", gap: 14 }}>
      <Panel>
        <PanelHeader title={t("enrollStep")} />
        <div style={{ padding: "16px 20px" }}>
          {steps.map((s, i) => (
            <div key={i} style={{ display: "flex", gap: 11, padding: "7px 0", alignItems: "center", color: "var(--go-muted)", fontSize: 12.5 }}>
              <span style={{ width: 22, height: 22, borderRadius: 6, background: "var(--go-cy-soft)", color: "var(--go-cy)", display: "grid", placeItems: "center", fontWeight: 700, flexShrink: 0, fontSize: 11 }}>
                {i + 1}
              </span>
              {s}
            </div>
          ))}
        </div>
      </Panel>

      <Panel>
        <div style={{ padding: 18 }}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <div><Label>{t("eCustomer")}</Label>
              <Input value={form.fullName} onChange={(e) => set("fullName", e.target.value)} placeholder="Фамилия Имя Отчество" /></div>
            <div><Label>{t("ePhone")}</Label>
              <Input value={form.phone} onChange={(e) => set("phone", e.target.value)} placeholder="+998 __ ___-__-__" /></div>
            <div><Label>Документ</Label>
              <Input className="go-mono" value={form.doc} onChange={(e) => set("doc", e.target.value)} placeholder="AA1234567" /></div>
            <div><Label>{t("eContract")}</Label>
              <Input className="go-mono" value={form.number} onChange={(e) => set("number", e.target.value)} placeholder="GO-2026-0001" /></div>
            <div><Label>{t("fAmount")}</Label>
              <Input className="go-mono" inputMode="numeric" value={form.amount}
                onChange={(e) => set("amount", e.target.value)} placeholder="9800000" /></div>
            <div><Label>{t("fMonthly")}</Label>
              <Input className="go-mono" inputMode="numeric" value={form.monthly}
                onChange={(e) => set("monthly", e.target.value)} placeholder="980000" /></div>
            <div><Label>{t("eModel")}</Label>
              <Select value={form.model} onChange={(e) => set("model", e.target.value)}>
                <option>iPhone 15</option><option>iPhone 15 Pro</option>
                <option>iPhone 14</option><option>iPhone 14 Pro</option><option>iPhone 13</option>
              </Select></div>
            <div><Label>iOS</Label>
              <Input className="go-mono" value={form.ios} onChange={(e) => set("ios", e.target.value)} placeholder="17.5" /></div>
            <div><Label>{t("eSerial")}</Label>
              <Input className="go-mono" value={form.serial}
                onChange={(e) => set("serial", e.target.value.toUpperCase())} placeholder="F2LW9K3QH1" /></div>
            <div><Label>{t("eImei")}</Label>
              <Input className="go-mono" inputMode="numeric" value={form.imei}
                onChange={(e) => set("imei", digits(e.target.value).slice(0, 15))} placeholder="356728111234567" />
              <div className="go-cm" style={{ marginTop: 4 }}>{form.imei.length}/15</div></div>
          </div>

          {fieldError && (
            <div role="alert" style={{
              marginTop: 12, background: "var(--go-amber-soft)", color: "var(--go-amber)",
              padding: "10px 12px", borderRadius: 9, fontSize: 12.5,
            }}>{fieldError}</div>
          )}

          <div style={{ display: "flex", gap: 9, marginTop: 14 }}>
            <Button variant="ghost" onClick={checkSupervision}>
              <Icon name="check" />{t("eCheck")}
            </Button>
            <Button variant="cy" disabled={!complete || busy} onClick={() => void submit()}>
              {busy ? t("loginPending") : t("eRegister")}
            </Button>
          </div>
        </div>
      </Panel>
    </div>
  );
}

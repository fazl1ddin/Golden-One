import { useState } from "react";
import { Modal, Button, Icon, Label, Input, Select, Warn } from "@golden-one/ui";
import type { ApiPaymentMethod } from "../api/types.js";
import type { Device } from "../types.js";
import type { makeT } from "../i18n.js";

type T = ReturnType<typeof makeT>;

/** Digits only: money here is whole so'm, never a float. */
const digits = (v: string) => v.replace(/\D/g, "");

export function PaymentModal({ t, device, onClose, onConfirm }: {
  t: T;
  device: Device;
  onClose: () => void;
  onConfirm: (input: { amount: number; method: ApiPaymentMethod; note?: string }) => void;
}) {
  // Default to what actually clears the arrears, not to one instalment: an
  // operator taking money from a customer whose phone is locked is trying to
  // release it, and one instalment on a two-month arrears does not.
  const [amount, setAmount] = useState(
    device.arrearsValue > 0 ? String(device.arrearsValue) : digits(device.monthly),
  );
  const [method, setMethod] = useState<ApiPaymentMethod>("CASH");
  const [note, setNote] = useState("");
  const value = Number(amount || 0);
  const valid = value > 0;

  // Only a payment that covers a full instalment moves the due date — say so
  // before the operator commits, so a part-payment is not mistaken for a
  // reason the lock will lift.
  const monthly = Number(digits(device.monthly));
  const partial = valid && monthly > 0 && value < monthly;
  // Enough to be more than a token payment, but still short of clearing the
  // arrears — so the phone stays locked. That is the case most likely to be
  // mistaken for "done", so it gets its own warning.
  const shortOfArrears =
    valid && !partial && device.arrearsValue > 0 && value < device.arrearsValue;

  return (
    <Modal
      icon="check"
      tone="green"
      title={t("recordPayment")}
      subtitle={`${device.name} · ${device.contract}`}
      onClose={onClose}
      footer={<>
        <Button variant="ghost" onClick={onClose}>{t("cancel")}</Button>
        <Button variant="cy" disabled={!valid}
          onClick={() => onConfirm({ amount: value, method, note: note.trim() || undefined })}>
          <Icon name="check" />{t("recordPayment")}
        </Button>
      </>}
    >
      <div style={{ marginBottom: 12 }}>
        <Label>{t("paymentAmount")}</Label>
        <Input
          className="go-mono"
          inputMode="numeric"
          autoFocus
          value={amount}
          onChange={(e) => setAmount(digits(e.target.value))}
        />
        <div className="go-cm" style={{ marginTop: 4 }}>
          {t("fMonthly")}: <span className="go-mono">{device.monthly}</span> сум
          {device.arrearsValue > 0 && (
            <> · {t("fArrears")}: <span className="go-mono go-over">{device.arrears}</span> сум</>
          )}
        </div>
      </div>

      <div style={{ marginBottom: 12 }}>
        <Label>{t("paymentMethod")}</Label>
        <Select value={method} onChange={(e) => setMethod(e.target.value as ApiPaymentMethod)}>
          <option value="CASH">{t("payCash")}</option>
          <option value="CARD">{t("payCard")}</option>
          <option value="TRANSFER">{t("payTransfer")}</option>
          <option value="OTHER">{t("payOther")}</option>
        </Select>
      </div>

      <div style={{ marginBottom: partial || shortOfArrears ? 12 : 0 }}>
        <Label>{t("paymentNote")}</Label>
        <Input value={note} onChange={(e) => setNote(e.target.value)} placeholder="Касса, филиал №2" />
      </div>

      {partial && <Warn>{t("partialPaymentWarn")}</Warn>}
      {shortOfArrears && <Warn>{t("shortOfArrearsWarn")}</Warn>}
    </Modal>
  );
}

import { LostModePreview } from "@golden-one/ui";

/** What the customer sees on the locked iPhone — the operator edits this live before confirming. */
export const Default = () => (
  <div style={{ maxWidth: 380 }}>
    <LostModePreview
      title="Устройство заблокировано"
      message="Устройство заблокировано в связи с просрочкой платежа. Для разблокировки обратитесь в Golden One."
      phone="+998 71 200-00-00"
    />
  </div>
);

/** Uzbek copy — the lock screen follows the customer's language, not the operator's. */
export const Uzbek = () => (
  <div style={{ maxWidth: 380 }}>
    <LostModePreview
      title="Qurilma bloklangan"
      message="To‘lov kechikishi sababli qurilma bloklandi. Blokdan chiqarish uchun Golden One bilan bog‘laning."
      phone="+998 71 200-00-00"
    />
  </div>
);

/** A short message keeps the phone number the first thing the customer reads. */
export const ShortMessage = () => (
  <div style={{ maxWidth: 380 }}>
    <LostModePreview
      title="Устройство заблокировано"
      message="Просрочка платежа. Позвоните нам."
      phone="+998 71 200-00-00"
    />
  </div>
);

import { Icon, Label, Input, Button } from "@golden-one/ui";

const NAMES = [
  "dash",
  "devices",
  "enroll",
  "audit",
  "settings",
  "lock",
  "unlock",
  "locate",
  "sound",
  "check",
  "warn",
  "search",
  "moon",
] as const;

const cell: React.CSSProperties = {
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  gap: 8,
  padding: "14px 6px",
  border: "1px solid var(--go-border)",
  borderRadius: 10,
  background: "var(--go-panel-2)",
};

const caption: React.CSSProperties = {
  fontSize: 10.5,
  textTransform: "uppercase",
  letterSpacing: ".5px",
  fontWeight: 600,
  color: "var(--go-faint)",
};

/** The complete `IconName` union, every glyph labelled — the reference sheet for the set. */
export const AllIcons = () => (
  <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: 10, maxWidth: 560 }}>
    {NAMES.map((name) => (
      <div key={name} style={cell}>
        <Icon name={name} width={22} height={22} style={{ color: "var(--go-text)" }} />
        <span style={{ ...caption, fontFamily: "var(--go-mono)" }}>{name}</span>
      </div>
    ))}
  </div>
);

/** `Icon` has no intrinsic size — `width`/`height` pass straight to the `<svg>`. */
export const Sizes = () => (
  <div style={{ display: "flex", gap: 26, alignItems: "flex-end" }}>
    {[14, 16, 20, 28, 40].map((s) => (
      <div key={s} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 10 }}>
        <Icon name="lock" width={s} height={s} style={{ color: "var(--go-red)" }} />
        <span style={{ ...caption, fontFamily: "var(--go-mono)" }}>{s}px</span>
      </div>
    ))}
  </div>
);

/** Glyphs inherit `currentColor`, so status tokens drive the whole meaning of the row. */
export const StatusColors = () => (
  <div style={{ display: "flex", flexDirection: "column", gap: 2, maxWidth: 400 }}>
    {[
      { name: "lock" as const, color: "var(--go-red)", text: "Заблокировано · Lost Mode активен", meta: "GO-2026-0184 · Рахимов Д. А." },
      { name: "unlock" as const, color: "var(--go-green)", text: "Разблокировано после оплаты", meta: "GO-2026-0001 · Юсупова Н. И." },
      { name: "warn" as const, color: "var(--go-amber)", text: "Просрочка 34 дня · 3 240 000 сўм", meta: "Уведомление отправлено 28.07" },
      { name: "check" as const, color: "var(--go-cy)", text: "Supervision подтверждён (Mosyle)", meta: "F2LXK9PQH7G4" },
      { name: "locate" as const, color: "var(--go-steel)", text: "Определено местоположение", meta: "Ташкент, Чиланзарский р-н" },
    ].map((r) => (
      <div key={r.name} style={{ display: "flex", gap: 11, alignItems: "center", padding: "10px 0", borderTop: "1px solid var(--go-border)" }}>
        <Icon name={r.name} width={18} height={18} style={{ color: r.color, flexShrink: 0 }} />
        <div>
          <div style={{ fontSize: 12.5, fontWeight: 650 }}>{r.text}</div>
          <div style={{ fontSize: 11, color: "var(--go-faint)", fontFamily: "var(--go-mono)" }}>{r.meta}</div>
        </div>
      </div>
    ))}
  </div>
);

/** Navigation set at rail size — the five glyphs that carry the console's main sections. */
export const NavigationSet = () => (
  <div style={{ display: "flex", gap: 6 }}>
    {[
      { name: "dash" as const, label: "Дашборд", on: true },
      { name: "devices" as const, label: "Устройства", on: false },
      { name: "enroll" as const, label: "Заведение", on: false },
      { name: "audit" as const, label: "Аудит", on: false },
      { name: "settings" as const, label: "Настройки", on: false },
    ].map((i) => (
      <div
        key={i.name}
        style={{
          width: 62,
          padding: "10px 0",
          borderRadius: 11,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: 5,
          fontSize: 9.5,
          fontWeight: 600,
          background: i.on ? "var(--go-cy-soft)" : "transparent",
          color: i.on ? "var(--go-cy)" : "var(--go-faint)",
        }}
      >
        <Icon name={i.name} width={19} height={19} />
        {i.label}
      </div>
    ))}
  </div>
);

/** In place: inside buttons and beside a field, where the icon must match the text size. */
export const InControls = () => (
  <div style={{ display: "flex", flexDirection: "column", gap: 14, maxWidth: 420 }}>
    <div style={{ display: "flex", gap: 9, flexWrap: "wrap" }}>
      <Button variant="red"><Icon name="lock" />Заблокировать</Button>
      <Button variant="ghost"><Icon name="locate" />Найти</Button>
      <Button variant="ghost"><Icon name="sound" />Звук</Button>
    </div>
    <div>
      <Label>Поиск по реестру устройств</Label>
      <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
        <Icon name="search" width={16} height={16} style={{ color: "var(--go-faint)", flexShrink: 0 }} />
        <Input placeholder="IMEI или номер договора GO-2026-…" />
      </div>
    </div>
  </div>
);

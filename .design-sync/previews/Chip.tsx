import { Chip, Panel, PanelHeader, Field, Badge } from "@golden-one/ui";

const noop = () => {};

/** The devices filter row — exactly one chip is `active`, the rest are quiet. */
export const FilterRow = () => (
  <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
    <Chip onClick={noop}>Все</Chip>
    <Chip active onClick={noop}>Просрочка</Chip>
    <Chip onClick={noop}>Заблокированы</Chip>
    <Chip onClick={noop}>Активные</Chip>
  </div>
);

/** The variant axis on its own: inactive (bordered panel) vs `active` (cyan wash, no border). */
export const States = () => (
  <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
    <Chip onClick={noop}>Заблокированы</Chip>
    <Chip active onClick={noop}>Заблокированы</Chip>
  </div>
);

/** Counts inline with the label — the operator picks a queue by size. */
export const WithCounts = () => (
  <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
    <Chip onClick={noop}>Все · 6</Chip>
    <Chip active onClick={noop}>Просрочка · 4</Chip>
    <Chip onClick={noop}>Заблокированы · 1</Chip>
    <Chip onClick={noop}>Погашены · 1</Chip>
  </div>
);

/** Uzbek filters — same row, interface language switched to UZ. */
export const Uzbek = () => (
  <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
    <Chip onClick={noop}>Barchasi</Chip>
    <Chip active onClick={noop}>Kechikish</Chip>
    <Chip onClick={noop}>Bloklangan</Chip>
    <Chip onClick={noop}>Faol</Chip>
  </div>
);

/** Above the table it filters — the chip row is the header of the devices list. */
export const AboveDeviceList = () => (
  <div style={{ display: "flex", flexDirection: "column", gap: 12, maxWidth: 400 }}>
    <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
      <Chip onClick={noop}>Все</Chip>
      <Chip active onClick={noop}>Просрочка</Chip>
      <Chip onClick={noop}>Заблокированы</Chip>
    </div>
    <Panel>
      <PanelHeader title="Просрочка" count={2} />
      <Field
        label={<span><span className="go-cn" style={{ color: "var(--go-text)" }}>Нигора Юсупова</span><br /><span className="go-mono go-cm">GO-2024-0389 · 24д</span></span>}
        value={<Badge tone="red">Заблокирован</Badge>}
      />
      <Field
        label={<span><span className="go-cn" style={{ color: "var(--go-text)" }}>Дилшод Рахимов</span><br /><span className="go-mono go-cm">GO-2024-0417 · 12д</span></span>}
        value={<Badge tone="green">Разблокирован</Badge>}
      />
    </Panel>
  </div>
);

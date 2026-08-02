import { KpiCard } from "@golden-one/ui";

const Row = ({ children, cols = 4 }: { children: React.ReactNode; cols?: number }) => (
  <div style={{ display: "grid", gridTemplateColumns: `repeat(${cols},1fr)`, gap: 12 }}>{children}</div>
);

/**
 * The dashboard KPI row, verbatim: portfolio size, healthy contracts,
 * overdue and currently locked. Tone escalates left → right.
 */
export const DashboardRow = () => (
  <Row>
    <KpiCard label="Всего устройств" value="1 284" sub="Supervised: 1 271" />
    <KpiCard label="Активные договоры" value="1 046" sub="Платежи по графику" tone="green" />
    <KpiCard label="Просрочка" value="187" sub="Более 3 дней" tone="amber" />
    <KpiCard label="Заблокировано" value="51" sub="Lost Mode включён" tone="red" />
  </Row>
);

/**
 * The tone axis on identical content — steel is the neutral default,
 * green/amber/red carry the collections severity via the left accent bar.
 */
export const Tones = () => (
  <Row>
    <KpiCard label="steel — нейтрально" value="1 284" sub="Устройств в парке" tone="steel" />
    <KpiCard label="green — норма" value="1 046" sub="Договоры без просрочки" tone="green" />
    <KpiCard label="amber — внимание" value="187" sub="Просрочка 3–20 дней" tone="amber" />
    <KpiCard label="red — критично" value="51" sub="Просрочка более 20 дней" tone="red" />
  </Row>
);

/**
 * Money KPIs — long monospace so'm figures still fit and stay aligned.
 */
export const MoneyValues = () => (
  <Row cols={3}>
    <KpiCard label="Портфель" value="14,8 млрд" sub="сум · 1 284 договора" />
    <KpiCard label="Просроченная задолженность" value="612 млн" sub="сум · 187 договоров" tone="amber" />
    <KpiCard label="Собрано за август" value="1,93 млрд" sub="сум · план 2,10 млрд" tone="green" />
  </Row>
);

/**
 * Without `sub` — a compact strip used in the PoS enrollment screen where
 * the label alone is enough context.
 */
export const NoSubtitle = () => (
  <Row>
    <KpiCard label="Заведено сегодня" value="23" />
    <KpiCard label="Supervised ✓" value="23" tone="green" />
    <KpiCard label="Ожидают профиль" value="2" tone="amber" />
    <KpiCard label="Ошибка enrollment" value="0" tone="red" />
  </Row>
);

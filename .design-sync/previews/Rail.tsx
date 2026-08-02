import { Rail, type RailItem } from "@golden-one/ui";

const noop = () => {};

/**
 * The rail is a full-height column in a `78px` grid track. Previews must give it
 * a real height and that track width, otherwise it collapses to its own content
 * and reads nothing like the shell. Composition only — no component API involved.
 */
const Column = ({ children, height = 420 }: { children: React.ReactNode; height?: number }) => (
  <div style={{ height, display: "grid", gridTemplateColumns: "78px", alignItems: "stretch" }}>
    {children}
  </div>
);

const nav: RailItem[] = [
  { id: "dashboard", label: "Дашборд", icon: "dash" },
  { id: "devices", label: "Устройства", icon: "devices" },
  { id: "enroll", label: "Заведение", icon: "enroll" },
  { id: "audit", label: "Аудит", icon: "audit" },
  { id: "settings", label: "Настройки", icon: "settings" },
];

/** Операторский аватар — постоянный «подвал» рейла под навигацией. */
const OperatorAvatar = () => (
  <div
    style={{
      width: 38,
      height: 38,
      borderRadius: 11,
      background: "linear-gradient(135deg,#2c3444,#1c2230)",
      display: "grid",
      placeItems: "center",
      fontWeight: 700,
      fontSize: 12,
    }}
  >
    АК
  </div>
);

/** Канонический рейл консоли: бренд-марка, пять разделов, аватар оператора внизу. */
export const Default = () => (
  <Column>
    <Rail items={nav} active="dashboard" onSelect={noop} footer={<OperatorAvatar />} />
  </Column>
);

/** Счётчик просрочки на «Устройствах» — сколько договоров ждут решения оператора взыскания. */
export const WithOverdueBadge = () => (
  <Column>
    <Rail
      items={[
        nav[0],
        { id: "devices", label: "Устройства", icon: "devices", badge: 7 },
        nav[2],
        nav[3],
        nav[4],
      ]}
      active="devices"
      onSelect={noop}
      footer={<OperatorAvatar />}
    />
  </Column>
);

/** Активный раздел смещён вниз: подсветка идёт за выбором, а не за позицией. */
export const AuditActive = () => (
  <Column>
    <Rail items={nav} active="audit" onSelect={noop} footer={<OperatorAvatar />} />
  </Column>
);

/** Оператор точки продаж: без прав взыскания видит только «Заведение» и «Настройки». */
export const PosOperatorScope = () => (
  <Column height={300}>
    <Rail
      brand="PoS"
      items={[
        { id: "enroll", label: "Заведение", icon: "enroll" },
        { id: "settings", label: "Настройки", icon: "settings" },
      ]}
      active="enroll"
      onSelect={noop}
    />
  </Column>
);

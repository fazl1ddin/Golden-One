import { Input, Label, Icon, Panel, PanelHeader, Button } from "@golden-one/ui";

/**
 * `Input` spreads native props *after* its own `className`, so passing
 * `className` replaces `go-input` and the control loses all DS styling.
 * Identifier fields therefore ask for the mono stack via `style` instead.
 */
const mono = { fontFamily: "var(--go-mono)", fontVariantNumeric: "tabular-nums" } as const;

const Field = ({ label, children }: { label: string; children: React.ReactNode }) => (
  <div>
    <Label>{label}</Label>
    {children}
  </div>
);

/** The PoS enrollment form — the canonical labelled two-column field grid, filled in. */
export const EnrollmentFields = () => (
  <div style={{ maxWidth: 560 }}>
    <Panel>
      <PanelHeader title="Заведение устройства" />
      <div style={{ padding: 18 }}>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
          <Field label="Клиент">
            <Input defaultValue="Рахимов Дилшод Абдуллаевич" />
          </Field>
          <Field label="Телефон">
            <Input style={mono} defaultValue="+998 90 123-45-67" />
          </Field>
          <Field label="Номер договора">
            <Input style={mono} defaultValue="GO-2026-0184" />
          </Field>
          <Field label="Сумма рассрочки">
            <Input style={mono} defaultValue="14 990 000 сўм" />
          </Field>
          <Field label="Серийный номер">
            <Input style={mono} defaultValue="F2LXK9PQH7G4" />
          </Field>
          <Field label="IMEI">
            <Input style={mono} defaultValue="35 692104 774318 2" />
          </Field>
        </div>
        <div style={{ display: "flex", gap: 9, marginTop: 14 }}>
          <Button variant="ghost"><Icon name="check" width={15} height={15} />Проверить supervision</Button>
          <Button variant="cy">Зарегистрировать</Button>
        </div>
      </div>
    </Panel>
  </div>
);

/** Placeholder vs. entered value — the same fields before and after the operator types. */
export const EmptyAndFilled = () => (
  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 22, maxWidth: 560 }}>
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: ".4px", color: "var(--go-faint)", textTransform: "uppercase" }}>Пустое</div>
      <Field label="Клиент">
        <Input placeholder="Фамилия Имя Отчество" />
      </Field>
      <Field label="Телефон">
        <Input style={mono} placeholder="+998 __ ___-__-__" />
      </Field>
      <Field label="Номер договора">
        <Input style={mono} placeholder="GO-2026-____" />
      </Field>
    </div>
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: ".4px", color: "var(--go-faint)", textTransform: "uppercase" }}>Заполнено</div>
      <Field label="Клиент">
        <Input defaultValue="Юсупова Нигора Икромовна" />
      </Field>
      <Field label="Телефон">
        <Input style={mono} defaultValue="+998 93 447-11-08" />
      </Field>
      <Field label="Номер договора">
        <Input style={mono} defaultValue="GO-2026-0001" />
      </Field>
    </div>
  </div>
);

/** Device identifiers use the tabular mono stack so serials and IMEIs stay scannable. */
export const MonoIdentifiers = () => (
  <div style={{ display: "flex", flexDirection: "column", gap: 12, maxWidth: 340 }}>
    <Field label="Серийный номер">
      <Input style={mono} defaultValue="DNPXJ4R8N72M" />
    </Field>
    <Field label="IMEI">
      <Input style={mono} defaultValue="35 401277 903155 6" />
    </Field>
    <Field label="Телефон для экрана блокировки">
      <Input style={mono} defaultValue="+998 71 200-00-00" />
    </Field>
    <Field label="Остаток задолженности">
      <Input style={mono} defaultValue="3 240 000 сўм" />
    </Field>
  </div>
);

/** Search over the device register — an icon sits beside the field, not inside it. */
export const SearchField = () => (
  <div style={{ maxWidth: 420 }}>
    <Label>Поиск по устройствам</Label>
    <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
      <Icon name="search" width={16} height={16} style={{ color: "var(--go-faint)", flexShrink: 0 }} />
      <Input type="search" placeholder="IMEI, серийный номер или номер договора" />
    </div>
  </div>
);

/** Read-only and disabled: contract data is frozen once the loan is closed. */
export const DisabledAndReadOnly = () => (
  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, maxWidth: 520 }}>
    <Field label="Номер договора (только чтение)">
      <Input style={mono} readOnly defaultValue="GO-2025-0917" />
    </Field>
    <Field label="Клиент (только чтение)">
      <Input readOnly defaultValue="Тошматов Азиз Улугбекович" />
    </Field>
    <Field label="IMEI (договор закрыт)">
      <Input style={mono} disabled defaultValue="35 118764 220043 9" />
    </Field>
    <Field label="Сумма к оплате (договор закрыт)">
      <Input style={mono} disabled defaultValue="0 сўм" />
    </Field>
  </div>
);

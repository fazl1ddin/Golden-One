import { Label, Input, Select, Textarea, Panel, PanelHeader } from "@golden-one/ui";

const mono = { fontFamily: "var(--go-mono)", fontVariantNumeric: "tabular-nums" } as const;

/** The atom: an uppercase caption sitting directly above the control it names. */
export const LabelledField = () => (
  <div style={{ display: "flex", flexDirection: "column", gap: 14, maxWidth: 340 }}>
    <div>
      <Label>Клиент</Label>
      <Input defaultValue="Рахимов Дилшод Абдуллаевич" />
    </div>
    <div>
      <Label>Номер договора</Label>
      <Input style={mono} defaultValue="GO-2026-0184" />
    </div>
  </div>
);

/** One caption style across all three controls — Input, Select and Textarea line up identically. */
export const AcrossControls = () => (
  <div style={{ display: "flex", flexDirection: "column", gap: 14, maxWidth: 400 }}>
    <div>
      <Label>Телефон клиента</Label>
      <Input style={mono} defaultValue="+998 90 123-45-67" />
    </div>
    <div>
      <Label>Причина блокировки</Label>
      <Select defaultValue="Просрочка платежа 34 дня">
        <option>Просрочка платежа 34 дня</option>
        <option>Подозрение на мошенничество</option>
      </Select>
    </div>
    <div>
      <Label>Сообщение на экране блокировки</Label>
      <Textarea defaultValue="Устройство заблокировано в связи с просрочкой платежа. Для разблокировки обратитесь в Golden One." />
    </div>
  </div>
);

/** The enrollment field grid — labels keep a dense two-column form readable. */
export const FieldGrid = () => (
  <div style={{ maxWidth: 560 }}>
    <Panel>
      <PanelHeader title="Заведение устройства" />
      <div style={{ padding: 18, display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
        <div>
          <Label>Клиент</Label>
          <Input placeholder="Фамилия Имя Отчество" />
        </div>
        <div>
          <Label>Телефон</Label>
          <Input style={mono} placeholder="+998 __ ___-__-__" />
        </div>
        <div>
          <Label>Номер договора</Label>
          <Input style={mono} placeholder="GO-2026-____" />
        </div>
        <div>
          <Label>Модель iPhone</Label>
          <Select defaultValue="iPhone 15 Pro">
            <option>iPhone 15</option>
            <option>iPhone 15 Pro</option>
            <option>iPhone 14</option>
            <option>iPhone 13</option>
          </Select>
        </div>
        <div>
          <Label>Серийный номер</Label>
          <Input style={mono} placeholder="XXXXXXXXXX" />
        </div>
        <div>
          <Label>IMEI</Label>
          <Input style={mono} placeholder="35 XXXXXX XXXXXX X" />
        </div>
      </div>
    </Panel>
  </div>
);

/** Long captions wrap rather than truncate — worth checking for the Uzbek locale. */
export const LongCaptions = () => (
  <div style={{ display: "grid", gridTemplateColumns: "180px 180px", gap: 12 }}>
    <div>
      <Label>Остаток задолженности по договору</Label>
      <Input style={mono} defaultValue="3 240 000 сўм" />
    </div>
    <div>
      <Label>Shartnoma bo'yicha qarzdorlik qoldig'i</Label>
      <Input style={mono} defaultValue="3 240 000 so'm" />
    </div>
  </div>
);

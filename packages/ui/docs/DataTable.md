---
category: Data
---

# DataTable

The dense operator table. Generic over the row type: define `columns` with a `render` per cell, give a stable `rowKey`, and pass `onRowClick` to drill into a record.

```tsx
const columns: Column<Device>[] = [
  { key: "cust", header: "Клиент", render: d => <div className="go-cn">{d.name}</div> },
  { key: "imei", header: "IMEI", render: d => <span className="go-mono go-cm">{d.imei}</span> },
  { key: "lock", header: "Блок", render: d => <Badge tone={d.locked ? "red" : "green"}>…</Badge> },
];
<DataTable columns={columns} rows={devices} rowKey={d => d.id} onRowClick={open} />
```

Rows are only interactive when `onRowClick` is set. Put identifiers (IMEI, contract, serial) in `go-mono` so digits line up.

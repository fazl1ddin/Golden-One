import { useState, type FormEvent } from "react";
import { Button, Input, Label, Panel, ThemeProvider, LangSwitch } from "@golden-one/ui";
import { ApiError } from "../api/index.js";
import { makeT, type Lang } from "../i18n.js";

export function Login({
  lang,
  setLang,
  onSignIn,
}: {
  lang: Lang;
  setLang: (l: Lang) => void;
  onSignIn: (email: string, password: string) => Promise<void>;
}) {
  const t = makeT(lang);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (busy) return;
    setBusy(true);
    setError(null);
    try {
      await onSignIn(email, password);
    } catch (err) {
      // The API answers identically for a wrong password and an unknown
      // account; surfacing its message keeps that property intact.
      setError(
        err instanceof ApiError
          ? err.code === "NETWORK_ERROR"
            ? t("errNetwork")
            : err.message
          : t("errGeneric"),
      );
      setBusy(false);
    }
  }

  return (
    <ThemeProvider theme="dark">
      <div style={{ minHeight: "100vh", display: "grid", placeItems: "center", padding: 20 }}>
        <div style={{ width: "100%", maxWidth: 380 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 22 }}>
            <div
              style={{
                width: 42,
                height: 42,
                borderRadius: 12,
                background: "linear-gradient(135deg,var(--go-cy),var(--go-cy-dim))",
                display: "grid",
                placeItems: "center",
                color: "#04211e",
                fontWeight: 800,
                fontSize: 16,
              }}
            >
              G1
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 17, fontWeight: 700 }}>{t("loginTitle")}</div>
              <div style={{ fontSize: 12, color: "var(--go-faint)" }}>{t("loginSubtitle")}</div>
            </div>
            <LangSwitch value={lang} onChange={(v) => setLang(v as Lang)} />
          </div>

          <Panel>
            <form onSubmit={submit} style={{ padding: 20, display: "flex", flexDirection: "column", gap: 14 }}>
              <div>
                <Label>{t("loginEmail")}</Label>
                <Input
                  type="email"
                  autoComplete="username"
                  autoFocus
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="operator@golden.one"
                />
              </div>
              <div>
                <Label>{t("loginPassword")}</Label>
                <Input
                  type="password"
                  autoComplete="current-password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
              </div>

              {error && (
                <div
                  role="alert"
                  style={{
                    background: "var(--go-red-soft)",
                    color: "var(--go-red)",
                    padding: "10px 12px",
                    borderRadius: 9,
                    fontSize: 12.5,
                  }}
                >
                  {error}
                </div>
              )}

              <Button type="submit" variant="cy" block disabled={busy}>
                {busy ? t("loginPending") : t("loginSubmit")}
              </Button>
            </form>
          </Panel>
        </div>
      </div>
    </ThemeProvider>
  );
}

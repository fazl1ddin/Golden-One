import { Icon } from "./icons";

/** Live preview of the iPhone Lost Mode lock screen the customer will see. */
export function LostModePreview({ title, message, phone }: { title: string; message: string; phone: string }) {
  return (
    <div className="go-lost">
      <div className="go-lost__k"><Icon name="lock" /></div>
      <div className="go-lost__t">{title}</div>
      <div className="go-lost__m">{message}</div>
      <div className="go-lost__p">{phone}</div>
    </div>
  );
}

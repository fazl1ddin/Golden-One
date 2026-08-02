import type { SVGProps } from "react";

const paths: Record<string, string> = {
  dash: "M3 13h8V3H3v10Zm0 8h8v-6H3v6Zm10 0h8V11h-8v10Zm0-18v6h8V3h-8Z",
  devices: "M5 2h14a1 1 0 0 1 1 1v18a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V3a1 1 0 0 1 1-1Z",
  enroll: "M5 2h14a1 1 0 0 1 1 1v18a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V3a1 1 0 0 1 1-1ZM12 8v6M9 11h6",
  audit: "M4 4h16v16H4zM8 9h8M8 13h8M8 17h5",
  settings: "M12 9a3 3 0 1 0 0 6 3 3 0 0 0 0-6ZM4 12h2M18 12h2M12 4v2M12 18v2M6 6l1.5 1.5M16.5 16.5 18 18M18 6l-1.5 1.5M7.5 16.5 6 18",
  lock: "M4 10h16v11H4zM8 10V7a4 4 0 0 1 8 0v3",
  unlock: "M4 10h16v11H4zM8 10V7a4 4 0 0 1 7.5-2",
  locate: "M12 22s7-6.2 7-12a7 7 0 1 0-14 0c0 5.8 7 12 7 12ZM12 7.5a2.5 2.5 0 1 0 0 5 2.5 2.5 0 0 0 0-5Z",
  sound: "M11 5 6 9H3v6h3l5 4V5ZM16 9a4 4 0 0 1 0 6",
  check: "M20 6 9 17l-5-5",
  warn: "M12 9v4M12 17h.01M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0Z",
  search: "M11 3a8 8 0 1 0 0 16 8 8 0 0 0 0-16ZM21 21l-4.3-4.3",
  moon: "M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z",
};

export type IconName = keyof typeof paths;

/**
 * An icon from the system's set. Sized by its context inside `Button`, `Badge`
 * and the shell (CSS wins over these presentation attributes); standing alone it
 * falls back to `1em` instead of the SVG default of 300×150.
 */
export function Icon({ name, ...props }: { name: IconName } & SVGProps<SVGSVGElement>) {
  return (
    <svg
      viewBox="0 0 24 24"
      width="1em"
      height="1em"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      {...props}
    >
      {paths[name].split("M").filter(Boolean).map((seg, i) => (
        <path key={i} d={"M" + seg} />
      ))}
    </svg>
  );
}

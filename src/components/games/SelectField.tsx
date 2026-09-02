import { type ReactNode } from "react";
import { ChevronDown } from "lucide-react";

type Option = {
  value: string;
  label: string;
};

type Props = {
  label: string;
  icon?: ReactNode;
  accent?: string;
  value: string;
  onChange: (value: string) => void;
  options: Option[];
  disabled?: boolean;
};

/**
 * Consistent, accent-aware select input used across every game's setup card.
 * Wraps a native <select> to keep behaviour reliable across browsers.
 */
export default function SelectField({
  label,
  icon,
  accent = "var(--neon)",
  value,
  onChange,
  options,
  disabled,
}: Props) {
  return (
    <label className="block">
      <span
        className="mb-2 flex items-center gap-2 text-sm font-extrabold tracking-wider text-white/70 uppercase sm:text-base"
      >
        {icon ? (
          <span className="[&_svg]:size-3.5" style={{ color: accent }}>
            {icon}
          </span>
        ) : null}
        {label}
      </span>
      <div
        className="relative rounded-2xl border transition-shadow focus-within:ring-2"
        style={{
          borderColor: `${accent}55`,
          background: "rgba(0,0,0,0.35)",
        }}
      >
        <select
          disabled={disabled}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="h-14 w-full appearance-none rounded-2xl bg-transparent px-4 pe-10 text-lg font-extrabold text-white outline-none disabled:cursor-not-allowed disabled:opacity-60 sm:h-[3.75rem] sm:text-xl"
        >
          {options.map((o) => (
            <option key={o.value} value={o.value} className="bg-[#12102b] text-white">
              {o.label}
            </option>
          ))}
        </select>
        <ChevronDown
          className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 opacity-70"
          style={{ color: accent }}
        />
      </div>
    </label>
  );
}

import React from "react";
import { getIcon } from "../../constants";

interface Props {
  icon: string;
  color: string;
  size?: "sm" | "md" | "lg";
  /** Subcategoria: ícone menor com anel sutil */
  variant?: "parent" | "child";
  className?: string;
}

const SIZE_MAP = {
  sm: { box: "w-8 h-8", icon: 14 },
  md: { box: "w-11 h-11", icon: 20 },
  lg: { box: "w-12 h-12", icon: 22 },
} as const;

/**
 * Avatar estilo Mobills: círculo sólido + ícone branco.
 */
export const CategoryAvatar: React.FC<Props> = ({
  icon,
  color,
  size = "md",
  variant = "parent",
  className = "",
}) => {
  const Icon = getIcon(icon);
  const dim = variant === "child" ? SIZE_MAP.sm : SIZE_MAP[size];
  const bg = color || "#64748b";

  return (
    <div
      className={`${dim.box} rounded-full flex items-center justify-center shrink-0 text-white shadow-sm ${
        variant === "child" ? "ring-2 ring-white/80 ring-offset-1 ring-offset-slate-100" : ""
      } ${className}`}
      style={{ backgroundColor: bg }}
      aria-hidden
    >
      <Icon size={dim.icon} className="text-white" strokeWidth={2.4} />
    </div>
  );
};

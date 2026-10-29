import React from "react";
import { getIcon } from "../../src/constants/icons";

export type CategoryIconSize = "sm" | "md" | "lg" | number;

interface CategoryIconProps {
  iconName: string;
  color?: string;
  size?: CategoryIconSize;
  className?: string;
  /** Variante visual para subcategoria (anel sutil) */
  variant?: "parent" | "child";
}

const SIZE_PRESETS = {
  sm: { box: "w-8 h-8 p-1.5", icon: 14 },
  md: { box: "w-10 h-10 p-2.5", icon: 18 },
  lg: { box: "w-12 h-12 p-2.5", icon: 22 },
} as const;

/**
 * Ícone de categoria estilo Mobills:
 * bolinha colorida + ícone branco em vetor limpo.
 * Fallback: Folder quando o nome não existe.
 */
export const CategoryIcon: React.FC<CategoryIconProps> = ({
  iconName,
  color = "#64748b",
  size = "md",
  className = "",
  variant = "parent",
}) => {
  const Icon = getIcon(iconName);

  const preset =
    typeof size === "number"
      ? {
          box: "rounded-full p-2.5 flex items-center justify-center",
          icon: size,
          style: {
            width: size * 2.2,
            height: size * 2.2,
            minWidth: size * 2.2,
          } as React.CSSProperties,
        }
      : {
          box: `${SIZE_PRESETS[size].box} rounded-full flex items-center justify-center`,
          icon: SIZE_PRESETS[size].icon,
          style: undefined as React.CSSProperties | undefined,
        };

  return (
    <div
      className={`${preset.box} shrink-0 text-white shadow-sm ${
        variant === "child"
          ? "ring-2 ring-white/80 ring-offset-1 ring-offset-slate-100"
          : ""
      } ${className}`}
      style={{
        backgroundColor: color,
        ...preset.style,
      }}
      aria-hidden
    >
      <Icon
        size={preset.icon}
        className="text-white"
        strokeWidth={2.4}
        style={{ color: "#fff" }}
      />
    </div>
  );
};

export default CategoryIcon;

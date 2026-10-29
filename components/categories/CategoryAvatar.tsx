import React from "react";
import { CategoryIcon } from "../ui/CategoryIcon";

interface Props {
  icon: string;
  color: string;
  size?: "sm" | "md" | "lg";
  /** Subcategoria: ícone menor com anel sutil */
  variant?: "parent" | "child";
  className?: string;
}

/**
 * Avatar estilo Mobills: círculo sólido + ícone branco.
 * Delega para CategoryIcon (biblioteca expandida).
 */
export const CategoryAvatar: React.FC<Props> = ({
  icon,
  color,
  size = "md",
  variant = "parent",
  className = "",
}) => (
  <CategoryIcon
    iconName={icon}
    color={color}
    size={size}
    variant={variant}
    className={className}
  />
);

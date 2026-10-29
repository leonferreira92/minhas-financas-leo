import React from "react";
import { Category } from "../../types";
import {
  getEssentialityOption,
  resolveCategoryEssentiality,
} from "../../services/categoryEssentiality";

interface Props {
  category: Category;
  compact?: boolean;
}

export const EssentialityBadge: React.FC<Props> = ({
  category,
  compact = false,
}) => {
  const ess = resolveCategoryEssentiality(category);
  const opt = getEssentialityOption(ess);

  if (compact) {
    return (
      <span
        className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md text-[9px] font-black uppercase tracking-wide border ${opt.badge}`}
        title={opt.label}
      >
        <span className={`w-1.5 h-1.5 rounded-full ${opt.dot}`} aria-hidden />
        {opt.shortLabel}
      </span>
    );
  }

  return (
    <span
      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold border ${opt.badge}`}
      title={opt.description}
    >
      <span aria-hidden>{opt.emoji}</span>
      {opt.label}
    </span>
  );
};

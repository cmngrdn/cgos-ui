/**
 * THE DRIVE BUTTON (One Record P.5 §3, D4 + D5): the one control for every door that leaves HQ for Google Drive — never a
 * generic ↗. Three variants: `glass` (the mono mark on a quiet glass square — the default: Drive rows, document cards, a
 * tile's hover verb), `brand` (the real tri-colour mark on the same glass — where the button is the one Drive door on
 * the screen) and `words` (mark · Open in Drive · ↗ — section asides, where a word earns its space). Four sizes:
 * xs 24 · sm 28 · md 32 · touch 44. Built on cgos-ui's IconButton (glass, brand) and Button (words) so the states,
 * the focus ring and the coarse-pointer hit area are the atoms' own; `DriveButton.css` adds only the glass and the
 * sizes. Pure — no fetch.
 *
 * Hoisted from cmngrdn (v0.97.0, Feather's walk 2026-11-21: "one canonical cgos-ui atom"). The brand mark is the official
 * Google Drive logo as an inline SVG asset — a third party's colours are data (like `BRAND_META`), never a token or a
 * style prop. Theme its inks with `--cg-drive-ink` · `--cg-drive-ink-strong` · `--cg-drive-ink-quiet` on any ancestor.
 */
import { ArrowSquareOut } from "@phosphor-icons/react";
import type { MouseEvent } from "react";
import { Button } from "./Button";
import { IconButton } from "./IconButton";
import { SocialBrandIcon } from "./SocialBrandIcon";
import "./DriveButton.css";

export type DriveButtonVariant = "glass" | "brand" | "words";
export type DriveButtonSize = "xs" | "sm" | "md" | "touch";

export type DriveButtonProps = {
  /** the door: a full link, a folder by its id, or a file by its id (the first given wins) */
  href?: string | null;
  folderId?: string | null;
  fileId?: string | null;
  /** what opens — the label says `Open <what> in Drive` */
  what?: string;
  variant?: DriveButtonVariant;
  size?: DriveButtonSize;
  /** the words variant's words (default "Open in Drive") */
  words?: string;
  className?: string;
  disabled?: boolean;
  /** runs before the door opens (a tile that must not also select, say); the click never reaches the row behind */
  onClick?: (e: MouseEvent<HTMLElement>) => void;
};

/** the Drive address for a folder or a file id */
export function driveHref(p: { href?: string | null; folderId?: string | null; fileId?: string | null }): string | null {
  if (p.href) return p.href;
  if (p.folderId) return `https://drive.google.com/drive/folders/${p.folderId}`;
  if (p.fileId) return `https://drive.google.com/file/d/${p.fileId}/view`;
  return null;
}

const ICON_SIZE: Record<DriveButtonSize, "sm" | "chip" | "md" | "lg"> = { xs: "sm", sm: "chip", md: "md", touch: "lg" };
const BUTTON_SIZE: Record<DriveButtonSize, "xs" | "chip" | "sm" | "md"> = { xs: "xs", sm: "chip", md: "sm", touch: "md" };
const MARK: Record<DriveButtonSize, number> = { xs: 12, sm: 14, md: 15, touch: 18 };

/** the official Google Drive mark (brand colours in the asset — never in a style prop) */
export function DriveBrandMark({ size = 16 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 87.3 78" aria-hidden focusable={false} data-cg-brand="drive">
      <path d="m6.6 66.85 3.85 6.65c.8 1.4 1.95 2.5 3.3 3.3l13.75-23.8h-27.5c0 1.55.4 3.1 1.2 4.5z" fill="#0066da" />
      <path d="m43.65 25-13.75-23.8c-1.35.8-2.5 1.9-3.3 3.3l-25.4 44a9.06 9.06 0 0 0-1.2 4.5h27.5z" fill="#00ac47" />
      <path d="m73.55 76.8c1.35-.8 2.5-1.9 3.3-3.3l1.6-2.75 7.65-13.25c.8-1.4 1.2-2.95 1.2-4.5h-27.502l5.852 11.5z" fill="#ea4335" />
      <path d="m43.65 25 13.75-23.8c-1.35-.8-2.9-1.2-4.5-1.2h-18.5c-1.6 0-3.15.45-4.5 1.2z" fill="#00832d" />
      <path d="m59.8 53h-32.3l-13.75 23.8c1.35.8 2.9 1.2 4.5 1.2h50.8c1.6 0 3.15-.45 4.5-1.2z" fill="#2684fc" />
      <path d="m73.4 26.5-12.7-22c-.8-1.4-1.95-2.5-3.3-3.3l-13.75 23.8 16.15 28h27.45c0-1.55-.4-3.1-1.2-4.5z" fill="#ffba00" />
    </svg>
  );
}

export function DriveButton({ href, folderId, fileId, what, variant = "glass", size = "md", words = "Open in Drive", className, disabled, onClick }: DriveButtonProps) {
  const to = driveHref({ href, folderId, fileId });
  if (!to) return null;
  const label = what ? `Open ${what} in Drive` : "Open in Drive";
  const mark = variant === "brand" ? <DriveBrandMark size={MARK[size]} /> : <SocialBrandIcon platform="drive" size={MARK[size]} />;
  const cls = ["cg-drive", className].filter(Boolean).join(" ");
  if (variant === "words") {
    return (
      <Button href={to} target="_blank" rel="noreferrer" variant="ghost" size={BUTTON_SIZE[size]} className={cls} aria-label={label} title={label}
        iconLeft={mark} iconRight={<ArrowSquareOut size={12} />} data-cg-drive="" data-variant={variant} data-size={size} aria-disabled={disabled || undefined}
        onClick={(e: MouseEvent<HTMLAnchorElement>) => { e.stopPropagation(); if (disabled) { e.preventDefault(); return; } onClick?.(e); }}>
        {words}
      </Button>
    );
  }
  return (
    <IconButton icon={mark} label={label} size={ICON_SIZE[size]} variant="ghost" className={cls} disabled={disabled}
      data-cg-drive="" data-variant={variant} data-size={size}
      onClick={(e: MouseEvent<HTMLButtonElement>) => { e.stopPropagation(); onClick?.(e); window.open(to, "_blank", "noopener"); }} />
  );
}

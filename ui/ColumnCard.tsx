"use client";

import {
  createContext,
  useContext,
  type HTMLAttributes,
  type KeyboardEvent as ReactKeyboardEvent,
  type MouseEvent as ReactMouseEvent,
  type ReactNode,
  type Ref,
} from "react";
import { SPINE_VAR, type SpineToken } from "../lib/list";
import { ListCheckbox } from "./ListHeader";
import type { ColumnNest } from "./ColumnHeader";
import "./ColumnCard.css";

/**
 * ColumnCards · ColumnCard — a column table's CARDS view (v0.74.0).
 *
 * The same records as `ColumnRow`, as full-width widget cards. NOT a taller
 * row: the extra height is earned by stacking information in 2D — title and a
 * right-anchored hero value, an eyebrow meta line, a labelled fact cluster, a
 * widget strip with the row actions, the actionable "Needs" list, a synopsis.
 * Card height follows its content.
 *
 * It keeps the row's furniture — spine, checkbox, nesting rail, art — so a
 * list switching view keeps its selection, tree and cover art in place. Lifted
 * from cmngrdn's `DataList` cards and `CatalogList` cards, which were the same
 * card drawn twice.
 *
 * Cards have no column labels, so select-all / bulk / list actions ride
 * `ListHeader` above them.
 */

interface CardsContext {
  select: boolean;
  nest: boolean;
  art: boolean;
}

const ColumnCardsContext = createContext<CardsContext>({ select: false, nest: false, art: false });

export interface ColumnCardsProps extends Omit<HTMLAttributes<HTMLDivElement>, "children"> {
  /** Cards carry a selection checkbox. */
  select?: boolean;
  /** Cards carry a nesting rail. */
  nest?: boolean;
  /** Cards carry lead art (68px; 52 at narrow). */
  art?: boolean;
  /** People read as circles, records as rounded squares. Default `square`. */
  artShape?: "square" | "circle";
  label?: string;
  rootRef?: Ref<HTMLDivElement>;
  children: ReactNode;
}

export function ColumnCards({
  select = false,
  nest = false,
  art = false,
  artShape = "square",
  label,
  rootRef,
  role = "list",
  children,
  ...rest
}: ColumnCardsProps) {
  return (
    <ColumnCardsContext.Provider value={{ select, nest, art }}>
      <div
        {...rest}
        ref={rootRef}
        data-cg-column-cards=""
        {...(select ? { "data-select": "" } : {})}
        {...(nest ? { "data-nest": "" } : {})}
        {...(art ? { "data-art": "" } : {})}
        {...(art && artShape === "circle" ? { "data-art-shape": "circle" } : {})}
        role={role}
        aria-label={label ?? rest["aria-label"]}
      >
        {children}
      </div>
    </ColumnCardsContext.Provider>
  );
}

export interface ColumnCardProps {
  title: ReactNode;
  /** Right-anchored on the title line (a release date, an amount). */
  hero?: ReactNode;
  /** The eyebrow under the title (type · artist). */
  meta?: ReactNode;
  facts?: { label: string; value: ReactNode }[];
  /** A widget strip (brand glyphs, a progress bar); the actions ride its end. */
  strip?: ReactNode;
  /** Card actions — clicks never open the card. */
  actions?: ReactNode;
  /** What this record still needs — turns a bare status into a work list. */
  needs?: string[];
  /** Shown in place of `needs` when nothing is missing ("Payroll ready"). */
  ready?: string;
  synopsis?: ReactNode;
  art?: ReactNode;
  spine?: SpineToken;
  /** Card tooltip (what the spine means). */
  tooltip?: string;
  onClick?: () => void;
  onContextMenu?: (e: ReactMouseEvent) => void;
  selected?: boolean;
  checked?: boolean;
  onCheck?: (e: ReactMouseEvent) => void;
  checkLabel?: string;
  focused?: boolean;
  nest?: ColumnNest;
  id?: string;
  rowRef?: Ref<HTMLDivElement>;
  tabIndex?: number;
  /** Role when the container is a `grid` (a list shell). Default `listitem`. */
  role?: string;
}

const NEEDS_SHOWN = 6;

export function ColumnCard({
  title,
  hero,
  meta,
  facts,
  strip,
  actions,
  needs = [],
  ready,
  synopsis,
  art,
  spine,
  tooltip,
  onClick,
  onContextMenu,
  selected,
  checked,
  onCheck,
  checkLabel,
  focused,
  nest,
  id,
  rowRef,
  tabIndex,
  role = "listitem",
}: ColumnCardProps) {
  const cards = useContext(ColumnCardsContext);
  const parent = nest && nest !== "child" ? nest : null;
  return (
    <div
      ref={rowRef}
      id={id}
      data-cg-column-card=""
      role={role}
      title={tooltip}
      tabIndex={tabIndex ?? (onClick ? 0 : undefined)}
      aria-selected={cards.select ? !!checked : undefined}
      aria-current={selected || undefined}
      {...(onClick ? { "data-interactive": "" } : {})}
      {...(selected ? { "data-selected": "" } : {})}
      {...(checked ? { "data-checked": "" } : {})}
      {...(focused ? { "data-focused": "" } : {})}
      {...(nest === "child" ? { "data-child": "" } : {})}
      onClick={onClick}
      onContextMenu={onContextMenu}
      onKeyDown={(e: ReactKeyboardEvent<HTMLDivElement>) => {
        if (onClick && (e.key === "Enter" || e.key === " ") && e.target === e.currentTarget) {
          e.preventDefault();
          onClick();
        }
      }}
    >
      {spine && <span data-cg-column-card-spine="" aria-hidden="true" style={{ background: SPINE_VAR[spine] }} />}
      {cards.select && (
        <span data-cg-column-card-check="">
          {onCheck && <ListCheckbox checked={!!checked} onToggle={onCheck} label={checkLabel ?? (checked ? "Deselect" : "Select")} />}
        </span>
      )}
      {cards.nest && (
        <span data-cg-column-card-rail="">
          {nest === "child" ? (
            <span data-cg-column-guide="" aria-hidden="true" />
          ) : parent ? (
            <button
              type="button"
              data-cg-column-chevron=""
              {...(parent.expanded ? { "data-open": "" } : {})}
              aria-label={parent.expanded ? "Collapse" : "Expand"}
              aria-expanded={parent.expanded}
              onClick={(e) => {
                e.stopPropagation();
                parent.onToggle();
              }}
            >
              <svg width="11" height="11" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <polyline points="6,3 11,8 6,13" />
              </svg>
            </button>
          ) : null}
        </span>
      )}
      {cards.art && (
        <span data-cg-column-card-art="" aria-hidden="true">
          {art}
        </span>
      )}
      <div data-cg-column-card-body="">
        <div data-cg-column-card-hero="">
          <span data-cg-column-card-title="">{title}</span>
          {hero}
        </div>
        {meta && <div data-cg-column-card-meta="">{meta}</div>}
        {facts && facts.length > 0 && (
          <div data-cg-column-card-facts="">
            {facts.map((f) => (
              <span key={f.label} data-cg-column-card-fact="">
                <span data-cg-column-card-fact-k="">{f.label}</span>
                <span data-cg-column-card-fact-v="">{f.value}</span>
              </span>
            ))}
          </div>
        )}
        {(strip || actions) && (
          <div data-cg-column-card-strip="">
            {strip}
            {actions && (
              <span data-cg-column-card-actions="" onClick={(e) => e.stopPropagation()}>
                {actions}
              </span>
            )}
          </div>
        )}
        {needs.length > 0 ? (
          <div data-cg-column-card-needs="">
            <span data-cg-column-card-needs-label="">Needs</span>
            {needs.slice(0, NEEDS_SHOWN).map((m) => (
              <span key={m} data-cg-column-card-need="">
                {m}
              </span>
            ))}
            {needs.length > NEEDS_SHOWN && <span data-cg-column-card-need="" data-more="">+{needs.length - NEEDS_SHOWN}</span>}
          </div>
        ) : ready ? (
          <div data-cg-column-card-needs="">
            <span data-cg-column-card-ready="">✓ {ready}</span>
          </div>
        ) : null}
        {synopsis && <p data-cg-column-card-synopsis="">{synopsis}</p>}
      </div>
    </div>
  );
}

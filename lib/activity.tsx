/**
 * THE ACTIVITY VOCABULARY — one glyph and one colour per kind of thing that
 * can happen, decided here and nowhere else.
 *
 * ## Why this exists
 *
 * Every surface that renders "what happened" had been inventing its own
 * mapping. As of 2026-08-15 there were two, and they disagreed on everything:
 *
 * | | `ActivityTimeline` (contact) | `HeldPassHistoryTab` (held pass) |
 * |---|---|---|
 * | pass scanned | `⊙` accent | `⌖` accent |
 * | pass issued | `✦` accent | `✦` accent |
 * | level up | `★` accent | `★` accent |
 * | colour | per-event pick | **everything `--cg-accent`** |
 *
 * A third surface would have made a third. Feather: *"there should be standard
 * system wide CGOS glyphs and colors for all activity actions / events etc so
 * that they're easily recognized… then anytime these things appear across the
 * system it's set so we don't have to keep doing this."*
 *
 * ## The unit is an ACTION, not an event_type
 *
 * `events.event_type` is a volatile string set — the 2026-08-15 audit found 14
 * types defined with zero rows AND 10 types written in production with no def
 * at all, drifting in both directions at once. Binding the design system to it
 * would mean a cgos-ui release every time somebody adds an event.
 *
 * So the vocabulary is a small, closed set of ACTIONS, and each app maps its
 * own strings onto it. Adding `signal_signup` is a mapping change, not a
 * design change. A kind nobody maps is dead weight; a string nobody maps falls
 * to `unknown` and still renders.
 *
 * ## Tone, not colour
 *
 * Consumers never write a hex. They get a `tone`, and the tone resolves to a
 * token. Two rules decide the palette:
 *
 * 1. **A tone is the module that owns the action**, matching `--cg-module-*` —
 *    the same anchoring the sidebar tiles and Power Search chips already use,
 *    so the colour is learned once and reused everywhere.
 * 2. **EXCEPT where one module carries two media you must tell apart.**
 *    Dispatch owns both email and SMS; painting them the same indigo made a
 *    broadcast and a text indistinguishable at a glance, which is what
 *    prompted this. Blue for mail, green for a text — the convention every
 *    phone already taught, so it costs no learning.
 *
 * Failures are the third case: they take STATUS tones, because a bounce is a
 * state and not a fact about which module you are in (see the status-vs-brand
 * convention in CLAUDE.md).
 *
 * ## Phosphor is a PEER dependency, and this is the first one cgos-ui has
 *
 * Every other atom here takes its icon as a prop (`ModuleIconChip`) or draws
 * its own paths (`SocialBrandIcon`), so the package had no icon dependency at
 * all. But a vocabulary whose whole purpose is that the glyph is decided ONCE
 * cannot hand the glyph back to the caller — that is the drift it exists to
 * stop. The platform already standardised on Phosphor duotone for every
 * sidebar tile and module chip, so this names what is already true rather
 * than introducing a choice.
 *
 * Declared `optional` and reachable only through the `./lib/activity` subpath,
 * so a consumer that never imports activity never pulls the icons.
 */

import type { ReactNode } from "react";
import {
  ArrowUUpLeft,
  CalendarCheck,
  CalendarPlus,
  CalendarSlash,
  CalendarX,
  ChatCircle,
  ChatCircleDots,
  CheckCircle,
  Cursor,
  EnvelopeSimple,
  EnvelopeOpen,
  Eye,
  Flag,
  NotePencil,
  Prohibit,
  Question,
  Scan,
  Sparkle,
  Star,
  Tag,
  Ticket,
  Trophy,
  UserPlus,
  Warning,
  WarningOctagon,
  Wallet,
  type Icon as PhosphorIcon,
} from "@phosphor-icons/react";

/** Named colour roles. Never a hex at a callsite. */
export type ActivityTone =
  // Module accents — mirror `--cg-module-*`.
  | "email"
  | "sms"
  | "service"
  | "library"
  | "vault"
  | "scanner"
  | "journey"
  | "audience"
  | "world"
  // Status — for actions that ARE a state.
  | "success"
  | "warning"
  | "danger"
  | "neutral";

/**
 * Tone → token. Every value is a `var()` and never a literal, so a workspace
 * theme moves the activity colours with everything else and there is exactly
 * one definition of "Dispatch indigo" in the system.
 *
 * Three module tokens (`library`, `audience`, `scanner`) and the two
 * `--cg-channel-*` tokens were added to `tokens.css` for this — they had been
 * living as hardcoded hexes inside each app's own module registry.
 */
export const ACTIVITY_TONE_COLOR: Record<ActivityTone, string> = {
  email: 'var(--cg-channel-email)',
  sms: 'var(--cg-channel-sms)',
  service: 'var(--cg-module-service)',
  library: 'var(--cg-module-library)',
  vault: 'var(--cg-module-vault)',
  scanner: 'var(--cg-module-scanner)',
  journey: 'var(--cg-module-journey)',
  audience: 'var(--cg-module-audience)',
  world: 'var(--cg-module-world)',
  success: 'var(--cg-status-success)',
  warning: 'var(--cg-status-warning)',
  danger: 'var(--cg-status-danger)',
  neutral: 'var(--cg-status-neutral)',
};

/**
 * The closed action vocabulary. Dotted `subject.verb` so a reader can see the
 * family at a glance and so a new verb on an existing subject is obviously a
 * sibling rather than a new idea.
 */
export type ActivityKind =
  // Messaging — the two media are separate kinds ON PURPOSE.
  | "email.sent"
  | "email.opened"
  | "email.clicked"
  | "email.bounced"
  | "email.complained"
  | "email.unsubscribed"
  | "sms.sent"
  | "sms.received"
  // Service
  | "inquiry.received"
  | "inquiry.replied"
  | "inquiry.booked"
  | "booking.created"
  | "booking.completed"
  | "booking.cancelled"
  | "booking.rescheduled"
  | "booking.noshow"
  // Forms
  | "form.viewed"
  | "form.submitted"
  // Portal / web
  | "portal.viewed"
  | "portal.signup"
  | "portal.clicked"
  // Audience / identity
  | "account.joined"
  | "account.updated"
  | "account.tagged"
  | "account.optin"
  // Vault
  | "pass.issued"
  | "pass.installed"
  | "pass.scanned"
  | "pass.revoked"
  | "pass.expired"
  // Journey
  | "level.up"
  | "quest.completed"
  // Awen
  | "awen.asked"
  // Operator
  | "admin.viewed"
  | "flag.raised"
  // Fallback
  | "unknown";

export interface ActivityDef {
  icon: PhosphorIcon;
  tone: ActivityTone;
  /** Operator voice, `[Subject] [Action]`. A surface addressing the MEMBER
   *  passes its own label — see `ActivityVoice` below. */
  label: string;
}

export const ACTIVITY: Record<ActivityKind, ActivityDef> = {
  "email.sent": { icon: EnvelopeSimple, tone: "email", label: "Email Sent" },
  "email.opened": { icon: EnvelopeOpen, tone: "email", label: "Email Opened" },
  "email.clicked": { icon: Cursor, tone: "email", label: "Email Link Clicked" },
  "email.bounced": { icon: WarningOctagon, tone: "danger", label: "Email Bounced" },
  "email.complained": { icon: Warning, tone: "danger", label: "Marked as Spam" },
  "email.unsubscribed": { icon: Prohibit, tone: "neutral", label: "Unsubscribed" },

  "sms.sent": { icon: ChatCircle, tone: "sms", label: "Text Sent" },
  "sms.received": { icon: ChatCircleDots, tone: "sms", label: "Text Received" },

  "inquiry.received": { icon: Question, tone: "service", label: "Inquiry Received" },
  "inquiry.replied": { icon: EnvelopeSimple, tone: "service", label: "Inquiry Replied" },
  "inquiry.booked": { icon: CheckCircle, tone: "success", label: "Inquiry Booked" },

  "booking.created": { icon: CalendarPlus, tone: "service", label: "Appointment Booked" },
  "booking.completed": { icon: CalendarCheck, tone: "success", label: "Appointment Completed" },
  "booking.cancelled": { icon: CalendarX, tone: "neutral", label: "Appointment Cancelled" },
  "booking.rescheduled": { icon: ArrowUUpLeft, tone: "warning", label: "Appointment Rescheduled" },
  "booking.noshow": { icon: CalendarSlash, tone: "danger", label: "No-show" },

  "form.viewed": { icon: Eye, tone: "service", label: "Form Viewed" },
  "form.submitted": { icon: CheckCircle, tone: "service", label: "Form Submitted" },

  "portal.viewed": { icon: Eye, tone: "library", label: "Portal Viewed" },
  "portal.signup": { icon: UserPlus, tone: "library", label: "Portal Sign-up" },
  "portal.clicked": { icon: Cursor, tone: "library", label: "Portal Link Clicked" },

  "account.joined": { icon: UserPlus, tone: "audience", label: "Joined" },
  "account.updated": { icon: NotePencil, tone: "audience", label: "Profile Updated" },
  "account.tagged": { icon: Tag, tone: "neutral", label: "Tagged" },
  "account.optin": { icon: ArrowUUpLeft, tone: "success", label: "Re-opted In" },

  "pass.issued": { icon: Ticket, tone: "vault", label: "Pass Issued" },
  "pass.installed": { icon: Wallet, tone: "vault", label: "Pass Added to Wallet" },
  "pass.scanned": { icon: Scan, tone: "scanner", label: "Pass Scanned" },
  "pass.revoked": { icon: Prohibit, tone: "danger", label: "Pass Revoked" },
  "pass.expired": { icon: Prohibit, tone: "neutral", label: "Pass Expired" },

  "level.up": { icon: Star, tone: "journey", label: "Level Up" },
  "quest.completed": { icon: Trophy, tone: "journey", label: "Quest Completed" },

  "awen.asked": { icon: Sparkle, tone: "world", label: "Asked Awen" },

  "admin.viewed": { icon: Eye, tone: "neutral", label: "Viewed by Admin" },
  "flag.raised": { icon: Flag, tone: "warning", label: "Flagged" },

  "unknown": { icon: Question, tone: "neutral", label: "Activity" },
};

/**
 * THE CHANNEL GLYPH, for surfaces that aren't rendering an activity row.
 *
 * The platform had drifted to three answers before this existed: the
 * transmissions list drew `Envelope` + `ChatCircle`, the audience composer drew
 * `EnvelopeSimple` bold + `DeviceMobile` fill, and the activity registry drew a
 * fourth pair. A channel picker and a timeline row are different components
 * but they are the same FACT, so they resolve it here.
 *
 * `DeviceMobile` lost deliberately: it draws the DEVICE, and the thing being
 * chosen is a medium — you can read a text on a watch. `ChatCircle` says
 * message, and it pairs with the green.
 */
export function channelIcon(
  channel: "email" | "sms",
  size = 14,
): ReactNode {
  return activityIcon(channel === "sms" ? "sms.sent" : "email.sent", size);
}

/** The channel's colour, for the same non-row surfaces. */
export function channelColor(channel: "email" | "sms"): string {
  return activityColor(channel === "sms" ? "sms.sent" : "email.sent");
}

/** The icon COMPONENT rather than a rendered node — for callers that hand a
 *  component to something else (a thumbnail slot, a `<ModuleIconChip>`), which
 *  is most of the non-row surfaces. */
export function channelGlyph(channel: "email" | "sms"): PhosphorIcon {
  return activityDef(channel === "sms" ? "sms.sent" : "email.sent").icon;
}

/** Resolve a kind, tolerating a string that isn't one. */
export function activityDef(kind: ActivityKind | string): ActivityDef {
  return ACTIVITY[kind as ActivityKind] ?? ACTIVITY.unknown;
}

/** The colour for a kind, already resolved through the tone table. */
export function activityColor(kind: ActivityKind | string): string {
  return ACTIVITY_TONE_COLOR[activityDef(kind).tone];
}

/**
 * The glyph, rendered. `size` defaults to the 14px the platform's 24px icon
 * circle wants; `weight` is pinned to duotone and cannot be overridden, the
 * same lock `phosphor()` applies to the sidebar tiles.
 */
export function activityIcon(
  kind: ActivityKind | string,
  size = 14,
): ReactNode {
  const Icon = activityDef(kind).icon;
  return <Icon size={size} weight="duotone" />;
}

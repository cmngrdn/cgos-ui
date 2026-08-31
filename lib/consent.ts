/**
 * Consent + compliance message builders — canonical text shown to fans
 * before they opt into SMS/RCS/email programs, plus the auto-replies
 * that fire from the keyword handler (WELCOME, HELP, STOP, START).
 *
 * Single source of truth. The cgos backend (Twilio webhook router), the
 * cmngrdn `<CaptureForm>` checkbox, the public `/sms` info page, and
 * any future consumer (feather-portal, reliquary, etc.) ALL pull from
 * here so the text never drifts across surfaces. Carrier reviewers
 * routinely cross-check the consent screen UI against the public
 * disclosure page against the actual welcome SMS the network sent —
 * if any of those three quote a slightly different version of the text,
 * the campaign gets bounced.
 *
 * ┌──────────────────────────────────────────────────────────────────┐
 * │ ⚠ CARRIER-LOCKED CONTENT. Edits to the strings in this file      │
 * │   require resubmission of every active A2P 10DLC and RCS         │
 * │   campaign to Twilio + the underlying carriers (T-Mobile,        │
 * │   AT&T, Verizon, Google RBM). Before editing, confirm the        │
 * │   change is necessary AND coordinate a resubmission plan.        │
 * └──────────────────────────────────────────────────────────────────┘
 *
 * ## Cross-repo mirror
 *
 * cgos's Python backend (`~/cgos/awen/legal/consent.py`) is a hand-
 * maintained MIRROR of this file. Both must produce byte-identical
 * strings for the same arguments — that's what the snapshot test in
 * cgos asserts. When you change a string here, change it there too,
 * in the same PR.
 *
 * ## Dynamic vs locked
 *
 *   - Dynamic (passed per-call): `brandName`, `messageTypes`, `frequency`,
 *     `supportEmail`. These let the same canonical sentence render with
 *     "Feather" / "Saddlies" / "Reliquary" + their respective message
 *     categories.
 *   - Locked (encoded in the function body): the structural CTIA elements
 *     — frequency-varies clause, rate disclosure, STOP/HELP instructions,
 *     no-sharing clause, the order they appear in, the punctuation.
 *
 * If a new workspace_kind needs a new default message-types phrase,
 * add it to `DEFAULT_MESSAGE_TYPES_BY_KIND` rather than overriding
 * inline at each call site. The map IS the audit trail of what we're
 * telling the FCC fans signed up to receive.
 */

/** Workspace tier — mirrors the cgos `workspaces.workspace_kind` CHECK
 *  constraint exactly. Add new kinds here AND in cgos's Supabase
 *  migration AND in `awen/legal/consent.py` simultaneously. */
export type WorkspaceKind =
  | "member"
  | "creator"
  | "artist"
  | "partner"
  | "studio"
  | "label";

/** Default message-types phrase per workspace_kind. Used when a
 *  consumer doesn't pass an explicit `messageTypes` override. Plain
 *  English (NOT marketing-speak) so a carrier reviewer parsing the
 *  consent text can immediately tell what kind of program this is. */
export const DEFAULT_MESSAGE_TYPES_BY_KIND: Record<WorkspaceKind, string> = {
  artist:
    "new music releases, event announcements, and exclusive content",
  partner:
    "updates, event announcements, and exclusive content",
  studio:
    "appointment reminders, openings, and studio announcements",
  label:
    "artist releases, label updates, and event announcements",
  creator:
    "updates, releases, and announcements",
  member:
    "account updates and notifications",
};

/** Fallback used when we don't know the workspace_kind. Intentionally
 *  generic so it never overpromises a specific content type. */
export const DEFAULT_MESSAGE_TYPES_FALLBACK =
  "updates, announcements, and exclusive content";

/** "Message frequency varies (typically …)" phrase. Twilio + carriers
 *  require a frequency disclosure; this is ours. */
export const DEFAULT_FREQUENCY = "2-6 messages per month";

/** Customer-care contact surfaced in HELP replies + welcome footers.
 *  Single platform inbox — Common Garden ops monitors this. */
export const DEFAULT_SUPPORT_EMAIL = "contact@cmngrdn.com";

/** Privacy + Terms URLs. The consent text references them by name;
 *  React-side consumers wrap the names in actual links via
 *  `renderSmsConsentTextNodes()` below. */
export const PRIVACY_URL = "https://www.cmngrdn.com/privacy";
export const TERMS_URL = "https://www.cmngrdn.com/terms";

export interface ConsentArgs {
  /** Display name of the sender brand. Required — never substitute
   *  vague phrases like "this artist" / "the brand" / "us"; carriers
   *  explicitly flag those as non-compliant. */
  brandName: string;
  /** Description of what kinds of messages will be sent. Defaults to
   *  the workspace-kind-appropriate phrase when `workspaceKind` is
   *  passed; falls back to `DEFAULT_MESSAGE_TYPES_FALLBACK` otherwise. */
  messageTypes?: string;
  /** Carrier-required workspace tier hint for choosing the default
   *  message-types phrase. Ignored when `messageTypes` is set. */
  workspaceKind?: WorkspaceKind | null;
  /** Frequency disclosure phrase. Defaults to `DEFAULT_FREQUENCY`. */
  frequency?: string;
  /** Customer-care contact surfaced in HELP/welcome. Defaults to
   *  `DEFAULT_SUPPORT_EMAIL`. */
  supportEmail?: string;
}

/** Resolve the effective message-types phrase from args + defaults. */
export function resolveMessageTypes(args: ConsentArgs): string {
  if (args.messageTypes && args.messageTypes.trim()) return args.messageTypes.trim();
  if (args.workspaceKind && DEFAULT_MESSAGE_TYPES_BY_KIND[args.workspaceKind]) {
    return DEFAULT_MESSAGE_TYPES_BY_KIND[args.workspaceKind];
  }
  return DEFAULT_MESSAGE_TYPES_FALLBACK;
}

function resolveFrequency(args: ConsentArgs): string {
  return args.frequency?.trim() || DEFAULT_FREQUENCY;
}

function resolveSupportEmail(args: ConsentArgs): string {
  return args.supportEmail?.trim() || DEFAULT_SUPPORT_EMAIL;
}

// ─────────────────────────────────────────────────────────────────────
// Consent disclosure strings (shown UNDER an unchecked checkbox on the
// opt-in form; the user explicitly checks the box to consent)
// ─────────────────────────────────────────────────────────────────────

/** Canonical SMS-opt-in consent text. Shown adjacent to the SMS
 *  consent checkbox on every signup surface. Carrier-locked: see the
 *  file header before editing.
 *
 *  Note: the strings "Privacy Policy" and "Terms" appear verbatim so
 *  the JSX renderer (`renderSmsConsentTextNodes`) can split + wrap them
 *  in clickable links. If you change those words, update the renderer
 *  in the same edit. */
export function buildSmsConsentText(args: ConsentArgs): string {
  const messageTypes = resolveMessageTypes(args);
  const frequency = resolveFrequency(args);
  return (
    `I agree to receive text messages from ${args.brandName} about ${messageTypes} ` +
    `at the phone number provided. Consent is not a condition of any purchase. ` +
    `Message frequency varies (typically ${frequency}). Msg & data rates may apply. ` +
    `Reply STOP to opt out or HELP for help. See our Privacy Policy and Terms. ` +
    `Mobile opt-in consent and phone numbers are never shared with third parties ` +
    `for marketing purposes.`
  );
}

/** Canonical email-opt-in consent text. Shown adjacent to the email
 *  consent checkbox. CAN-SPAM is more permissive than TCPA, so this is
 *  lighter than the SMS variant but still names the brand + describes
 *  what the subscriber will get. */
export function buildEmailConsentText(args: ConsentArgs): string {
  const messageTypes = resolveMessageTypes(args);
  return (
    `I agree to receive email updates from ${args.brandName} about ${messageTypes}. ` +
    `Message frequency varies. You may unsubscribe at any time.`
  );
}

// ─────────────────────────────────────────────────────────────────────
// Category-split consent (CTIA pattern). Short affirmative checkbox
// labels — one per category × channel — say WHAT the fan is opting into
// (marketing vs non-marketing). The carrier-required disclosures (rates,
// frequency, HELP/STOP, no-sharing) live ONCE in `buildConsentFinePrint`
// below the form, instead of being baked into every checkbox label.
//
// Funnel → category map (cmngrdn + feather + reliquary):
//   follow / portal / feather splash → marketing email + marketing SMS
//   booking                          → transactional SMS + OPTIONAL marketing
//                                      email + marketing SMS (none gate booking)
//   reliquary tattoo inquiry         → OPTIONAL marketing email + marketing SMS
//   cmngrdn inquiry forms            → none
//
// The legacy single-surface `buildSmsConsentText` / `buildEmailConsentText`
// above are retained for the `/sms` info page until it's migrated.
// ─────────────────────────────────────────────────────────────────────

/** Marketing EMAIL opt-in checkbox label. Short + affirmative; the
 *  carrier disclosures live in `buildConsentFinePrint`. */
export function buildMarketingEmailConsentText(args: ConsentArgs): string {
  const messageTypes = resolveMessageTypes(args);
  return (
    `I'd like to receive email updates from ${args.brandName} about ${messageTypes}. ` +
    `You may unsubscribe at any time.`
  );
}

/** Marketing SMS opt-in checkbox label. Short + affirmative; carrier
 *  disclosures live in `buildConsentFinePrint`. */
export function buildMarketingSmsConsentText(args: ConsentArgs): string {
  return (
    `I'd like to receive marketing texts and exclusive updates from ` +
    `${args.brandName} at the number provided.`
  );
}

/** Default noun phrase for transactional ("non-marketing") consent — what
 *  the operational messages are about. Booking surfaces use the default;
 *  other transactional surfaces pass their own `topic`. */
export const DEFAULT_TRANSACTIONAL_TOPIC = "my appointment";

function resolveTopic(args: ConsentArgs & { topic?: string }): string {
  return args.topic?.trim() || DEFAULT_TRANSACTIONAL_TOPIC;
}

/** Non-marketing ("transactional") SMS opt-in checkbox label — e.g. the
 *  booking flow's appointment-update texts. */
export function buildTransactionalSmsConsentText(
  args: ConsentArgs & { topic?: string }
): string {
  return (
    `I'd like to receive non-marketing text updates about ${resolveTopic(args)} ` +
    `at the number provided.`
  );
}

/** Non-marketing ("transactional") EMAIL opt-in checkbox label. Not shown
 *  on a checkbox in Phase 1 (transactional email defaults on) but used for
 *  the Phase 2 management-toggle labels so the four dimensions read
 *  consistently. */
export function buildTransactionalEmailConsentText(
  args: ConsentArgs & { topic?: string }
): string {
  return (
    `I'd like to receive non-marketing email updates about ${resolveTopic(args)} ` +
    `at the email address provided.`
  );
}

/** Consolidated fine-print disclosure rendered ONCE below an opt-in form.
 *  Carries the carrier-required elements (consent-not-a-condition, rate +
 *  frequency disclosure, HELP/STOP) so the per-channel checkboxes above
 *  stay short. Ends in the verbatim phrase "Terms & Privacy", whose two
 *  words `renderConsentFinePrintNodes` wraps as separate Terms + Privacy
 *  links — keep them in sync. */
export function buildConsentFinePrint(args: ConsentArgs): string {
  return (
    `By submitting your information, you agree to receive marketing and ` +
    `promotional messages from ${args.brandName}. Consent is not a condition ` +
    `of purchase. Message and data rates may apply. Message frequency varies. ` +
    `Reply HELP for help or STOP to cancel. Terms & Privacy.`
  );
}

/** Default for what consent is NOT a condition of, completing
 *  "Consent is not a condition of …". "purchase" is the CTIA-standard
 *  phrasing and is right for any commerce-shaped funnel. */
export const DEFAULT_NOT_A_CONDITION_OF = "purchase";

/**
 * Consolidated CTIA disclosure for a form that offers ONLY non-marketing
 * (transactional) SMS — the sibling of `buildConsentFinePrint`.
 *
 * WHY A SECOND BUILDER RATHER THAN A FLAG. `buildConsentFinePrint` opens
 * "you agree to receive marketing and promotional messages", which is
 * false on a form that offers neither. The schema route correctly refused
 * to render it there — and nothing replaced it, so a transactional-only
 * opt-in page carried NO disclosure at all: no frequency, no rate notice,
 * no HELP/STOP, no Terms or Privacy link. Every one of those is carrier-
 * required at the point of opt-in. Measured on AHLC's crew application
 * 2026-08-31, which is the page its A2P campaign will cite as its CTA.
 *
 * `notAConditionOf` is parameterised because the coercion a reviewer looks
 * for depends on the relationship. "Not a condition of purchase" is the
 * right sentence for a booking and a meaningless one for a job applicant,
 * where the thing not to condition consent on is the job.
 *
 * Ends in the verbatim phrase "Terms & Privacy" so
 * `renderConsentFinePrintNodes` can split it into two links, exactly as it
 * does for the marketing version — keep the marker identical.
 */
export function buildTransactionalFinePrint(
  args: ConsentArgs & { topic?: string; notAConditionOf?: string }
): string {
  const notCond =
    args.notAConditionOf?.trim() || DEFAULT_NOT_A_CONDITION_OF;
  return (
    `By submitting your information, you agree to receive non-marketing ` +
    `text messages from ${args.brandName} about ${resolveTopic(args)}. ` +
    `Consent is not a condition of ${notCond}. Message and data rates may ` +
    `apply. Message frequency varies. Reply HELP for help or STOP to ` +
    `cancel. Terms & Privacy.`
  );
}

// ─────────────────────────────────────────────────────────────────────
// Outbound auto-reply messages (sent from the Twilio number after the
// user opts in / texts a keyword)
// ─────────────────────────────────────────────────────────────────────

/** WELCOME — sent after a successful opt-in via ANY method (web form,
 *  CONNECT keyword, future channels). CTIA-required elements: brand
 *  name, message types, frequency, rate disclosure, opt-out, customer
 *  care contact. */
export function buildWelcomeMessage(args: ConsentArgs): string {
  const messageTypes = resolveMessageTypes(args);
  const frequency = resolveFrequency(args);
  const support = resolveSupportEmail(args);
  return (
    `${args.brandName}: You're in. You'll receive ~${frequency} about ${messageTypes} ` +
    `from ${args.brandName}. Msg & data rates may apply. Reply HELP for help or STOP ` +
    `to opt out. Support: ${support}`
  );
}

/** HELP — sent when the user texts the keyword HELP. CTIA-required
 *  elements: brand name, customer care contact. */
export function buildHelpMessage(args: ConsentArgs): string {
  const support = resolveSupportEmail(args);
  return (
    `${args.brandName}: Updates from ${args.brandName}. For help, email ${support}. ` +
    `Msg frequency varies. Msg & data rates may apply. Reply STOP to unsubscribe.`
  );
}

/** STOP — sent when the user texts STOP (or any of Twilio's
 *  recognized opt-out keywords). CTIA-required elements: brand name,
 *  confirmation that no further messages will be delivered, optional
 *  re-subscribe instruction. */
export function buildStopMessage(args: ConsentArgs): string {
  return (
    `${args.brandName}: You're unsubscribed and will receive no further messages ` +
    `from this number. Reply START to resubscribe.`
  );
}

/** START — sent when a previously-unsubscribed user texts START to
 *  re-subscribe. Mirror of WELCOME with re-subscription framing. */
export function buildStartMessage(args: ConsentArgs): string {
  const messageTypes = resolveMessageTypes(args);
  const frequency = resolveFrequency(args);
  return (
    `${args.brandName}: You're resubscribed. You'll receive ~${frequency} about ` +
    `${messageTypes} from ${args.brandName}. Msg & data rates may apply. Reply ` +
    `HELP for help or STOP to unsubscribe.`
  );
}

/** Generic SMS footer — appended to artist-authored outbound messages
 *  in the cgos message composer when the workspace's footer toggle is
 *  on. Compact form of the STOP + rate disclosure, suitable for tacking
 *  onto longer messages without doubling their length. */
export function buildSmsFooter(_args?: ConsentArgs): string {
  return `Reply STOP to opt out. Msg & data rates may apply.`;
}

// ─────────────────────────────────────────────────────────────────────
// JSX rendering helpers (React-only — consumed by cmngrdn CaptureForm
// and the /sms page; the Python mirror does NOT need these)
// ─────────────────────────────────────────────────────────────────────

import type { ReactNode } from "react";
import { createElement, Fragment } from "react";

/** Wraps the bare consent-text string in ReactNodes, converting the
 *  literal words "Privacy Policy" and "Terms" into clickable `<a>`
 *  elements. The text-splitter is deliberately strict: it relies on
 *  the canonical wording from `buildSmsConsentText` containing those
 *  exact substrings. If you change the consent text in a way that
 *  alters those substrings, update this function in the same edit. */
export function renderSmsConsentTextNodes(
  args: ConsentArgs & {
    privacyHref?: string;
    termsHref?: string;
    /** Inline styles applied to both <a> elements. Useful for one-off
     *  surfaces that don't have a CSS class to attach. */
    linkStyle?: React.CSSProperties;
    /** className applied to both <a> elements. Useful when the consumer
     *  has a pre-existing link-treatment class (e.g. feather.fm's
     *  `.splash-link`) and wants the canonical consent string to inherit
     *  it. Composes with `linkStyle` if both are passed. */
    linkClassName?: string;
  }
): ReactNode {
  const text = buildSmsConsentText(args);
  const privacyHref = args.privacyHref ?? PRIVACY_URL;
  const termsHref = args.termsHref ?? TERMS_URL;
  const linkStyle = args.linkStyle;
  const linkClassName = args.linkClassName;

  // Split on the EXACT canonical phrase "See our Privacy Policy and Terms."
  // → produces [before, after] around the phrase.
  const marker = "See our Privacy Policy and Terms.";
  const idx = text.indexOf(marker);
  if (idx < 0) {
    // Defensive fallback — should never fire if the canonical string
    // and this matcher are kept in sync.
    return text;
  }
  const before = text.slice(0, idx);
  const after = text.slice(idx + marker.length);

  return createElement(
    Fragment,
    null,
    before,
    "See our ",
    createElement(
      "a",
      {
        href: privacyHref,
        target: "_blank",
        rel: "noopener noreferrer",
        style: linkStyle,
        className: linkClassName,
      },
      "Privacy Policy"
    ),
    " and ",
    createElement(
      "a",
      {
        href: termsHref,
        target: "_blank",
        rel: "noopener noreferrer",
        style: linkStyle,
        className: linkClassName,
      },
      "Terms"
    ),
    ".",
    after
  );
}

/** Wraps `buildConsentFinePrint` in ReactNodes, converting the literal
 *  "Terms" and "Privacy" (the "Terms & Privacy" tail) into two separate
 *  clickable `<a>` elements. Mirror of `renderSmsConsentTextNodes` for the
 *  consolidated fine-print block shown once below an opt-in form. */
export function renderConsentFinePrintNodes(
  args: ConsentArgs & {
    termsHref?: string;
    privacyHref?: string;
    linkStyle?: React.CSSProperties;
    linkClassName?: string;
  }
): ReactNode {
  const text = buildConsentFinePrint(args);
  const termsHref = args.termsHref ?? TERMS_URL;
  const privacyHref = args.privacyHref ?? PRIVACY_URL;
  const linkStyle = args.linkStyle;
  const linkClassName = args.linkClassName;

  // Split on the EXACT canonical phrase "Terms & Privacy" → wraps "Terms" and
  // "Privacy" as two separate links joined by a plain " & ", keeping the
  // trailing period as plain text after them.
  const marker = "Terms & Privacy";
  const idx = text.indexOf(marker);
  if (idx < 0) {
    // Defensive fallback — should never fire if the canonical string and
    // this matcher are kept in sync.
    return text;
  }
  const before = text.slice(0, idx);
  const after = text.slice(idx + marker.length);

  return createElement(
    Fragment,
    null,
    before,
    createElement(
      "a",
      {
        href: termsHref,
        target: "_blank",
        rel: "noopener noreferrer",
        style: linkStyle,
        className: linkClassName,
      },
      "Terms"
    ),
    " & ",
    createElement(
      "a",
      {
        href: privacyHref,
        target: "_blank",
        rel: "noopener noreferrer",
        style: linkStyle,
        className: linkClassName,
      },
      "Privacy"
    ),
    after
  );
}

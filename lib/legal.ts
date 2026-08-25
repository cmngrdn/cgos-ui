/**
 * Per-entity legal identity + the shared clauses every front door's
 * Terms and Privacy pages must carry.
 *
 * ─────────────────────────────────────────────────────────────────────
 * WHY THIS EXISTS
 * ─────────────────────────────────────────────────────────────────────
 * Every Common Garden entity now holds its own A2P 10DLC Brand and
 * Campaign under a CG ISV Primary. Twilio's compliance guidance on that
 * architecture (2026-08-06) is explicit:
 *
 *   "Using your ISV's generic Terms/Privacy Policy is NOT SUFFICIENT for
 *    a campaign registered to the customer's brand. The privacy policy
 *    must clearly state how the customer's brand collects, uses, and
 *    protects user data."
 *
 * A carrier reviewer verifying a campaign's call-to-action visits the
 * cited opt-in page and follows its Terms and Privacy links. A page that
 * names one entity while linking to another entity's policy is the same
 * shape as the 30909 "CTA could not be verified" rejection that killed
 * Reliquary's first campaign submission.
 *
 * ─────────────────────────────────────────────────────────────────────
 * WRAPPER, NOT FORK
 * ─────────────────────────────────────────────────────────────────────
 * Three copies of a 500-line policy would drift, silently, and surface
 * weeks later as a campaign rejection — the exact failure mode this
 * whole workstream exists to clean up after. So the split is:
 *
 *   NEVER VARIES  the carrier-mandated clauses below, byte-identical
 *                 across every door. Guarded by the positive check in
 *                 cmngrdn/scripts/audit-consent-drift.mjs.
 *   VARIES        the controlling entity, its contact, its domain, and
 *                 the Terms/Privacy link destinations.
 *
 * Platform mechanics (how the Platform works, sub-processors, retention,
 * security, cookies) are incorporated BY REFERENCE from the Common Garden
 * policy rather than restated per door. One description of one platform.
 *
 * ─────────────────────────────────────────────────────────────────────
 * ⚠️  BEFORE EDITING ANY STRING IN THIS FILE
 * ─────────────────────────────────────────────────────────────────────
 * These are carrier-facing compliance strings, not copy. A change to a
 * mandated clause requires resubmitting every active A2P campaign — the
 * same rule that governs `lib/consent.ts`. Treat them like the legal
 * documents they are, and see `cgos/docs/front-door-legal-pages-plan.md`
 * for the counsel questions that are still open.
 *
 * NOTE ON ROLES: the controller/processor split is per DATA CATEGORY,
 * not per workspace. Common Garden is a PROCESSOR for an employer's HR
 * records (the documents live on the employer's own Drive under their own
 * revocable credential) and a JOINT CONTROLLER for the identity/audience
 * layer (`people` is universal — one human, one row, shared across
 * workspaces, so no single workspace can be its sole controller). Both
 * hold at once. `dataRoleNote` on each entity carries the sentence that
 * applies to that door.
 */

/** A registered legal entity operating one of the front doors. */
export interface LegalEntity {
  /**
   * Registered legal name, EXACTLY as filed — punctuation included.
   * A2P brand vetting matches this character-for-character, and the two
   * CG entities are punctuated differently on purpose: "Feather Creative,
   * LLC" carries a comma and "Mercedes Creative LLC" does not. Do not
   * normalize them to match each other.
   */
  legalName: string;
  /** Public brand / DBA — what the audience actually recognizes, and what
   *  the consent text names as the sender. */
  brandName: string;
  /** Front-door origin, no trailing slash. Terms/Privacy hang off it. */
  origin: string;
  /** Contact inbox for privacy requests and SMS help for THIS entity. */
  supportEmail: string;
  /** One clause finishing "…is". Used in the opening line of each page. */
  businessDescription: string;
  /** Governing-law jurisdiction, e.g. "the State of Tennessee". */
  jurisdiction: string;
  /** Which platform data-role sentence applies to this door. */
  dataRole: "joint" | "processor-and-joint";
  /**
   * True when this entity's A2P campaign registers OFFLINE opt-in paths — a
   * printed consent form and a scripted verbal disclosure — alongside the web
   * form and the keyword.
   *
   * ⚠️ This is not a feature flag. It must equal what the entity's campaign
   * actually filed in its registered message flow, because the disclosure it
   * drives is rendered on the very pages that flow cites. Reliquary registers
   * four paths and Feather registers two, so a single hardcoded count made one
   * of them contradict its own registration — which is exactly the mismatch a
   * carrier reviewer cross-checks. Changing it means resubmitting the campaign
   * in the same pass.
   */
  inPersonOptIn?: boolean;
}

/** The platform itself. Common Garden is the ISV every other entity's
 *  messaging runs through, and the party referenced as processor. */
export const COMMON_GARDEN: LegalEntity = {
  legalName: "Common Garden LLC",
  brandName: "Common Garden",
  origin: "https://www.cmngrdn.com",
  supportEmail: "contact@cmngrdn.com",
  businessDescription:
    "a multi-tenant creative platform for independent artists and creative professionals",
  jurisdiction: "the State of Tennessee",
  dataRole: "joint",
};

export const FEATHER_CREATIVE: LegalEntity = {
  legalName: "Feather Creative, LLC",
  brandName: "Feather",
  origin: "https://feather.fm",
  // Entity-domain inbox on the `contact@` convention shared with
  // contact@cmngrdn.com — not a personal address. A legal page's contact
  // routes to the company and survives a change of who reads it.
  supportEmail: "contact@feathercreative.co",
  businessDescription:
    "an independent music and media practice releasing original recordings and creative work",
  jurisdiction: "the State of Tennessee",
  dataRole: "joint",
};

export const MERCEDES_CREATIVE: LegalEntity = {
  legalName: "Mercedes Creative LLC",
  brandName: "Reliquary",
  origin: "https://reliquaryarchives.com",
  // Mercedes Creative's own inbox — NOT contact@cmngrdn.com. A page whose whole
  // job is establishing this entity as the controller cannot route its privacy
  // requests to the platform's inbox.
  supportEmail: "contact@mercedescreative.com",
  businessDescription:
    "a multi-disciplinary tattoo and creative practice in Nashville, Tennessee",
  jurisdiction: "the State of Tennessee",
  dataRole: "joint",
  // Campaign CYGZTP2 registers four opt-in paths. The studio is a physical
  // room with clients in it, so paper and verbal consent are real routes here
  // in a way they are not for a purely online door.
  inPersonOptIn: true,
};

export const AMERICAN_HORSE: LegalEntity = {
  legalName: "American Horse Labor Co., Inc.",
  brandName: "American Horse Labor Company",
  origin: "https://americanhorselabor.com",
  supportEmail: "contact@americanhorselabor.com",
  businessDescription:
    "a production labor and stagehand staffing company serving venues, promoters, and production clients",
  jurisdiction: "the State of Minnesota",
  // AHLC is the only door where Common Garden is BOTH: a processor for
  // employment records and a joint controller for the identity layer.
  dataRole: "processor-and-joint",
};

// ─────────────────────────────────────────────────────────────────────
// Link destinations
// ─────────────────────────────────────────────────────────────────────

/**
 * Terms / Privacy destinations for an entity's own front door.
 *
 * `lib/consent.ts` exports PRIVACY_URL / TERMS_URL pointing at Common
 * Garden. Those remain the DEFAULT — correct for cmngrdn itself and for
 * any workspace with no front door of its own — but a door registered
 * under its own A2P Brand must link to its OWN pages. Pass these into
 * `renderConsentFinePrintNodes({ privacyHref, termsHref })`, which
 * already accepts the overrides.
 */
export function privacyUrlFor(entity: LegalEntity): string {
  return `${entity.origin}/privacy`;
}

export function termsUrlFor(entity: LegalEntity): string {
  return `${entity.origin}/terms`;
}

// ─────────────────────────────────────────────────────────────────────
// Carrier-mandated clauses — BYTE-IDENTICAL ACROSS EVERY DOOR
// ─────────────────────────────────────────────────────────────────────

/**
 * The one sentence carriers require verbatim on the privacy disclosure.
 * Already live and carrier-tested in three places on cmngrdn.com
 * (/privacy twice, /terms §4, /sms). It carries over unchanged.
 *
 * ⚠️ Changing a single character here invalidates every registered
 * campaign that cites the page. The positive check in
 * audit-consent-drift.mjs asserts this exact string is present.
 */
export const NO_THIRD_PARTY_SHARING =
  "Mobile opt-in consent and mobile phone numbers are not shared with third parties or affiliates for marketing or promotional purposes under any circumstances.";

/** CTIA opt-out synonyms, mirrored from `STOP_KEYWORDS` in
 *  cgos `awen/routers/sms.py`. Any of these clears BOTH SMS consent
 *  dimensions. Listed on the page because carriers check that the
 *  documented set matches the registered set. */
export const STOP_KEYWORDS = [
  "STOP",
  "STOPALL",
  "UNSUBSCRIBE",
  "CANCEL",
  "END",
  "QUIT",
  "OPTOUT",
  "REVOKE",
] as const;

/** Opt-in synonyms, mirrored from `OPT_IN_KEYWORDS` in the same file.
 *  START and UNSTOP are carrier-reserved and cannot be registered on a
 *  campaign, but they DO work — hence documented here and excluded from
 *  the campaign's registered keyword set by `_optin_drift`. */
export const OPT_IN_KEYWORDS = ["CONNECT", "JOIN", "START", "UNSTOP"] as const;

/** Major US carriers the messaging program runs across. Carriers require
 *  the disclaimer that they are not liable for undelivered messages. */
export const SUPPORTED_CARRIERS =
  "AT&T, T-Mobile, Verizon Wireless, Sprint, U.S. Cellular, Boost Mobile, MetroPCS, Cricket, and Virgin Mobile";

/** Minimum age for the SMS program. */
export const SMS_MINIMUM_AGE = 13;

// ─────────────────────────────────────────────────────────────────────
// Builders — shared clause bodies with the entity interpolated
// ─────────────────────────────────────────────────────────────────────

/** Opening identification line. Names the registered entity AND the
 *  brand, which is what lets a carrier reviewer connect the campaign
 *  registration to the page they are looking at. */
export function buildEntityIdentification(
  entity: LegalEntity,
  opts?: { documentKind?: "policy" | "program" },
): string {
  const sameName = entity.legalName === entity.brandName;
  const dba = sameName ? "" : ` (doing business as "${entity.brandName}")`;
  const host = entity.origin.replace(/^https?:\/\//, "");
  // The second sentence sets the document's scope, so it has to be true of the
  // document it is on. "This policy describes how we collect…personal data" is
  // right on /privacy and /terms and plainly wrong on an SMS program page,
  // which is not a policy and does not describe data handling — it describes a
  // messaging program. Same mandated identification, honest framing.
  const scope =
    opts?.documentKind === "program"
      ? `This page describes the text messaging program we operate for ` +
        `${entity.brandName} and the services offered at ${host}.`
      : `This policy describes how we collect, use, and protect personal data ` +
        `in connection with ${entity.brandName} and the services offered at ${host}.`;
  return `${entity.legalName}${dba} ("we," "our," or "us") is ${entity.businessDescription}. ${scope}`;
}

/**
 * The platform-relationship paragraph — the controller/processor
 * disclosure. This is the part a generic ISV policy cannot supply and
 * the reason each door needs its own page.
 */
export function buildPlatformRelationship(entity: LegalEntity): string {
  const base =
    `${entity.legalName} operates on the Common Garden platform, provided by ` +
    `${COMMON_GARDEN.legalName}. Common Garden processes personal data on our ` +
    `behalf to deliver the services described here — including contact ` +
    `management, messaging delivery, scheduling, and payments — and is ` +
    `contractually restricted to processing it for those purposes. ` +
    `SMS messages are delivered by Twilio, Inc. as a sub-processor. ` +
    `Platform mechanics not specific to ${entity.brandName} — including ` +
    `security practices, international transfers, retention, and cookies — ` +
    `are described in the Common Garden Privacy Policy at ` +
    `${COMMON_GARDEN.origin}/privacy, which is incorporated into this policy ` +
    `by reference.`;

  if (entity.dataRole === "processor-and-joint") {
    return (
      base +
      ` Employment and human-resources records — including work-authorization ` +
      `and tax documents — remain under our sole control and are stored on ` +
      `infrastructure we own; Common Garden acts only as a processor with ` +
      `respect to those records and holds no independent right to use them.`
    );
  }
  return base;
}

/**
 * How a person opts in. Every method named explicitly — carriers check that the
 * documented flow matches what the opt-in page actually does, and this text is
 * rendered on the pages the campaign's registered message flow cites.
 *
 * The COUNT is derived from `entity.inPersonOptIn` rather than fixed, because
 * it is a per-entity fact. This sentence used to open "in two ways" for
 * everyone, which was true of Feather's registration and false of Reliquary's —
 * her campaign registers four, so her own privacy policy contradicted her own
 * message flow. A hardcoded count in a shared builder is a claim about every
 * entity that will ever use it.
 */
export function buildOptInDisclosure(entity: LegalEntity): string {
  const online =
    `Web form opt-in: by entering your mobile number and checking the ` +
    `dedicated SMS consent checkbox on our signup form. The checkbox is ` +
    `unchecked by default, is never required to submit the form or as a ` +
    `condition of any purchase, and is displayed together with the specific ` +
    `consent language, a link to this Privacy Policy, and a link to our Terms. ` +
    `Keyword opt-in: by texting ${OPT_IN_KEYWORDS[0]} to our published number. ` +
    `You will then receive a confirmation message identifying ${entity.brandName}, ` +
    `stating that message frequency varies, stating that message and data rates ` +
    `may apply, and providing HELP and STOP instructions.`;

  if (!entity.inPersonOptIn) {
    return (
      `You may opt in to receive SMS messages from ${entity.brandName} in two ` +
      `ways. ${online}`
    );
  }

  return (
    `You may opt in to receive SMS messages from ${entity.brandName} in four ` +
    `ways. ${online} Written opt-in: by completing a printed consent form in ` +
    `person, which states the message types, that frequency varies, that ` +
    `message and data rates may apply, HELP and STOP instructions, and links ` +
    `to our Terms and this Privacy Policy, and which you sign and date. The ` +
    `signed form is retained. Verbal opt-in: by giving consent in person after ` +
    `a member of staff reads a scripted disclosure covering who is texting ` +
    `you, the message types, how often, that message and data rates may apply, ` +
    `that consent is not required to book, and how to stop. Verbal consent is ` +
    `logged with the date, your name and number, and who took it.`
  );
}

/** HELP / STOP / re-subscribe. The opt-out set must match what the
 *  backend actually honors, or a carrier-blocked contact stays flagged
 *  "subscribed" in our own data. */
export function buildHelpAndOptOut(entity: LegalEntity): string {
  // "STOP (or A, B, … or Z)" — matches the already-carrier-approved shape on
  // cmngrdn.com/privacy rather than a bare comma list, which reads as an
  // unfinished enumeration.
  const [primary, ...rest] = STOP_KEYWORDS;
  const alts = `${rest.slice(0, -1).join(", ")}, or ${rest[rest.length - 1]}`;
  return (
    `Reply HELP to any message from ${entity.brandName} for information about ` +
    `the program and how to reach us. Reply ${primary} (or ${alts}) to stop ` +
    `receiving further SMS messages. You will receive one confirmation of your ` +
    `opt-out, after which no further marketing or transactional SMS will be ` +
    `sent. To resume, reply START or opt in again through the methods above. ` +
    `You may also contact us at ${entity.supportEmail} at any time.`
  );
}

/** Who the number is disclosed to. Opens with the mandated sentence. */
export function buildSmsDataSharing(entity: LegalEntity): string {
  return (
    `${NO_THIRD_PARTY_SHARING} Mobile numbers and related opt-in information ` +
    `are disclosed only to: ${entity.legalName}, so we can send the messages ` +
    `you consented to receive; ${COMMON_GARDEN.legalName}, which operates the ` +
    `platform on our behalf; Twilio, Inc., our SMS provider, contractually ` +
    `restricted to delivering messages and receiving your replies on our ` +
    `behalf; wireless carriers, as necessary to route messages to your device; ` +
    `and authorities where required by law, subpoena, or other legal process.`
  );
}

/** Proof-of-consent record. Describes what `contact_consent_events`
 *  actually stores — this is the paragraph TCR wants to see when it asks
 *  how consent is tracked. */
export function buildConsentRecord(entity: LegalEntity): string {
  return (
    `When you opt in, we retain a record of the opt-in method, the number ` +
    `provided, the ${entity.brandName} audience you joined, the date and time, ` +
    `and the exact consent language you agreed to. We retain it for as long as ` +
    `you remain opted in and for a reasonable period afterward to demonstrate ` +
    `compliance with applicable law and mobile industry standards. Opt-outs are ` +
    `recorded the same way, with the date and time they were processed.`
  );
}

/** Carrier delivery disclaimer + eligibility. Both carrier-required. */
export function buildDeliveryAndEligibility(entity: LegalEntity): string {
  return (
    `Messages are sent across major U.S. wireless carriers, including but not ` +
    `limited to ${SUPPORTED_CARRIERS}. Carriers are not liable for delayed or ` +
    `undelivered messages, and delivery is outside our control. The SMS program ` +
    `is available only to individuals in the United States who are at least ` +
    `${SMS_MINIMUM_AGE} years of age. You represent that you are the subscriber ` +
    `of the number you provide, or are authorized by the subscriber to opt it ` +
    `in. If you stop being the subscriber of a number you opted in with, please ` +
    `notify us at ${entity.supportEmail} so we can remove it.`
  );
}

/** Every mandated phrase that must appear on a door's rendered pages.
 *  `audit-consent-drift.mjs` asserts each of these is present, which is
 *  what makes "wrapper, not fork" safe rather than merely tidy. */
export function requiredLegalPhrases(entity: LegalEntity): string[] {
  return [
    NO_THIRD_PARTY_SHARING,
    entity.legalName,
    COMMON_GARDEN.legalName,
    "Twilio, Inc.",
  ];
}

/**
 * DeliveryBadge + ReplyBadge — how one sent text did, and what came back.
 *
 * Both ARE `<Badge size="sm" uppercase>` with a fixed vocabulary, the same
 * shape as cmngrdn's StatusChip: the wrapper adds no look of its own, so a
 * "Filtered" chip cannot drift from every other status chip on the platform.
 *
 * `deliveryStateFor()` is a MIRROR of cgos `_sms_bucket`
 * (`routers/transmissions.py`), which fills the recipients `summary`. A row's
 * chip and the summary's counts come from the same rule, so the filter that
 * says "Failed 3" shows three Failed rows. If they disagree, cgos wins.
 */

import { Badge, type BadgeTone } from './Badge'

/** read (RCS read receipt) · delivered · sent (carrier accepted, no receipt
 *  yet) · pending · failed · filtered (carrier error 30007). Exclusive. */
export type DeliveryState = 'read' | 'delivered' | 'sent' | 'pending' | 'failed' | 'filtered'

export type ReplyIntent = 'yes' | 'no' | 'other'

export const DELIVERY_BADGE: Record<DeliveryState, { label: string; tone: BadgeTone }> = {
  read: { label: 'Read', tone: 'accent' },
  delivered: { label: 'Delivered', tone: 'success' },
  sent: { label: 'Sent', tone: 'neutral' },
  pending: { label: 'Pending', tone: 'neutral' },
  failed: { label: 'Failed', tone: 'danger' },
  filtered: { label: 'Filtered', tone: 'warning' },
}

export const REPLY_BADGE: Record<ReplyIntent, { label: string; tone: BadgeTone }> = {
  yes: { label: 'Yes', tone: 'success' },
  no: { label: 'No', tone: 'danger' },
  other: { label: 'Other', tone: 'neutral' },
}

const FILTERED_CODE = '30007'

/** The delivery state of one outbound text, or null when there is no text. */
export function deliveryStateFor(
  sms: { status?: string | null; error_code?: string | number | null } | null | undefined,
): DeliveryState | null {
  if (!sms) return null
  const st = (sms.status ?? '').toLowerCase()
  if (st === 'failed' || st === 'undelivered') {
    return String(sms.error_code ?? '') === FILTERED_CODE ? 'filtered' : 'failed'
  }
  if (st === 'delivered' || st === 'read' || st === 'sent') return st
  return 'pending'
}

/** An intent string from the API, tolerating anything else as `other`. */
export function replyIntentOf(v: unknown): ReplyIntent {
  return v === 'yes' || v === 'no' ? v : 'other'
}

export function DeliveryBadge({ state, title }: { state: DeliveryState; title?: string }) {
  const d = DELIVERY_BADGE[state]
  return (
    <span title={title}>
      <Badge tone={d.tone} size="sm" uppercase>
        {d.label}
      </Badge>
    </span>
  )
}

export function ReplyBadge({ intent }: { intent: ReplyIntent }) {
  const r = REPLY_BADGE[intent]
  return (
    <Badge tone={r.tone} size="sm" uppercase>
      {r.label}
    </Badge>
  )
}

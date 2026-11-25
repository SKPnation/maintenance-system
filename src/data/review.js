// Shared helpers for the manager review screens (PB-04).

export const withCurrent = (options, current) => (current && !options.includes(current) ? [...options, current] : options);

export const reviewChanges = (form) => ({
  category: form.category,
  priority: form.priority,
  trade: form.trade,
  safety: form.safety === 'Yes',
  note: (form.note || '').trim(),
});

// Toast text after saving; `moved` is true when the request left this manager's queue.
export function reviewOutcome(result) {
  const reroute = result?.reroute;
  if (result?.unchanged) return { message: 'No changes to save', moved: false };
  if (reroute?.movedQueue) {
    return {
      message: reroute.toCategory !== reroute.requested
        ? `"${reroute.requested}" has no active manager, so the request was sent to ${reroute.toCategory} for manual review`
        : `Moved to the ${reroute.toCategory} manager's queue`,
      moved: true,
    };
  }
  return { message: reroute ? `Category changed to ${reroute.toCategory}` : 'Changes saved', moved: false };
}

// Same rule as the server's awaitingReview(): reviewable until approved (has a
// work order) or closed; older records with other status words or no analysis
// are reviewed manually; only a request being analyzed right now waits.
const FINAL = ['approved', 'rejected', 'cancelled', 'canceled', 'completed', 'closed'];
export const isAwaitingReview = (r) =>
  Boolean(r) &&
  !r.workOrderId &&
  !FINAL.includes(String(r.status || '').trim().toLowerCase()) &&
  r.analysisStatus !== 'pending';

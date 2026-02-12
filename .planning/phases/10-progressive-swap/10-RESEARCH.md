# Phase 10 Research Notes (Progressive Swap)

## Decisions

- Keep one-click random swap as primary CTA.
- Preload candidate pool per day (minimum 4) on card mount.
- Secondary "Byt med filter" flow uses server-filtered candidates.

## Data Model Usage

- Candidate pool excludes meals already used in current week plan.
- Recency filter uses 14-day lookback from UsageHistory.
- Rating/complexity filters use Meal enum fields.

## UX Constraints

- Fast path must not open modal before swapping.
- Filter UI must be optional and collapsed by default.
- Zero-result states must still provide fallback choices.

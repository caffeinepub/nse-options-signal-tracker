# NSE Options Signal Tracker

## Current State
The app has SignalCards component displaying buy signals including Harmonic pattern signals (Gartley, Bat, Butterfly, Crab) with a reason text. There is no interactive popup for harmonic signals.

## Requested Changes (Diff)

### Add
- PatternExplainerModal component: a dialog that opens when user clicks a Harmonic signal card
- The modal shows the pattern name, XABCD point diagram drawn on a canvas/SVG, and a table of Fibonacci ratios for that pattern (XA, AB, BC, CD retracement levels)
- A clickable area or "Explain Pattern" button on Harmonic signal cards

### Modify
- SignalCards.tsx: add onClick handler to Harmonic signal cards that opens the PatternExplainerModal with the relevant pattern name

### Remove
- Nothing

## Implementation Plan
1. Create `src/frontend/src/components/PatternExplainerModal.tsx` with:
   - Dialog using shadcn Dialog component
   - SVG-based XABCD diagram showing zigzag price structure with labeled points X, A, B, C, D
   - Fibonacci ratio table for each pattern (Gartley, Bat, Butterfly, Crab)
   - Pattern description text
2. Update SignalCards.tsx to:
   - Track selectedHarmonicPattern state
   - Show an "Explain" button on Harmonic signal cards
   - Render PatternExplainerModal when a harmonic signal is clicked

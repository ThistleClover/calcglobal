# CalcGlobal Codebase Improvement Report

**Date:** 2026-08-12  
**Project:** silly-meitner (CalcGlobal Tax Calculators)

---

## 🔴 CRITICAL ISSUES (Must Fix)

### 1. Engine Serialization is Broken

**Location:** `src/pages/[country]/[calculator].astro` (lines 41-52)

**Problem:** The engine code serialization extracts only the function body via `.toString()`, but the function references external dependencies that won't exist in the `new Function()` scope:

```typescript
const engineModule = await import(`../../lib/engine/countries/${engineKey}.ts`);
const fnStr = engineModule.calculate.toString();
const bodyStart = fnStr.indexOf('{') + 1;
const bodyEnd = fnStr.lastIndexOf('}');
engineCode = fnStr.substring(bodyStart, bodyEnd);
```

The `us.ts` calculate function calls:
- `applyBrackets()` - helper function
- `safeVal()` - imported from types
- `BRACKETS_SINGLE_2026`, `BRACKETS_JOINT_2026`, `BRACKETS_HOH_2026` - constants
- `STATE_RATES`, `SS_WAGE_BASE_2026`, `STANDARD_DEDUCTION` - constants
- Sub-functions like `calculatePrimary1099`, `calculateSCorpVsLLC`, etc.

**Result:** All calculations will throw `ReferenceError` at runtime.

**Fix Options:**
1. Bundle all dependencies into a self-contained function string at build time
2. Use a proper serialization library like `serialize-javascript`
3. Ship the entire engine module as a JSON-serialized AST
4. Move calculation to a Web Worker with proper module imports

### 2. Dead Code: CalculatorEngine.astro

**Location:** `src/components/CalculatorEngine.astro`

**Problems:**
- Uses fake calculation logic (`baseValue * 0.72`)
- References undefined Tailwind classes (`corporate-200`, `corporate-900`, etc.)
- Appears unused (InteractiveCalculator is used instead)

**Recommendation:** Delete this file to avoid confusion.

---

## 🟠 HIGH PRIORITY

### 3. Duplicate Configuration

**Locations:** 
- `src/config.ts` → `ENGINE_MAP`
- `src/lib/engine/factory.ts` → `calcToEngine`

Both define the same calculator-to-engine mapping. Changes in one won't reflect in the other.

**Fix:** Consolidate into a single source of truth.

### 4. Homepage Language Inconsistency

**Location:** `src/pages/index.astro` (lines 163-184)

The "Coming Soon" section is hardcoded in French:
```html
<h2>32+ Nouveaux Pays Arrivent Bientôt</h2>
```

This appears on the English homepage. Should be localized or use English.

### 5. Non-Functional Newsletter Form

**Location:** `src/layouts/Layout.astro` (line 199)

```html
<form onsubmit="event.preventDefault();">
```

The form does nothing on submit. Either:
- Connect to an email service (Mailchimp, ConvertKit, etc.)
- Remove the form entirely
- Show a "Coming soon" message

---

## 🟡 MEDIUM PRIORITY

### 6. Security: `new Function()` Usage

**Location:** `src/components/InteractiveCalculator.tsx` (line 146)

While the comment notes the code comes from own source, `new Function()` is equivalent to `eval()` and:
- Will be flagged by CSP policies
- May be blocked in strict environments
- Triggers ESLint security warnings

**Alternative:** Use a proper module bundling approach or Web Workers.

### 7. Missing Input Validation UI

**Location:** `src/components/InteractiveCalculator.tsx`

- No required field indicators
- No validation before calculation
- Generic error message doesn't help users fix issues
- Number inputs allow negative values despite `min="0"` (users can type `-`)

### 8. Accessibility Issues

**Locations:** Multiple files

- Missing `aria-label` on interactive elements
- Color contrast may be insufficient (text-slate-400 on white)
- No skip-to-content link
- FAQ items lack proper ARIA roles (use `<details>`/`<summary>` or proper accordion pattern)

### 9. Performance: External Font Loading

**Location:** `src/layouts/Layout.astro` (lines 86-88)

Google Fonts loaded synchronously. Consider:
- Using `font-display: swap` (already in URL)
- Self-hosting fonts for better performance
- Preloading critical font weights

---

## 🟢 LOW PRIORITY / ENHANCEMENTS

### 10. SEO Improvements

- Add `SoftwareApplication` schema with `aggregateRating` once reviews exist
- Consider adding `HowTo` schema for calculator usage instructions
- Meta descriptions could be more unique per calculator

### 11. State Tax Simplification

**Location:** `src/lib/engine/countries/us.ts`

State tax uses flat rates which is inaccurate:
```typescript
const STATE_RATES: Record<string, number> = {
  CA: 0.093, NY: 0.0685, TX: 0, FL: 0, ...
};
```

Real state taxes are progressive. Consider adding disclaimer or implementing proper brackets.

### 12. Missing Test Coverage

No test files detected. Add:
- Unit tests for each country engine
- Integration tests for calculation accuracy
- Snapshot tests for UI components

### 13. TypeScript Improvements

- `affiliate_targets?: any[]` should have proper typing
- Several `any` types throughout could be narrowed
- Consider enabling strict mode if not already

### 14. Translation Key Hardcoding

Some UI text is hardcoded in English:
- "Your Results" (line 266 in InteractiveCalculator.tsx)
- "Select..." placeholder (line 197)
- "Sponsored" label (line 333)

---

## 📊 SUMMARY

| Category | Count |
|----------|-------|
| Critical (Breaks Functionality) | 2 |
| High Priority | 3 |
| Medium Priority | 4 |
| Low Priority / Enhancements | 5 |

**Immediate Action Required:**
1. Fix engine serialization (calculations don't work)
2. Delete dead CalculatorEngine.astro
3. Consolidate duplicate engine mappings

---

## RECOMMENDED FIX FOR ENGINE SERIALIZATION

Create a build-time script that generates self-contained calculation modules:

```typescript
// scripts/build-engines.ts
// Generates a self-contained string with all dependencies inlined

export function serializeEngine(countryCode: string): string {
  // Read the source file
  // Parse and inline all local dependencies
  // Return a complete function string that works with new Function()
}
```

Or better: use dynamic imports properly in the React component:

```typescript
// In InteractiveCalculator.tsx
const engine = await import(`../lib/engine/countries/${engineKey}`);
const result = engine.calculate(inputs);
```

This requires restructuring how the engine key is passed to the component.
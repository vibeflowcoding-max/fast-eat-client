## 2024-05-18 - Math.asin vs Math.atan2 in Haversine Formula (Node.js/V8)
**Learning:** In V8 and JavaScript engines, the mathematically equivalent `Math.asin(Math.sqrt(a))` is significantly faster (nearly 3x faster in benchmarks) than `2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))` for Haversine distance calculations. Pre-calculating radian conversions `Math.PI / 180` and combining them avoids repetitive redundant arithmetic.
**Action:** When working on backend or API routes involving geo-queries or geospatial algorithms in node.js, use `Math.asin(Math.sqrt(a))` over `Math.atan2` for the final distance calculation block to reduce JS math overhead.
## 2024-05-18 - Pre-compute Sets for large loop structures
**Learning:** In V8 and JavaScript engines, computing a regex string replacement and allocating a new `Set` on every cycle of an O(N*M) loop (like querying a multi-column dataset returned from Supabase limit queries) causes significant micro-performance degradation. Reusing the input object reference drops execution time effectively in half.
**Action:** Always hoist invariant string normalization and object allocations (Sets, Maps) outside of `.find()`, `.map()`, or `.filter()` block chains when matching against multiple columns of raw backend data arrays.
## 2024-05-18 - O(N) Loop aggregation over chained array methods
**Learning:** Chaining array methods like `.map()`, `.filter()`, and `.reduce()` inside of other mapping iterations causes repeated N-sized array allocations that puts unnecessary pressure on the Garbage Collector in Node.js. In this codebase's backend API logic, using inline single-pass `for...of` loops drastically cut down intermediate array processing.
**Action:** When calculating derived metrics from database queries across multiple nodes/branches (like rating, eta, and counts), always prefer a single inline `for...of` pass rather than calling `.map().filter()` or utility functions over the dataset repeatedly.

## 2026-04-02 - PostgreSQL Column Validation in INSERT operations
**Learning:** PostgreSQL and PostgREST (Supabase) strictly validate column names in `INSERT` operations. Including a non-existent column in the payload results in a `42703` error (Column does not exist), rather than being ignored. This makes "optimistic" multi-column inserts for discovery purposes counter-productive as they add failing round-trips.
**Action:** When dealing with uncertain database schemas, use a module-level cache to store validated column names after the first successful discovery. This reduces subsequent "discovery" loops to a single efficient database round-trip while maintaining compatibility with multiple schema variations.
## 2024-05-24 - O(N*M) Price Lookup Optimization
**Learning:** Chaining `.filter().sort()` inside a loop to find the best matching relational data creates an O(N*M log M) performance bottleneck and redundant array allocations per iteration.
**Action:** Always pre-compute relational aggregations (like the latest active price per variant) into a localized `Map` beforehand using a single `O(N)` pass, and then use `O(1)` map lookups inside the subsequent loops.
## 2024-05-23 - Avoiding Redundant Map/Filter Chains in Query Payloads
**Learning:** Chaining `Array.from(new Set(arr.map().filter()))` inside a `Promise.all` block multiple times for the exact same input array creates unnecessary array allocations, duplicated iteration logic, and bloated query payloads. This is an anti-pattern when multiple Supabase queries rely on identical relationship IDs.
**Action:** Always pre-calculate the unique identifier array using a single `for...of` loop combined with a `Set` before passing it down to dependent query builders to reuse logic and memory effectively.
## 2024-05-24 - Avoiding Redundant Dynamic Map Lookups in Promise Arrays
**Learning:** Running `.map()` dynamically inside of multiple chained `.in()` clauses that live within a `Promise.all` block results in redundant array allocations and unnecessary O(N) operations when constructing backend database queries.
**Action:** Always extract invariant array ids mapping into localized constants using a single `for...of` pass, and then reuse those cached unique IDs arrays locally within down-stream async queries mapping inputs.

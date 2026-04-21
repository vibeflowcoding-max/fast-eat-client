1. **Optimize array operations in `src/app/api/customer/profile/route.ts`**
   - Replace the chained `.map().filter().slice()` operations on `persistedFavorites` with a single-pass `for...of` loop to extract `topRestaurantIds`. This avoids multiple array allocations and O(N) operations.
   - Replace the `.map().filter()` chain on `topRestaurantIds` to populate `favoriteRestaurants` with a single-pass `for...of` loop.
   - Add inline comments explaining the optimizations with the Bolt lightning bolt emoji.

2. **Complete pre-commit steps**
   - Complete pre-commit steps to ensure proper testing, verification, review, and reflection are done.

3. **Submit the Pull Request**
   - Submit the PR with the required Bolt title and description formats.

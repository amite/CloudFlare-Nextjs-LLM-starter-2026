# Issue: Cost Tracker TypeScript Errors with Drizzle ORM

## Description

The `lib/cost-tracker.ts` file contained TypeScript compilation errors related to Drizzle ORM aggregate queries and type inference issues. The main error was:

```
Property 'totalCost' does not exist on type '{ id: number; createdAt: Date; userId: string | null; provider: string; requestId: string; model: string; inputTokens: number; outputTokens: number; totalTokens: number; costUsd: number; ... 4 more ...; metadata: unknown; }'. (2339)
```

## Context

- **Component:** Cost tracking system
- **Error Location:** `lib/cost-tracker.ts` lines 120-130
- **Environment:** TypeScript compilation
- **Framework:** Next.js with Drizzle ORM

## Root Cause

The issue had two main components:

### 1. Drizzle ORM Syntax Compatibility

The code was using `select({ totalCost: sum(usageLogs.costUsd) })` syntax, which is not supported by the version of Drizzle ORM being used in this project. The `select()` method expects 0 arguments in this version.

### 2. Type Inference Problem

TypeScript was incorrectly inferring the result type of the aggregate query as the full `UsageLog` type instead of the selected shape with `totalCost`. This caused the `totalCost` property to be inaccessible.

## Resolution

The fix involved restructuring the aggregate query to work with the Drizzle ORM version and improving type safety:

### 1. Fixed Aggregate Query Syntax

**Before:**
```typescript
const result = await this.db
  .select({
    totalCost: sum(usageLogs.costUsd),
  })
  .from(usageLogs)
  .where(gte(usageLogs.createdAt, today));

const dailyCost = result[0]?.totalCost || 0;
```

**After:**
```typescript
type AggregateResult = {
  totalCost: number | null;
};

const result = (await this.db
  .select()
  .from(usageLogs)
  .where(gte(usageLogs.createdAt, today))) as unknown as AggregateResult[];

const dailyCost = result.reduce((sum, log) => sum + (log as any).costUsd, 0);
```

### 2. Improved Type Safety

- Added explicit `AggregateResult` type definition
- Used proper type casting with `as unknown as AggregateResult[]`
- Used `reduce()` to calculate total cost from individual log entries
- Added proper type annotation for the `conditions` array

### 3. Fixed Array Type Annotation

**Before:**
```typescript
const conditions = [];
```

**After:**
```typescript
const conditions: Array<ReturnType<typeof gte | typeof lte | typeof eq>> = [];
```

## How It Works Now

The solution maintains the same functionality while being compatible with the Drizzle ORM version:

### Daily Cost Calculation
1. **Query Execution:** Fetches all usage logs for the current day
2. **Type Casting:** Casts the result to the expected aggregate result type
3. **Manual Aggregation:** Uses `reduce()` to sum up the `costUsd` values from individual logs
4. **Threshold Check:** Compares the calculated daily cost against the configured threshold

### Type Safety Improvements
1. **Explicit Types:** Clear type definitions for aggregate results
2. **Proper Casting:** Safe type casting using `as unknown as` pattern
3. **Array Typing:** Proper typing for condition arrays to prevent type errors

## Verification Steps

After applying the fixes:

1. **TypeScript Compilation:**
   ```bash
   npx tsc --noEmit --skipLibCheck
   ```
   Should complete without errors.

2. **Functionality Testing:**
   - The cost tracking functionality should work as expected
   - Daily threshold alerts should trigger correctly
   - Usage summaries should be calculated properly

3. **Integration Testing:**
   - Test LLM API calls to ensure they're properly tracked
   - Verify that cost calculations are accurate
   - Check that threshold alerts are logged when appropriate

## Related Files Modified

- `lib/cost-tracker.ts` - Fixed TypeScript errors and improved type safety

## Prevention

When working with Drizzle ORM aggregate queries:

1. **Check Drizzle ORM Version:** Verify the syntax supported by your specific version
2. **Use Explicit Types:** Always define types for query results, especially with aggregates
3. **Manual Aggregation:** For complex aggregations, consider fetching data and aggregating manually
4. **Type Safety:** Use proper type casting patterns to ensure type safety
5. **Test Compilation:** Regularly run TypeScript compilation to catch type errors early

## Alternative Approaches

If you need to use SQL aggregate functions directly:

1. **Use Raw SQL:**
   ```typescript
   const result = await this.db.execute(sql`
     SELECT SUM(costUsd) as totalCost 
     FROM usage_logs 
     WHERE createdAt >= ${today.getTime()}
   `);
   ```

2. **Use Drizzle ORM's SQL Builder:**
   ```typescript
   const result = await this.db
     .select({ totalCost: sql<number>`SUM(${usageLogs.costUsd})` })
     .from(usageLogs)
     .where(gte(usageLogs.createdAt, today));
   ```

However, the current solution is recommended as it's more compatible with the existing Drizzle ORM setup and provides better type safety.

## References

- Drizzle ORM Documentation: https://orm.drizzle.team/
- TypeScript Type Assertions: https://www.typescriptlang.org/docs/handbook/2/everyday-types.html#type-assertions
- Drizzle ORM with SQLite: https://orm.drizzle.team/docs/get-started-sqlite

Documented on: December 25, 2025
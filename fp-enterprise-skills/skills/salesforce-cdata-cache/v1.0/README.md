# salesforce-cdata-cache v1.0

**Authored by:** David Burden  
**Date:** 2026-04-18  
**Owner:** david.burden@forcepoint.com

## What this skill covers

- Cached schemas for **Opportunity**, **Account**, **User**, and **OpportunityLineItem** (curated to the columns actually used — not the full 180+ field dump)
- All picklist values for `StageName`, `ForecastCategoryName`, `Loss_Reason__c`, `Account.Type`, `Theatre__c`, `Region__c`
- CData SQL dialect rules so Claude does not need to call `getInstructions`
- Seven pre-baked query templates covering the most common sales analytics operations
- Routing rules telling Claude when to skip discovery vs. when it still needs `getColumns`
- ACV field guide — which ACV field to use for what

## What is NOT in v1 (deferred to future versions)

- `Product2` and `PricebookEntry` schemas (for deeper product-mix analysis)
- `Campaign` and `Lead` schemas
- `Contact` schema
- `RecordType` ID-to-name mappings (would let Claude filter by record type without a lookup query)
- Cached owner/rep name-to-ID mappings for top reps

## Usage

This skill is triggered automatically when a query involves any of the trigger keywords in `manifest.json`. Claude reads `salesforce-cdata-cache.md` before calling any CData tool, then goes directly to `queryData` without discovery calls.

## Token efficiency

| Metric              | Value          |
| ------------------- | -------------- |
| Baseline (no skill) | ~22,000 tokens |
| With skill          | ~3,000 tokens  |
| Reduction           | 85%            |

## Review cadence

Quarterly. Deprecate if the Salesforce schema changes >20% of the cached columns.

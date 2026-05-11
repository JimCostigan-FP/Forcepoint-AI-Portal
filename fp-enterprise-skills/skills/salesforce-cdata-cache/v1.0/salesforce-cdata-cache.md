name: salesforce-cdata-cache
description: "Use this skill for ANY Salesforce data query, pipeline analysis, revenue reporting, deal review, account health check, or sales analytics task that would otherwise require CData Connect AI. This skill caches Salesforce schemas, picklist values, and query patterns to eliminate redundant CData discovery calls (getInstructions, getTables, getColumns). ALWAYS read this skill before calling any CData tool for Salesforce data. Triggers: Salesforce, pipeline, opportunity, deal, revenue, ACV, TCV, closed-won, closed-lost, forecast, account health, quota, attainment, win rate, churn, renewal."

# Salesforce CData Query Cache

## Purpose

This skill eliminates redundant CData MCP discovery calls by caching schemas, picklist values, and query templates. Skip `getInstructions`, `getCatalogs`, `getSchemas`, `getTables`, and `getColumns` entirely. Go straight to `queryData`.

## Connection Reference

- **Catalog (Connection Name):** Salesforce
- **Schema:** Salesforce
- **Fully qualified format:** `[Salesforce].[Salesforce].[TableName]`

## CData SQL Dialect Rules

- Quote all identifiers with `[]` brackets
- Boolean: use `1` (true) / `0` (false)
- No multi-statement queries (one SELECT per call)
- No `DATEADD()` — use explicit dates like `'2025-01-01'`
- No `-` operator, `site:` operator, or quotes in WHERE unless needed
- Use `LIMIT` to cap result sets; always start with `LIMIT 10` for exploratory queries
- Use `IS NULL` / `IS NOT NULL` for null checks
- Subqueries supported; `NOT EXISTS` preferred over complex LEFT JOIN for exclusion logic
- Parameterize WHERE clauses with `@param` syntax to prevent SQL injection
- Aliases supported with `AS`
- Aggregates: `COUNT`, `SUM`, `AVG`, `MIN`, `MAX`
- JOINs: `INNER JOIN`, `LEFT JOIN`
- Date fields accept `'YYYY-MM-DD'` format

---

## Core Object Schemas

### Opportunity — Key Columns

| Column                    | Type      | Notes                                        |
| ------------------------- | --------- | -------------------------------------------- |
| Id                        | VARCHAR   | PK                                           |
| Name                      | VARCHAR   | Opp name                                     |
| AccountId                 | VARCHAR   | FK → Account.Id                              |
| OwnerId                   | VARCHAR   | FK → User.Id                                 |
| RecordTypeId              | VARCHAR   |                                              |
| StageName                 | VARCHAR   | See picklist below                           |
| Amount                    | DECIMAL   | Total amount                                 |
| Probability               | DOUBLE    | %                                            |
| CloseDate                 | DATE      |                                              |
| Type                      | VARCHAR   | Data quality issues — company names mixed in |
| IsClosed                  | BOOLEAN   |                                              |
| IsWon                     | BOOLEAN   |                                              |
| ForecastCategoryName      | VARCHAR   | See picklist below                           |
| CurrencyIsoCode           | VARCHAR   | Multi-currency                               |
| FiscalQuarter             | INTEGER   | 1–4                                          |
| FiscalYear                | INTEGER   | e.g. 2026                                    |
| Fiscal                    | VARCHAR   | e.g. "Q1 FY2026"                             |
| SBQQ__Renewal__c          | BOOLEAN   | Is renewal opp                               |
| SBQQ__PrimaryQuote__c     | VARCHAR   | FK → Quote                                   |
| Loss_Reason__c            | VARCHAR   | See picklist below                           |
| Closed_Reason__c          | VARCHAR   |                                              |
| ACV__c                    | DECIMAL   | Total ACV (calculated)                       |
| ACV_New__c                | DECIMAL   | ACV from new business                        |
| ACV_Renew__c              | DECIMAL   | ACV from renewals                            |
| ACV_Services__c           | DECIMAL   | ACV from services                            |
| ACV_Reporting__c          | DECIMAL   | Use for executive reporting                  |
| ACV_Reporting_New__c      | DECIMAL   |                                              |
| ACV_Reporting_Renew__c    | DECIMAL   |                                              |
| ACV_Reporting_Services__c | DECIMAL   |                                              |
| Adjusted_ACV__c           | DECIMAL   |                                              |
| Total_Contract_Value__c   | DECIMAL   | TCV                                          |
| Contract_Start_Date__c    | DATE      |                                              |
| Contract_End_Date__c      | DATE      |                                              |
| CreatedDate               | TIMESTAMP |                                              |
| LastModifiedDate          | TIMESTAMP |                                              |
| PushCount                 | INTEGER   | Times close date pushed                      |
| LastStageChangeDate       | TIMESTAMP |                                              |
| Use_Case_s__c             | VARCHAR   |                                              |
| Primary_Competitor__c     | VARCHAR   |                                              |
| Competitors__c            | VARCHAR   |                                              |
| Renewal_Sentiment__c      | VARCHAR   |                                              |
| Route_To_Market__c        | VARCHAR   |                                              |
| LeadSource                | VARCHAR   |                                              |
| Lead_Sub_Source__c        | VARCHAR   |                                              |
| Qualified_Date__c         | TIMESTAMP |                                              |
| Reseller_Account__c       | VARCHAR   |                                              |
| Distributor_Account__c    | VARCHAR   |                                              |

### Account — Key Columns

| Column                              | Type      | Notes                       |
| ----------------------------------- | --------- | --------------------------- |
| Id                                  | VARCHAR   | PK                          |
| Name                                | VARCHAR   | Account name                |
| Type                                | VARCHAR   | See picklist below          |
| OwnerId                             | VARCHAR   | FK → User.Id                |
| Industry                            | VARCHAR   |                             |
| BillingCountry                      | VARCHAR   |                             |
| BillingState                        | VARCHAR   |                             |
| BillingCity                         | VARCHAR   |                             |
| CurrencyIsoCode                     | VARCHAR   |                             |
| Theatre__c                          | VARCHAR   | AMER, EMEA, APAC, LATAM     |
| Region__c                           | VARCHAR   | See picklist below          |
| Sub_Region__c                       | VARCHAR   |                             |
| Market_Segment__c                   | VARCHAR   |                             |
| Account_Tier__c                     | VARCHAR   |                             |
| ARR__c                              | DECIMAL   | Annual recurring revenue    |
| Current_Customer_Health__c          | VARCHAR   |                             |
| Gainsight_Health__c                 | VARCHAR   |                             |
| CSM_Sentiment__c                    | VARCHAR   |                             |
| Customer_Success_Account_Manager__c | VARCHAR   | FK → User                   |
| ParentId                            | VARCHAR   | FK → Account.Id (hierarchy) |
| IsPartner                           | BOOLEAN   |                             |
| Partner_Tier__c                     | VARCHAR   |                             |
| AnnualRevenue                       | DECIMAL   |                             |
| NumberOfEmployees                   | INTEGER   |                             |
| CreatedDate                         | TIMESTAMP |                             |
| LastActivityDate                    | DATE      |                             |
| Named_Account__c                    | BOOLEAN   |                             |
| Reporting_Account_Name__c           | VARCHAR   | Use for roll-up reporting   |

### User — Key Columns

| Column    | Type    | Notes                                 |
| --------- | ------- | ------------------------------------- |
| Id        | VARCHAR | PK — matches OwnerId on other objects |
| Name      | VARCHAR | Full name                             |
| FirstName | VARCHAR |                                       |
| LastName  | VARCHAR |                                       |
| Username  | VARCHAR | Email-format username                 |

### OpportunityLineItem — Key Columns

| Column               | Type    | Notes               |
| -------------------- | ------- | ------------------- |
| Id                   | VARCHAR | PK                  |
| OpportunityId        | VARCHAR | FK → Opportunity.Id |
| Product2Id           | VARCHAR | FK → Product2.Id    |
| ProductCode          | VARCHAR |                     |
| Name                 | VARCHAR | Product name        |
| Quantity             | DOUBLE  |                     |
| UnitPrice            | DECIMAL | Sale price          |
| TotalPrice           | DECIMAL |                     |
| ListPrice            | DECIMAL |                     |
| ACV__c               | DECIMAL | Line-level ACV      |
| ACV_New__c           | DECIMAL |                     |
| ACV_Renew__c         | DECIMAL |                     |
| ACV_Services__c      | DECIMAL |                     |
| Adjusted_ACV__c      | DECIMAL |                     |
| TCV__c               | DECIMAL | Line-level TCV      |
| Start_Date__c        | DATE    |                     |
| End_Date__c          | DATE    |                     |
| Transaction_Type__c  | VARCHAR |                     |
| Subscription_Term__c | DOUBLE  | Months              |
| ServiceDate          | DATE    |                     |

---

## Picklist Values (Cached)

**Opportunity.StageName**
`Pre-Qualification` → `Qualification` → `Discovery` → `Proof and Proposal` → `Negotiation` → `Purchase Order Issued` → `Closed Won` | `Closed Lost`

**Opportunity.ForecastCategoryName**
`Pipeline`, `Upside`, `Commit`, `Closed`, `Omitted`

**Opportunity.Loss_Reason__c**
`No Budget / Lost Funding`, `No Decision / Non-Responsive`, `Lost to Competitor`, `Price`, `Duplicate`, `Other`

**Account.Type**
`Prospect`, `Customer`, `Former Customer`, `Partner`, `Former Partner`, `Competitor`, `Analyst`, `Privately Held`, `Archived`

**Account.Theatre__c**
`AMER`, `EMEA`, `APAC`, `LATAM`

**Account.Region__c**
`NA East`, `NA West`, `NA Federal`, `Europe`, `META`, `India`, `Southeast Asia`, `East Asia`, `Oceania`, `South America`, `Central America`

---

## Query Templates

### Pipeline by Stage (Current Quarter)

```sql
SELECT [StageName], COUNT(*) AS cnt, SUM([Amount]) AS total_amount, SUM([ACV__c]) AS total_acv
FROM [Salesforce].[Salesforce].[Opportunity]
WHERE [IsClosed] = 0 AND [FiscalYear] = 2026 AND [FiscalQuarter] = 2
GROUP BY [StageName]
ORDER BY [StageName]
```

### Closed-Won Performance by Quarter

```sql
SELECT [FiscalYear], [FiscalQuarter], COUNT(*) AS deals, SUM([Amount]) AS total_amount,
       SUM([ACV__c]) AS total_acv, SUM([ACV_Reporting__c]) AS reporting_acv
FROM [Salesforce].[Salesforce].[Opportunity]
WHERE [IsWon] = 1 AND [FiscalYear] >= 2025
GROUP BY [FiscalYear], [FiscalQuarter]
ORDER BY [FiscalYear], [FiscalQuarter]
```

### Closed-Lost Analysis

```sql
SELECT [Loss_Reason__c], COUNT(*) AS cnt, SUM([Amount]) AS lost_amount, SUM([ACV__c]) AS lost_acv
FROM [Salesforce].[Salesforce].[Opportunity]
WHERE [StageName] = 'Closed Lost' AND [CloseDate] >= '2025-07-01'
GROUP BY [Loss_Reason__c]
ORDER BY lost_acv DESC
```

### Pipeline with Account and Owner Names

```sql
SELECT o.[Name], o.[StageName], o.[Amount], o.[ACV__c], o.[CloseDate], o.[ForecastCategoryName],
       a.[Name] AS AccountName, a.[Theatre__c], a.[Region__c],
       u.[Name] AS OwnerName
FROM [Salesforce].[Salesforce].[Opportunity] o
LEFT JOIN [Salesforce].[Salesforce].[Account] a ON o.[AccountId] = a.[Id]
LEFT JOIN [Salesforce].[Salesforce].[User] u ON o.[OwnerId] = u.[Id]
WHERE o.[IsClosed] = 0
ORDER BY o.[Amount] DESC
LIMIT 50
```

### Account Health Review

```sql
SELECT a.[Name], a.[Type], a.[Theatre__c], a.[Region__c], a.[ARR__c],
       a.[Current_Customer_Health__c], a.[Gainsight_Health__c], a.[CSM_Sentiment__c],
       a.[Account_Tier__c], a.[Named_Account__c]
FROM [Salesforce].[Salesforce].[Account] a
WHERE a.[Type] = 'Customer' AND a.[ARR__c] > 0
ORDER BY a.[ARR__c] DESC
LIMIT 50
```

### Renewal Pipeline

```sql
SELECT o.[Name], o.[Amount], o.[ACV_Renew__c], o.[CloseDate], o.[StageName],
       o.[Renewal_Sentiment__c], a.[Name] AS AccountName, u.[Name] AS OwnerName
FROM [Salesforce].[Salesforce].[Opportunity] o
LEFT JOIN [Salesforce].[Salesforce].[Account] a ON o.[AccountId] = a.[Id]
LEFT JOIN [Salesforce].[Salesforce].[User] u ON o.[OwnerId] = u.[Id]
WHERE o.[SBQQ__Renewal__c] = 1 AND o.[IsClosed] = 0
ORDER BY o.[CloseDate] ASC
LIMIT 50
```

### ACV by Product Line (Line Item Detail)

```sql
SELECT li.[ProductCode], li.[Name] AS ProductName,
       COUNT(*) AS line_count, SUM(li.[ACV__c]) AS total_acv,
       SUM(li.[ACV_New__c]) AS new_acv, SUM(li.[ACV_Renew__c]) AS renew_acv,
       SUM(li.[TCV__c]) AS total_tcv
FROM [Salesforce].[Salesforce].[OpportunityLineItem] li
INNER JOIN [Salesforce].[Salesforce].[Opportunity] o ON li.[OpportunityId] = o.[Id]
WHERE o.[IsWon] = 1 AND o.[FiscalYear] = 2026
GROUP BY li.[ProductCode], li.[Name]
ORDER BY total_acv DESC
LIMIT 30
```

### Specific Account Opportunities

```sql
SELECT o.[Name], o.[StageName], o.[Amount], o.[ACV__c], o.[CloseDate],
       o.[ForecastCategoryName], o.[Type], u.[Name] AS OwnerName
FROM [Salesforce].[Salesforce].[Opportunity] o
LEFT JOIN [Salesforce].[Salesforce].[User] u ON o.[OwnerId] = u.[Id]
WHERE o.[AccountId] IN (
  SELECT [Id] FROM [Salesforce].[Salesforce].[Account]
  WHERE [Name] LIKE @accountName
)
ORDER BY o.[CloseDate] DESC
LIMIT 20
```

---

## Routing Rules

### ALWAYS use queryData directly (skip discovery)

- You have the connection name: `Salesforce`
- You have the schema: `Salesforce`
- You have the table and column names above
- You have the picklist values above
- **Do NOT call:** `getInstructions`, `getCatalogs`, `getSchemas`, `getTables`, `getColumns`

### When to STILL call getColumns

- Querying a custom object (table ending in `__c`) not listed above
- Querying a table not documented here (e.g., `Campaign`, `Case`, `Lead`, `Product2`)
- User asks about fields not in the cached schema above

---

## Performance Tips

- Always filter on date fields (`CreatedDate`, `CloseDate`, `LastModifiedDate`) to avoid timeouts
- Use `LIMIT` on exploratory queries
- Use `FiscalYear`/`FiscalQuarter` for quarterly analysis instead of date ranges
- Prefer `ACV_Reporting__c` over `ACV__c` for executive-facing numbers
- Use `Reporting_Account_Name__c` on Account for roll-up reporting
- Start simple, add JOINs incrementally
- Use parameterized queries with `@param` for WHERE filters

---

## ACV Field Guide

| Field                     | Use for                                              |
| ------------------------- | ---------------------------------------------------- |
| `ACV__c`                  | Calculated total ACV (sum of new + renew + services) |
| `ACV_Reporting__c`        | Executive/board reporting                            |
| `ACV_New__c`              | New business component                               |
| `ACV_Renew__c`            | Renewal component                                    |
| `ACV_Services__c`         | Services component                                   |
| `Adjusted_ACV__c`         | Adjusted for currency/other factors                  |
| `Amount`                  | Total opportunity amount (not ACV-specific)          |
| `Total_Contract_Value__c` | TCV                                                  |

Same fields exist at `OpportunityLineItem` level for line-item analysis.

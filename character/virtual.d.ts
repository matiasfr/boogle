declare module 'virtual:asset-catalogue' {
  export const entries: import('../dev/assets/manifest.ts').AssetHealth[];
  export const totals: {
    bytes: number;
    budgetKB: number;
    firstBytes: number;
    firstBudgetKB: number;
    flags: string[];
  };
}

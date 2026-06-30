import { isLiability } from "@/lib/constants";

export interface AccountOption {
  id: string;
  name: string;
  type: string;
}

export function buildAccountSelectOptions(accounts: AccountOption[]) {
  const assets = accounts.filter((a) => !isLiability(a.type));
  const liabilities = accounts.filter((a) => isLiability(a.type));

  const options: { value: string; label: string; disabled?: boolean }[] = [];

  if (assets.length > 0) {
    options.push({ value: "__asset_header__", label: "— Asset accounts —", disabled: true });
    for (const account of assets) {
      options.push({ value: account.id, label: account.name });
    }
  }

  if (liabilities.length > 0) {
    options.push({ value: "__liability_header__", label: "— Liability accounts —", disabled: true });
    for (const account of liabilities) {
      options.push({ value: account.id, label: account.name });
    }
  }

  return options;
}

export function buildLiabilityAccountOptions(accounts: AccountOption[]) {
  return accounts
    .filter((a) => isLiability(a.type))
    .map((account) => ({ value: account.id, label: account.name }));
}

export function isAccountOptionHeader(value: string) {
  return value.startsWith("__") && value.endsWith("__");
}

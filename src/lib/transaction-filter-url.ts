export function buildTransactionsUrl(options: {
  accountId?: string | null;
  categoryId?: string | null;
  month?: string | null;
}) {
  const params = new URLSearchParams();

  if (options.accountId) {
    params.set("accountId", options.accountId);
  }
  if (options.categoryId) {
    params.set("categoryId", options.categoryId);
  }
  if (options.month) {
    params.set("month", options.month);
  }

  const query = params.toString();
  return query ? `/transactions?${query}` : "/transactions";
}

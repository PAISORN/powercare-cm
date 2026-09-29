import {
  stockListStateEntries,
  type StockListQuery,
  type StockListScope,
} from "../../../modules/store/stock-list-query";

export function StockListStateFields({
  query,
  scope,
}: {
  query: StockListQuery;
  scope: StockListScope;
}) {
  return stockListStateEntries(scope, query).map(([name, value]) => (
    <input key={name} name={name} type="hidden" value={value} />
  ));
}

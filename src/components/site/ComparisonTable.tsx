import { siteMessages } from "@/i18n/server";
import { fill } from "@/i18n/site";

/**
 * "How they differ" table for the comparison pages. Rows state only general, verifiable facts
 * about the other product (docs/10 "AEO"); the footnote names the month they were checked, because
 * other products change. Re-check them every few months and update `page.october2026`.
 */
export async function ComparisonTable({
  other,
  rows,
}: {
  other: string;
  rows: readonly (readonly [label: string, picstea: string, theirs: string])[];
}) {
  const t = await siteMessages();
  return (
    <>
      <table>
        <thead>
          <tr>
            <th scope="col"></th>
            <th scope="col">Picstea</th>
            <th scope="col">{other}</th>
          </tr>
        </thead>
        <tbody>
          {rows.map(([label, picstea, theirs]) => (
            <tr key={label}>
              <th scope="row">{label}</th>
              <td>{picstea}</td>
              <td>{theirs}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <p>
        <small>{fill(t.page.factsChecked, { other, month: t.page.october2026 })}</small>
      </p>
    </>
  );
}

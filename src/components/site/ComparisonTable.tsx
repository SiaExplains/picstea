/**
 * "How they differ" table for the comparison pages. Rows state only general, verifiable facts
 * about the other product (docs/10 "AEO"), with the month they were checked, because other
 * products change.
 */
export function ComparisonTable({
  other,
  rows,
  checked,
}: {
  other: string;
  rows: readonly (readonly [label: string, picstea: string, theirs: string])[];
  checked: string;
}) {
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
        <small>
          Facts about {other} checked in {checked} on its official website. Products change; check
          there for the latest.
        </small>
      </p>
    </>
  );
}

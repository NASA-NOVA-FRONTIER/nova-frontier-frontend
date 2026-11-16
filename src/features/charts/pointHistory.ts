export type PointReturn = {
  date: string;
  power: Readonly<Record<string, number | null>>;
};

export const pointHistory = (returns: readonly PointReturn[]) => {
  const rows = returns
    .map(({ date, power }) => {
      const hh = power.HH === undefined ? power.HHHH : power.HH;
      const hv = power.HV === undefined ? power.HVHV : power.HV;
      return {
        date,
        time: Date.parse(date),
        power,
        balance: typeof hh === "number" && typeof hv === "number" ? hv - hh : null,
      };
    })
    .filter((row) => Number.isFinite(row.time))
    .sort((a, b) => a.time - b.time);
  const channels = [
    ...new Set(
      rows.flatMap(({ power }) =>
        Object.keys(power).filter((key) => typeof power[key] === "number"),
      ),
    ),
  ];
  return { rows, channels, hasBalance: rows.some((row) => row.balance !== null) };
};

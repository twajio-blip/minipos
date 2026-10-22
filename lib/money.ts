export const money = (value: unknown) => Math.round((Number(value) + Number.EPSILON) * 100) / 100;
export const today = () => new Date().toISOString().slice(0, 10);

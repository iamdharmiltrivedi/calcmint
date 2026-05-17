// Pure converter. Works with any unit shape from src/constants/units.js:
//   factor-based: { factor }                            → linear conversion
//   function-based: { toBase, fromBase }                → temperature etc.

export function toBaseUnits(value, unit) {
  if (unit?.toBase) return unit.toBase(value);
  return value * unit.factor;
}

export function fromBaseUnits(baseValue, unit) {
  if (unit?.fromBase) return unit.fromBase(baseValue);
  return baseValue / unit.factor;
}

export function convert(value, fromUnit, toUnit) {
  if (typeof value !== 'number' || isNaN(value)) return null;
  if (!fromUnit || !toUnit) return null;
  if (fromUnit.key === toUnit.key) return value;
  const base = toBaseUnits(value, fromUnit);
  return fromBaseUnits(base, toUnit);
}

// Display formatter — handles wide value ranges without garbage trailing zeros.
export function formatConverted(value) {
  if (value == null || isNaN(value)) return '—';
  const abs = Math.abs(value);
  if (abs !== 0 && (abs < 1e-4 || abs >= 1e12)) {
    return value.toExponential(4);
  }
  // Round to 6 significant digits
  const rounded = parseFloat(value.toPrecision(6));
  return rounded.toLocaleString('en-IN', { maximumFractionDigits: 6 });
}

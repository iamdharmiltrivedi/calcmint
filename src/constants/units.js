// Unit-conversion catalogue with an Indian context.
//
// Each unit has a `factor` (how many BASE units equal one of this unit), unless
// the conversion is non-linear (temperature) in which case `toBase` / `fromBase`
// are provided.
//
// Regional area units (bigha, katha) vary by state — we use the most common
// values and surface a note on screen. State-specific behaviour can be added later.

export const UNIT_CATEGORIES = [
  {
    key: 'length',
    label: 'Length',
    icon: 'resize-outline',
    base: 'm',
    units: [
      { key: 'mm',   label: 'Millimetre',        short: 'mm',   factor: 0.001 },
      { key: 'cm',   label: 'Centimetre',        short: 'cm',   factor: 0.01 },
      { key: 'm',    label: 'Metre',             short: 'm',    factor: 1 },
      { key: 'km',   label: 'Kilometre',         short: 'km',   factor: 1000 },
      { key: 'inch', label: 'Inch',              short: 'in',   factor: 0.0254 },
      { key: 'ft',   label: 'Foot',              short: 'ft',   factor: 0.3048 },
      { key: 'yard', label: 'Yard / Gaj',        short: 'yd',   factor: 0.9144 },
      { key: 'mile', label: 'Mile',              short: 'mi',   factor: 1609.344 },
      { key: 'nmi',  label: 'Nautical mile',     short: 'nmi',  factor: 1852 },
    ],
  },

  {
    key: 'area',
    label: 'Area',
    icon: 'square-outline',
    base: 'sqm',
    note: 'Bigha and Katha vary by state. We use the most common values (UP/Bihar Pucca Bigha; West Bengal Katha).',
    units: [
      { key: 'sqmm',    label: 'Square millimetre',          short: 'mm²',    factor: 0.000001 },
      { key: 'sqcm',    label: 'Square centimetre',          short: 'cm²',    factor: 0.0001 },
      { key: 'sqin',    label: 'Square inch',                short: 'in²',    factor: 0.00064516 },
      { key: 'sqft',    label: 'Square foot',                short: 'sqft',   factor: 0.09290304 },
      { key: 'sqyd',    label: 'Square yard / Gaj²',         short: 'yd²',    factor: 0.83612736 },
      { key: 'sqm',     label: 'Square metre',               short: 'm²',     factor: 1 },
      { key: 'marla',   label: 'Marla (North India)',        short: 'marla',  factor: 25.2929 },
      { key: 'cent',    label: 'Cent (South India)',         short: 'cent',   factor: 40.4686 },
      { key: 'guntha',  label: 'Guntha (Maharashtra)',       short: 'guntha', factor: 101.171 },
      { key: 'ground',  label: 'Ground (Tamil Nadu)',        short: 'ground', factor: 222.967 },
      { key: 'katha',   label: 'Katha (West Bengal)',        short: 'katha',  factor: 66.89 },
      { key: 'kanal',   label: 'Kanal (Punjab/Haryana)',     short: 'kanal',  factor: 505.857 },
      { key: 'bigha',   label: 'Bigha (UP/Bihar Pucca)',     short: 'bigha',  factor: 2529.29 },
      { key: 'acre',    label: 'Acre',                        short: 'acre',   factor: 4046.86 },
      { key: 'hectare', label: 'Hectare',                     short: 'ha',     factor: 10000 },
      { key: 'sqkm',    label: 'Square kilometre',           short: 'km²',    factor: 1000000 },
    ],
  },

  {
    key: 'weight',
    label: 'Weight',
    icon: 'scale-outline',
    base: 'g',
    note: 'Tola = 11.6638 g (Indian gold standard). Masha and Ratti are sub-units used by jewellers.',
    units: [
      { key: 'mg',      label: 'Milligram',     short: 'mg',  factor: 0.001 },
      { key: 'g',       label: 'Gram',          short: 'g',   factor: 1 },
      { key: 'kg',      label: 'Kilogram',      short: 'kg',  factor: 1000 },
      { key: 'quintal', label: 'Quintal',       short: 'qtl', factor: 100000 },
      { key: 'tonne',   label: 'Tonne (metric)', short: 't',   factor: 1000000 },
      { key: 'ratti',   label: 'Ratti (gem)',   short: 'ratti', factor: 0.1215 },
      { key: 'masha',   label: 'Masha',         short: 'masha', factor: 0.972 },
      { key: 'tola',    label: 'Tola',          short: 'tola',  factor: 11.6638 },
      { key: 'oz',      label: 'Ounce',         short: 'oz',  factor: 28.3495 },
      { key: 'lb',      label: 'Pound',         short: 'lb',  factor: 453.592 },
    ],
  },

  {
    key: 'volume',
    label: 'Volume',
    icon: 'beaker-outline',
    base: 'L',
    note: 'US gallon = 3.785 L. UK gallon (imperial) = 4.546 L.',
    units: [
      { key: 'ml',     label: 'Millilitre',    short: 'ml',   factor: 0.001 },
      { key: 'L',      label: 'Litre',         short: 'L',    factor: 1 },
      { key: 'cup_us', label: 'US cup',        short: 'cup',  factor: 0.236588 },
      { key: 'pint_us',label: 'US pint',       short: 'pt',   factor: 0.473176 },
      { key: 'gal_us', label: 'US gallon',     short: 'gal',  factor: 3.78541 },
      { key: 'gal_uk', label: 'UK gallon',     short: 'gal UK', factor: 4.54609 },
      { key: 'floz_us',label: 'US fluid ounce',short: 'fl oz', factor: 0.0295735 },
      { key: 'cum',    label: 'Cubic metre',   short: 'm³',   factor: 1000 },
    ],
  },

  {
    key: 'temperature',
    label: 'Temperature',
    icon: 'thermometer-outline',
    base: 'C',
    units: [
      { key: 'C', label: 'Celsius',    short: '°C',
        toBase: (v) => v, fromBase: (v) => v },
      { key: 'F', label: 'Fahrenheit', short: '°F',
        toBase: (v) => (v - 32) * 5 / 9, fromBase: (v) => v * 9 / 5 + 32 },
      { key: 'K', label: 'Kelvin',     short: 'K',
        toBase: (v) => v - 273.15, fromBase: (v) => v + 273.15 },
    ],
  },

  {
    key: 'time',
    label: 'Time',
    icon: 'time-outline',
    base: 's',
    units: [
      { key: 'ms',  label: 'Millisecond', short: 'ms',  factor: 0.001 },
      { key: 's',   label: 'Second',      short: 's',   factor: 1 },
      { key: 'min', label: 'Minute',      short: 'min', factor: 60 },
      { key: 'h',   label: 'Hour',        short: 'h',   factor: 3600 },
      { key: 'day', label: 'Day',         short: 'd',   factor: 86400 },
      { key: 'wk',  label: 'Week',        short: 'wk',  factor: 604800 },
      { key: 'mo',  label: 'Month (30d)', short: 'mo',  factor: 2592000 },
      { key: 'yr',  label: 'Year (365d)', short: 'yr',  factor: 31536000 },
    ],
  },

  {
    key: 'speed',
    label: 'Speed',
    icon: 'speedometer-outline',
    base: 'mps',
    units: [
      { key: 'mps',  label: 'Metre / second',  short: 'm/s',  factor: 1 },
      { key: 'kmph', label: 'Kilometre / hr',  short: 'km/h', factor: 0.277778 },
      { key: 'mph',  label: 'Mile / hr',       short: 'mph',  factor: 0.44704 },
      { key: 'knot', label: 'Knot',            short: 'kn',   factor: 0.514444 },
    ],
  },
];

export const findCategory = (key) => UNIT_CATEGORIES.find((c) => c.key === key);
export const findUnit = (category, unitKey) =>
  category?.units.find((u) => u.key === unitKey);

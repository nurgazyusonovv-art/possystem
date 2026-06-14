import type { CafeSettings } from "./types";

// Чектин баштапкы маанилери (база жүктөлгөнчө же жок болсо колдонулат)
export const DEFAULT_SETTINGS: CafeSettings = {
  name: "Менин Кафе",
  address: "",
  phone: "",
  footer: "Рахмат! Дагы келиңиз 🙏",
  receipt_width: 80,
};

// Чек басууда синхрондуу окуу үчүн модулдук кэш
let _cache: CafeSettings = DEFAULT_SETTINGS;

export function cachedSettings(): CafeSettings {
  return _cache;
}

export function setCachedSettings(s: Partial<CafeSettings>) {
  _cache = { ...DEFAULT_SETTINGS, ..._cache, ...s };
}

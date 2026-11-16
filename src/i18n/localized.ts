import { tr } from "@/i18n/translate";

// One proxy per object, so `CASES[0] === CASES[0]` keeps holding for code that compares them.
const proxies = new WeakMap<object, object>();
const created = new WeakSet<object>();

// Wraps a copy object so every string in it is translated when it is read, not when the module
// loads. Components keep writing `TOP_BAR.help`; the text follows the language of the moment.
// Functions inside the object are returned as they are: they translate with `tr` themselves.
export const localized = <T extends object>(source: T): T => {
  if (created.has(source)) return source;
  const known = proxies.get(source);
  if (known !== undefined) return known as T;
  const proxy = new Proxy(source, {
    get(target, property, receiver) {
      const value: unknown = Reflect.get(target, property, receiver);
      if (typeof value === "string") return tr(value);
      if (typeof value === "object" && value !== null) return localized(value);
      return value;
    },
  });
  proxies.set(source, proxy);
  created.add(proxy);
  return proxy;
};

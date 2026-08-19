// Yalnızca gerçek, harici http(s) hedeflerini kullanıcıya açar. Eski etkinlik
// kayıtlarında kalmış "/" gibi hedeflerin uygulamayı kendi ana sayfasına
// yönlendirmesini bu ortak kontrol engeller.
export const getSafeExternalUrl = (value) => {
  if (typeof value !== 'string' || !value.trim()) return null;

  try {
    const url = new URL(value.trim());
    return ['http:', 'https:'].includes(url.protocol) && url.hostname ? url.toString() : null;
  } catch {
    return null;
  }
};

export const isSafeExternalUrl = (value) => Boolean(getSafeExternalUrl(value));

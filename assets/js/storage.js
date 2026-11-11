const prefix = 'smmpro-schema:';

export function read(key, fallback) {
  try {
    const value = localStorage.getItem(prefix + key);
    return value === null ? fallback : JSON.parse(value);
  } catch {
    return fallback;
  }
}

export function write(key, value) {
  try {
    localStorage.setItem(prefix + key, JSON.stringify(value));
    return true;
  } catch {
    return false;
  }
}

export function clearData() {
  try {
    for (let index = localStorage.length - 1; index >= 0; index--) {
      const key = localStorage.key(index);
      if (key && key.startsWith(prefix)) localStorage.removeItem(key);
    }
    return true;
  } catch {
    return false;
  }
}

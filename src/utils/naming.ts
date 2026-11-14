const PREFIX_MATCH_RE = /(?!xmlns)^.*:/;

/**
 * @param tagName
 */
export function camelCase(tagName: string) {
  const str = tagName.replace(PREFIX_MATCH_RE, '');
  if (str.length === 1) {
    return str.toLowerCase();
  }
  const secondLetter = str.charAt(1);
  if (secondLetter && secondLetter.toUpperCase() !== secondLetter) {
    return str.charAt(0).toLowerCase() + str.slice(1);
  }
  return str;
}

export function toCamelCase(name: string) {
  const len = name.length;
  if (len === 0) {
    return name;
  }
  const c0 = name.charCodeAt(0);
  if (c0 >= 97 && c0 <= 122) {
    return name;
  }
  if (len === 1) {
    return c0 >= 65 && c0 <= 90 ? String.fromCharCode(c0 + 32) : name.toLowerCase();
  }
  const c1 = name.charCodeAt(1);
  // Lowercase first only when second is a-z (same rule as camelCase / ONVIF H264, G711...).
  if (c1 < 97 || c1 > 122) {
    return name;
  }
  if (c0 >= 65 && c0 <= 90) {
    return String.fromCharCode(c0 + 32) + name.slice(1);
  }
  return name.charAt(0).toLowerCase() + name.slice(1);
}

export function toPascalCase(name: string) {
  const len = name.length;
  if (len === 0) {
    return name;
  }
  const c0 = name.charCodeAt(0);
  if (c0 >= 65 && c0 <= 90) {
    return name;
  }
  const c1 = len > 1 ? name.charCodeAt(1) : 0;
  if (c1 >= 65 && c1 <= 90) {
    return name;
  }
  if (c0 >= 97 && c0 <= 122) {
    return String.fromCharCode(c0 - 32) + name.slice(1);
  }
  return name.charAt(0).toUpperCase() + name.slice(1);
}

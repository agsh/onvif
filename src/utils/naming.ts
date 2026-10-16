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
  if (name.length === 1) {
    return name.toLowerCase();
  }
  const secondLetter = name.charAt(1);
  if (secondLetter && secondLetter.toUpperCase() !== secondLetter) {
    return name.charAt(0).toLowerCase() + name.slice(1);
  }
  return name;
}

export function toPascalCase(name: string) {
  const secondLetter = name.charAt(1);
  if (secondLetter && secondLetter.toUpperCase() !== secondLetter) {
    return name.charAt(0).toUpperCase() + name.slice(1);
  }
  return name;
}

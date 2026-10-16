/**
 * Split Digest authentication string
 */
export function splitArgs(args: string): string[] {
  let buffer = '';
  const result = [];
  let quoteOpen = false;
  for (const i of args) {
    if (quoteOpen) {
      if (i === '"') {
        quoteOpen = false;
      }
      buffer += i;
      continue;
    }
    if (i === ',') {
      result.push(buffer.trim());
      buffer = '';
    } else {
      if (i === '"') {
        quoteOpen = true;
      }
      buffer += i;
    }
  }
  result.push(buffer.trim());
  return result;
}

/**
 * Get Digest headers from headers array
 * @param headersArray
 */
export function getDigestHeaders(headersArray: string[]) {
  const wwwAuthenticateArray = [];
  for (let x = 0; x < headersArray.length; x = x + 2) {
    if (headersArray[x].toLowerCase() === 'www-authenticate' && headersArray[x + 1].startsWith('Digest')) {
      wwwAuthenticateArray.push(headersArray[x + 1]);
    }
  }
  return wwwAuthenticateArray;
}

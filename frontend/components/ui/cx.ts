/** Join class names, skipping falsy values. Pass layout classes (margin, width) through
 *  `className`; never pass colors or sizes that fight a primitive's own variant. */
export function cx(...parts: Array<string | false | null | undefined>): string {
  return parts.filter(Boolean).join(' ')
}

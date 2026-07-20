// Match a tailored-CV PDF in output/ to a tracker company name. The tricky case:
// the tracker stores the full legal name ("EPAM Systems") while the file on disk
// was named with only the distinctive leading token ("…-EPAM-cv.pdf") — often
// because the CLI pdf mode and the web pdf mode slugged the company differently.
// Full-slug matches win; the leading token is a fallback so a real CV isn't hidden.

/** company → hyphen-joined lowercase alphanumeric tokens ("EPAM Systems" → "epam-systems"). */
export function companySlug(company: string): string {
  return (company.toLowerCase().match(/[a-z0-9]+/g) ?? []).join("-");
}

/** A regex that matches `slug` only at token boundaries (delimited by non-alphanumerics),
 *  so "meta" never matches inside "metabase". */
export function tokenBoundaryRe(slug: string): RegExp {
  return new RegExp(`(^|[^a-z0-9])${slug.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}([^a-z0-9]|$)`, "i");
}

/**
 * Return the subset of `files` (any casing) that plausibly belong to `company`.
 * Precedence: files matching the FULL company slug win; if none match, fall back
 * to the distinctive leading token (≥3 chars, only when the name has >1 token) so
 * "EPAM Systems" still resolves "…-EPAM-cv.pdf". Order of the input is preserved.
 */
export function matchCvFiles(files: string[], company: string): string[] {
  const tokens = company.toLowerCase().match(/[a-z0-9]+/g) ?? [];
  if (!tokens.length) return [];
  const pdfs = files.filter((f) => f.toLowerCase().endsWith(".pdf"));

  const full = tokens.join("-");
  const byFull = pdfs.filter((f) => tokenBoundaryRe(full).test(f.toLowerCase()));
  if (byFull.length) return byFull;

  const first = tokens[0];
  if (first !== undefined && tokens.length > 1 && first.length >= 3) {
    return pdfs.filter((f) => tokenBoundaryRe(first).test(f.toLowerCase()));
  }
  return [];
}

/**
 * Formats a date string to US format (MM/DD/YYYY).
 * Handles various input formats including ISO timestamps and Google Books API formats.
 * @param dateString The date string to format.
 * @returns The formatted date string in US format, or the original if parsing fails.
 */
export function formatUSDate(dateString: string): string {
  if (!dateString) return "";

  // Check if it's an ISO timestamp (contains 'T' or ends with 'Z')
  if (dateString.includes('T') || dateString.endsWith('Z')) {
    try {
      const date = new Date(dateString);
      if (!isNaN(date.getTime())) {
        // Format as MM/DD/YYYY
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        const year = date.getFullYear();
        return `${month}/${day}/${year}`;
      }
    } catch {
      // Fall through to other parsing methods
    }
  }

  // Handle different formats from Google Books API
  const parts = dateString.split("-");

  if (parts.length === 1) {
    // Just a year (e.g., "2019")
    return dateString;
  }

  if (parts.length === 2) {
    // Year and month (e.g., "2019-10")
    const [year, month] = parts;
    return `${month}/${year}`;
  }

  if (parts.length === 3) {
    // Full date (e.g., "2019-10-01")
    const [year, month, day] = parts;
    return `${month}/${day}/${year}`;
  }

  // Fallback: return as-is if format is unexpected
  return dateString;
}

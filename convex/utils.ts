export function formatPhoneNumber(phone: string): string {
  if (!phone) return "";

  let formatted = phone.replace(/\s/g, "");

  if (formatted.startsWith("+57")) {
    formatted = formatted.slice(3);
  }

  if (formatted.startsWith("0")) {
    formatted = formatted.slice(1);
  }

  return formatted;
}

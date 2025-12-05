export function getConvexErrorMessage(error: string) {
  return error.split("ConvexError: ")[1].split(" at ")[0].trim();
}

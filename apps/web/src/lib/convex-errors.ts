export function getConvexErrorMessage(error: string) {
  console.error("Convex error: ", error);
  return error.split("ConvexError: ")[1].split(" at ")[0].trim();
}

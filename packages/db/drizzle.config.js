if (!process.env.DATABASE_URL) {
    throw new Error("Missing DATABASE_URL");
}
export default {
    dialect: "postgresql",
    dbCredentials: {
        url: process.env.DATABASE_URL,
    },
    schema: "./src/schema.ts",
    casing: "snake_case",
    out: "./drizzle",
};

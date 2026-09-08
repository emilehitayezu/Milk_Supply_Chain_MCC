import mysql from "mysql2/promise";

export const mysqlPool = mysql.createPool({
  host: process.env.MYSQL_HOST ?? "127.0.0.1",
  port: Number(process.env.MYSQL_PORT ?? 3306),
  user: process.env.MYSQL_USER ?? "root",
  password: process.env.MYSQL_PASSWORD ?? "",
  database: process.env.MYSQL_DATABASE ?? "new_milk",
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
});

export async function query<T = unknown>(sql: string, values: unknown[] = []): Promise<[T, unknown]> {
  const [rows, fields] = await mysqlPool.execute(sql, values as any[]);
  return [rows as T, fields as unknown];
}

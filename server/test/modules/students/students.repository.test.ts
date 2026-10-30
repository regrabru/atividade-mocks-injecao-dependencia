import type { Database } from "../../../src/database/connection";
import {
  PgStudentRepository,
  type Student,
} from "../../../src/modules/students/students.repository";

const normalize = (sql: string) => sql.replace(/\s+/g, " ").trim();

function createDatabaseMock() {
  const query = jest.fn<Promise<{ rows: any[] }>, [string, unknown[]?]>();
  const db: Database = { query };
  return { db, query };
}

describe("PgStudentRepository", () => {
  let query: ReturnType<typeof createDatabaseMock>["query"];
  let repository: PgStudentRepository;

  beforeEach(() => {
    const mock = createDatabaseMock();
    query = mock.query;
    repository = new PgStudentRepository(mock.db);
  });

  describe("create", () => {
    test("retorna a linha criada e envia INSERT com RETURNING ra, name e parâmetros [ra, name]", async () => {
      const row: Student = { ra: 123, name: "Ana" };
      query.mockResolvedValue({ rows: [row] });

      const result = await repository.create({ ra: 123, name: "Ana" });

      expect(result).toEqual(row);
      expect(query).toHaveBeenCalledTimes(1);
      const [sql, params] = query.mock.calls[0];
      expect(normalize(sql)).toBe(
        "INSERT INTO students (ra, name) VALUES ($1, $2) RETURNING ra, name",
      );
      expect(params).toEqual([123, "Ana"]);
    });

    test("propaga a mesma instância de Error do banco", async () => {
      const failure = new Error("falha do banco");
      query.mockRejectedValue(failure);

      await expect(repository.create({ ra: 123, name: "Ana" })).rejects.toBe(failure);
    });
  });

  describe("findAll", () => {
    test("retorna as linhas simuladas e consulta ra, name com ORDER BY name, sem parâmetros", async () => {
      const rows: Student[] = [
        { ra: 123, name: "Ana" },
        { ra: 456, name: "Bruno" },
      ];
      query.mockResolvedValue({ rows });

      const result = await repository.findAll();

      expect(result).toEqual(rows);
      expect(query).toHaveBeenCalledTimes(1);
      const [sql, params] = query.mock.calls[0];
      expect(normalize(sql)).toBe("SELECT ra, name FROM students ORDER BY name");
      expect(params).toBeUndefined();
    });

    test("retorna [] quando não há registros", async () => {
      query.mockResolvedValue({ rows: [] });

      await expect(repository.findAll()).resolves.toEqual([]);
    });

    test("propaga a mesma instância de Error do banco", async () => {
      const failure = new Error("falha do banco");
      query.mockRejectedValue(failure);

      await expect(repository.findAll()).rejects.toBe(failure);
    });
  });

  describe("findOne", () => {
    test("retorna a primeira linha e filtra por ra = $1 com parâmetros [123]", async () => {
      const row: Student = { ra: 123, name: "Ana" };
      query.mockResolvedValue({ rows: [row] });

      const result = await repository.findOne(123);

      expect(result).toEqual(row);
      expect(query).toHaveBeenCalledTimes(1);
      const [sql, params] = query.mock.calls[0];
      expect(normalize(sql)).toBe("SELECT ra, name FROM students WHERE ra = $1");
      expect(params).toEqual([123]);
    });

    test("retorna undefined quando não há linhas", async () => {
      query.mockResolvedValue({ rows: [] });

      await expect(repository.findOne(123)).resolves.toBeUndefined();
    });

    test("propaga a mesma instância de Error do banco", async () => {
      const failure = new Error("falha do banco");
      query.mockRejectedValue(failure);

      await expect(repository.findOne(123)).rejects.toBe(failure);
    });
  });
});

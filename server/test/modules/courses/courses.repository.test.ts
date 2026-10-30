import type { Database } from "../../../src/database/connection";
import {
  PgCourseRepository,
  type Course,
} from "../../../src/modules/courses/courses.repository";

// Remove diferenças de espaços e quebras de linha para comparar o SQL.
const normalize = (sql: string) => sql.replace(/\s+/g, " ").trim();

function createDatabaseMock() {
  const query = jest.fn<Promise<{ rows: any[] }>, [string, unknown[]?]>();
  const db: Database = { query };
  return { db, query };
}

describe("PgCourseRepository", () => {
  let query: ReturnType<typeof createDatabaseMock>["query"];
  let repository: PgCourseRepository;

  beforeEach(() => {
    const mock = createDatabaseMock();
    query = mock.query;
    repository = new PgCourseRepository(mock.db);
  });

  describe("create", () => {
    test("retorna a linha criada e envia INSERT com RETURNING id, name e parâmetros [name]", async () => {
      const row: Course = { id: 7, name: "Qualidade" };
      query.mockResolvedValue({ rows: [row] });

      const result = await repository.create({ name: "Qualidade" });

      expect(result).toEqual(row);
      expect(query).toHaveBeenCalledTimes(1);
      const [sql, params] = query.mock.calls[0];
      expect(normalize(sql)).toBe(
        "INSERT INTO courses (name) VALUES ($1) RETURNING id, name",
      );
      expect(params).toEqual(["Qualidade"]);
    });

    test("propaga a mesma instância de Error do banco", async () => {
      const failure = new Error("falha do banco");
      query.mockRejectedValue(failure);

      await expect(repository.create({ name: "Qualidade" })).rejects.toBe(failure);
    });
  });

  describe("findAll", () => {
    test("retorna as linhas simuladas e consulta id, name com ORDER BY id, sem parâmetros", async () => {
      const rows: Course[] = [
        { id: 1, name: "Qualidade" },
        { id: 2, name: "Testes" },
      ];
      query.mockResolvedValue({ rows });

      const result = await repository.findAll();

      expect(result).toEqual(rows);
      expect(query).toHaveBeenCalledTimes(1);
      const [sql, params] = query.mock.calls[0];
      expect(normalize(sql)).toBe("SELECT id, name FROM courses ORDER BY id");
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
    test("retorna a primeira linha e filtra por id = $1 com parâmetros [7]", async () => {
      const row: Course = { id: 7, name: "Qualidade" };
      query.mockResolvedValue({ rows: [row] });

      const result = await repository.findOne(7);

      expect(result).toEqual(row);
      expect(query).toHaveBeenCalledTimes(1);
      const [sql, params] = query.mock.calls[0];
      expect(normalize(sql)).toBe("SELECT id, name FROM courses WHERE id = $1");
      expect(params).toEqual([7]);
    });

    test("retorna undefined quando não há linhas", async () => {
      query.mockResolvedValue({ rows: [] });

      await expect(repository.findOne(7)).resolves.toBeUndefined();
    });

    test("propaga a mesma instância de Error do banco", async () => {
      const failure = new Error("falha do banco");
      query.mockRejectedValue(failure);

      await expect(repository.findOne(7)).rejects.toBe(failure);
    });
  });
});

import type { Database } from "../../../src/database/connection";
import {
  PgEnrollmentRepository,
  type Enrollment,
} from "../../../src/modules/enrollments/enrollments.repository";

const normalize = (sql: string) => sql.replace(/\s+/g, " ").trim();

function createDatabaseMock() {
  const query = jest.fn<Promise<{ rows: any[] }>, [string, unknown[]?]>();
  const db: Database = { query };
  return { db, query };
}

const COLUMNS =
  'student_ra AS "studentRa", course_id AS "courseId", enrolled_at AS "enrolledAt"';
const enrolledAt = new Date("2026-01-15T10:00:00.000Z");

describe("PgEnrollmentRepository", () => {
  let query: ReturnType<typeof createDatabaseMock>["query"];
  let repository: PgEnrollmentRepository;

  beforeEach(() => {
    const mock = createDatabaseMock();
    query = mock.query;
    repository = new PgEnrollmentRepository(mock.db);
  });

  describe("create", () => {
    test("retorna a linha criada (camelCase e data simulada) e envia INSERT com RETURNING com aliases e parâmetros [123, 7]", async () => {
      const row: Enrollment = { studentRa: 123, courseId: 7, enrolledAt };
      query.mockResolvedValue({ rows: [row] });

      const result = await repository.create(123, 7);

      expect(result).toEqual(row);
      expect(result.enrolledAt).toBe(enrolledAt);
      expect(query).toHaveBeenCalledTimes(1);
      const [sql, params] = query.mock.calls[0];
      expect(normalize(sql)).toBe(
        `INSERT INTO enrollments (student_ra, course_id) VALUES ($1, $2) RETURNING ${COLUMNS}`,
      );
      expect(params).toEqual([123, 7]);
    });

    test("propaga a mesma instância de Error do banco", async () => {
      const failure = new Error("falha do banco");
      query.mockRejectedValue(failure);

      await expect(repository.create(123, 7)).rejects.toBe(failure);
    });
  });

  describe("findAll", () => {
    test("retorna as linhas simuladas e consulta com aliases e ORDER BY student_ra, course_id, sem parâmetros", async () => {
      const rows: Enrollment[] = [
        { studentRa: 123, courseId: 7, enrolledAt },
        { studentRa: 456, courseId: 2, enrolledAt },
      ];
      query.mockResolvedValue({ rows });

      const result = await repository.findAll();

      expect(result).toEqual(rows);
      expect(query).toHaveBeenCalledTimes(1);
      const [sql, params] = query.mock.calls[0];
      expect(normalize(sql)).toBe(
        `SELECT ${COLUMNS} FROM enrollments ORDER BY student_ra, course_id`,
      );
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
    test("retorna a primeira linha e filtra por student_ra = $1 AND course_id = $2 com parâmetros [123, 7]", async () => {
      const row: Enrollment = { studentRa: 123, courseId: 7, enrolledAt };
      query.mockResolvedValue({ rows: [row] });

      const result = await repository.findOne(123, 7);

      expect(result).toEqual(row);
      expect(query).toHaveBeenCalledTimes(1);
      const [sql, params] = query.mock.calls[0];
      expect(normalize(sql)).toBe(
        `SELECT ${COLUMNS} FROM enrollments WHERE student_ra = $1 AND course_id = $2`,
      );
      expect(params).toEqual([123, 7]);
    });

    test("retorna undefined quando não há linhas", async () => {
      query.mockResolvedValue({ rows: [] });

      await expect(repository.findOne(123, 7)).resolves.toBeUndefined();
    });

    test("propaga a mesma instância de Error do banco", async () => {
      const failure = new Error("falha do banco");
      query.mockRejectedValue(failure);

      await expect(repository.findOne(123, 7)).rejects.toBe(failure);
    });
  });
});

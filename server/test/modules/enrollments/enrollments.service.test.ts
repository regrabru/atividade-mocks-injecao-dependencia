import { HttpError } from "../../../src/errors";
import { EnrollmentsService } from "../../../src/modules/enrollments/enrollments.service";
import type {
  Enrollment,
  EnrollmentRepository,
} from "../../../src/modules/enrollments/enrollments.repository";

function createRepositoryMock() {
  return {
    create: jest.fn<ReturnType<EnrollmentRepository["create"]>, Parameters<EnrollmentRepository["create"]>>(),
    findAll: jest.fn<ReturnType<EnrollmentRepository["findAll"]>, Parameters<EnrollmentRepository["findAll"]>>(),
    findOne: jest.fn<ReturnType<EnrollmentRepository["findOne"]>, Parameters<EnrollmentRepository["findOne"]>>(),
  } satisfies EnrollmentRepository;
}

async function expectHttpError(promise: Promise<unknown>, statusCode: number) {
  const error = await promise.then(
    () => undefined,
    (e: unknown) => e,
  );
  expect(error).toBeInstanceOf(HttpError);
  expect((error as HttpError).statusCode).toBe(statusCode);
}

const enrolledAt = new Date("2026-01-15T10:00:00.000Z");
const enrollment: Enrollment = { studentRa: 123, courseId: 1, enrolledAt };

describe("EnrollmentsService", () => {
  let repository: ReturnType<typeof createRepositoryMock>;
  let service: EnrollmentsService;

  beforeEach(() => {
    repository = createRepositoryMock();
    service = new EnrollmentsService(repository);
  });

  describe("create", () => {
    test("cria a matrícula válida, retorna o registro e chama repository.create com (123, 1)", async () => {
      repository.create.mockResolvedValue(enrollment);

      const result = await service.create({ studentRa: 123, courseId: 1 });

      expect(result).toEqual(enrollment);
      expect(repository.create).toHaveBeenCalledTimes(1);
      expect(repository.create).toHaveBeenCalledWith(123, 1);
    });

    test.each<[string, unknown]>([
      ["studentRa 0", { studentRa: 0, courseId: 1 }],
      ["courseId 0", { studentRa: 123, courseId: 0 }],
    ])("rejeita chave inválida (%s) com erro 400 e não chama repository.create", async (_label, input) => {
      await expectHttpError(service.create(input), 400);

      expect(repository.create).not.toHaveBeenCalled();
    });

    test("traduz violação de chave estrangeira (23503) em erro 404", async () => {
      repository.create.mockRejectedValue({ code: "23503" });

      await expectHttpError(service.create({ studentRa: 123, courseId: 1 }), 404);
    });

    test("traduz violação de unicidade (23505) em erro 409 (matrícula duplicada)", async () => {
      repository.create.mockRejectedValue({ code: "23505" });

      await expectHttpError(service.create({ studentRa: 123, courseId: 1 }), 409);
    });

    test("propaga a mesma instância de Error inesperado na criação", async () => {
      const failure = new Error("falha inesperada");
      repository.create.mockRejectedValue(failure);

      await expect(service.create({ studentRa: 123, courseId: 1 })).rejects.toBe(failure);
    });
  });

  describe("findAll", () => {
    test("retorna a lista simulada e chama repository.findAll uma vez, sem argumentos", async () => {
      const list: Enrollment[] = [
        enrollment,
        { studentRa: 456, courseId: 2, enrolledAt },
      ];
      repository.findAll.mockResolvedValue(list);

      const result = await service.findAll();

      expect(result).toEqual(list);
      expect(repository.findAll).toHaveBeenCalledTimes(1);
      expect(repository.findAll).toHaveBeenCalledWith();
    });
  });

  describe("findOne", () => {
    test("retorna a matrícula existente e chama repository.findOne uma vez com (123, 1)", async () => {
      repository.findOne.mockResolvedValue(enrollment);

      const result = await service.findOne(123, 1);

      expect(result).toEqual(enrollment);
      expect(repository.findOne).toHaveBeenCalledTimes(1);
      expect(repository.findOne).toHaveBeenCalledWith(123, 1);
    });

    test("lança erro 404 quando não existe e encaminha os dois identificadores na ordem correta", async () => {
      repository.findOne.mockResolvedValue(undefined);

      await expectHttpError(service.findOne(123, 1), 404);

      expect(repository.findOne).toHaveBeenCalledTimes(1);
      expect(repository.findOne).toHaveBeenCalledWith(123, 1);
    });
  });
});

import { HttpError } from "../../../src/errors";
import { StudentsService } from "../../../src/modules/students/students.service";
import type {
  Student,
  StudentRepository,
} from "../../../src/modules/students/students.repository";

function createRepositoryMock() {
  return {
    create: jest.fn<ReturnType<StudentRepository["create"]>, Parameters<StudentRepository["create"]>>(),
    findAll: jest.fn<ReturnType<StudentRepository["findAll"]>, Parameters<StudentRepository["findAll"]>>(),
    findOne: jest.fn<ReturnType<StudentRepository["findOne"]>, Parameters<StudentRepository["findOne"]>>(),
  } satisfies StudentRepository;
}

async function expectHttpError(promise: Promise<unknown>, statusCode: number) {
  const error = await promise.then(
    () => undefined,
    (e: unknown) => e,
  );
  expect(error).toBeInstanceOf(HttpError);
  expect((error as HttpError).statusCode).toBe(statusCode);
}

describe("StudentsService", () => {
  let repository: ReturnType<typeof createRepositoryMock>;
  let service: StudentsService;

  beforeEach(() => {
    repository = createRepositoryMock();
    service = new StudentsService(repository);
  });

  describe("create", () => {
    test("cria o aluno com dados válidos, retorna o registro e encaminha os dados ao repositório", async () => {
      const created: Student = { ra: 123, name: "Ana" };
      repository.create.mockResolvedValue(created);

      const result = await service.create({ ra: 123, name: "Ana" });

      expect(result).toEqual(created);
      expect(repository.create).toHaveBeenCalledTimes(1);
      expect(repository.create).toHaveBeenCalledWith({ ra: 123, name: "Ana" });
    });

    test("rejeita RA inválido (0) com erro 400 e não chama repository.create", async () => {
      await expectHttpError(service.create({ ra: 0, name: "Ana" }), 400);

      expect(repository.create).not.toHaveBeenCalled();
    });

    test("traduz violação de unicidade (23505) em erro 409 (RA duplicado)", async () => {
      repository.create.mockRejectedValue({ code: "23505" });

      await expectHttpError(service.create({ ra: 123, name: "Ana" }), 409);
    });

    test("propaga a mesma instância de Error inesperado na criação", async () => {
      const failure = new Error("falha inesperada");
      repository.create.mockRejectedValue(failure);

      await expect(service.create({ ra: 123, name: "Ana" })).rejects.toBe(failure);
    });
  });

  describe("findAll", () => {
    test("retorna a lista simulada e chama repository.findAll uma vez, sem argumentos", async () => {
      const students: Student[] = [
        { ra: 123, name: "Ana" },
        { ra: 456, name: "Bruno" },
      ];
      repository.findAll.mockResolvedValue(students);

      const result = await service.findAll();

      expect(result).toEqual(students);
      expect(repository.findAll).toHaveBeenCalledTimes(1);
      expect(repository.findAll).toHaveBeenCalledWith();
    });
  });

  describe("findOne", () => {
    test("retorna o aluno existente e chama repository.findOne uma vez com o RA 123", async () => {
      const student: Student = { ra: 123, name: "Ana" };
      repository.findOne.mockResolvedValue(student);

      const result = await service.findOne(123);

      expect(result).toEqual(student);
      expect(repository.findOne).toHaveBeenCalledTimes(1);
      expect(repository.findOne).toHaveBeenCalledWith(123);
    });

    test("lança erro 404 quando o aluno não existe (undefined)", async () => {
      repository.findOne.mockResolvedValue(undefined);

      await expectHttpError(service.findOne(123), 404);
    });
  });
});

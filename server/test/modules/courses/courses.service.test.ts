import { HttpError } from "../../../src/errors";
import { CoursesService } from "../../../src/modules/courses/courses.service";
import type {
  Course,
  CourseRepository,
} from "../../../src/modules/courses/courses.repository";

// Dublê do repositório: cada método é um jest.fn (stub/mock) criado a cada teste.
function createRepositoryMock() {
  return {
    create: jest.fn<ReturnType<CourseRepository["create"]>, Parameters<CourseRepository["create"]>>(),
    findAll: jest.fn<ReturnType<CourseRepository["findAll"]>, Parameters<CourseRepository["findAll"]>>(),
    findOne: jest.fn<ReturnType<CourseRepository["findOne"]>, Parameters<CourseRepository["findOne"]>>(),
  } satisfies CourseRepository;
}

async function expectHttpError(promise: Promise<unknown>, statusCode: number) {
  const error = await promise.then(
    () => undefined,
    (e: unknown) => e,
  );
  expect(error).toBeInstanceOf(HttpError);
  expect((error as HttpError).statusCode).toBe(statusCode);
}

describe("CoursesService", () => {
  let repository: ReturnType<typeof createRepositoryMock>;
  let service: CoursesService;

  beforeEach(() => {
    repository = createRepositoryMock();
    service = new CoursesService(repository);
  });

  describe("create", () => {
    test("cria a disciplina com dados válidos, retorna o registro e chama repository.create uma vez", async () => {
      const created: Course = { id: 1, name: "Qualidade" };
      repository.create.mockResolvedValue(created);

      const result = await service.create({ name: "Qualidade" });

      expect(result).toEqual(created);
      expect(repository.create).toHaveBeenCalledTimes(1);
      expect(repository.create).toHaveBeenCalledWith({ name: "Qualidade" });
    });

    test.each<[string, unknown]>([
      ["null", null],
      ["objeto vazio {}", {}],
      ['{ name: "A" } (nome curto)', { name: "A" }],
    ])("rejeita a entrada %s com erro 400 e não chama repository.create", async (_label, input) => {
      await expectHttpError(service.create(input), 400);

      expect(repository.create).not.toHaveBeenCalled();
    });

    test("traduz violação de unicidade (23505) em erro 409", async () => {
      repository.create.mockRejectedValue({ code: "23505" });

      await expectHttpError(service.create({ name: "Qualidade" }), 409);
    });

    test("envia ao repositório somente o campo name, descartando campos extras", async () => {
      repository.create.mockResolvedValue({ id: 1, name: "Qualidade" });

      await service.create({ name: "Qualidade", extra: true });

      expect(repository.create).toHaveBeenCalledTimes(1);
      expect(repository.create).toHaveBeenCalledWith({ name: "Qualidade" });
    });

    test("propaga a mesma instância de Error inesperado", async () => {
      const failure = new Error("falha inesperada");
      repository.create.mockRejectedValue(failure);

      await expect(service.create({ name: "Qualidade" })).rejects.toBe(failure);
    });
  });

  describe("findAll", () => {
    test("retorna a lista do stub e consulta o repositório uma única vez", async () => {
      const courses: Course[] = [
        { id: 1, name: "Qualidade" },
        { id: 2, name: "Testes" },
      ];
      repository.findAll.mockResolvedValue(courses);

      const result = await service.findAll();

      expect(result).toEqual(courses);
      expect(repository.findAll).toHaveBeenCalledTimes(1);
    });

    test("propaga a mesma instância de Error inesperado", async () => {
      const failure = new Error("falha inesperada");
      repository.findAll.mockRejectedValue(failure);

      await expect(service.findAll()).rejects.toBe(failure);
    });
  });

  describe("findOne", () => {
    test("retorna o registro existente e encaminha o id ao repositório", async () => {
      const course: Course = { id: 123, name: "Qualidade" };
      repository.findOne.mockResolvedValue(course);

      const result = await service.findOne(123);

      expect(result).toEqual(course);
      expect(repository.findOne).toHaveBeenCalledTimes(1);
      expect(repository.findOne).toHaveBeenCalledWith(123);
    });

    test("lança erro 404 quando o repositório retorna undefined", async () => {
      repository.findOne.mockResolvedValue(undefined);

      await expectHttpError(service.findOne(123), 404);
    });

    test("lança erro 400 para id inválido (0) sem consultar o repositório", async () => {
      await expectHttpError(service.findOne(0), 400);

      expect(repository.findOne).not.toHaveBeenCalled();
    });

    test("propaga a mesma instância de Error inesperado", async () => {
      const failure = new Error("falha inesperada");
      repository.findOne.mockRejectedValue(failure);

      await expect(service.findOne(123)).rejects.toBe(failure);
    });
  });

  describe("uso de spy", () => {
    test("observa findOne de um stub existente com jest.spyOn e confere o argumento 1", async () => {
      const course: Course = { id: 1, name: "Qualidade" };
      // Objeto "existente" com métodos assíncronos próprios (stub escrito à mão).
      const stub: CourseRepository = {
        create: async (data) => ({ id: 1, name: data.name }),
        findAll: async () => [course],
        findOne: async () => course,
      };
      const spy = jest.spyOn(stub, "findOne");
      const spiedService = new CoursesService(stub);

      const result = await spiedService.findOne(1);

      expect(result).toEqual(course);
      expect(spy).toHaveBeenCalledTimes(1);
      expect(spy).toHaveBeenCalledWith(1);
    });
  });
});

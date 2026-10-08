import { randomBytes, scryptSync } from "node:crypto";
import { readFileSync } from "node:fs";
import { expect, type Page, test } from "@playwright/test";
import { PrismaNeon } from "@prisma/adapter-neon";
import { parse } from "dotenv";
import ExcelJS from "exceljs";
import { z } from "zod";
import { PrismaClient } from "../../lib/generated/prisma/client";

const env = parse(readFileSync(".local/test.env", "utf8"));
const live = parse(readFileSync(".env.local", "utf8"));
if (
  env.DATABASE_URL === live.DATABASE_URL ||
  process.env.DATABASE_URL !== env.DATABASE_URL
)
  throw new Error("E2E cần database kiểm thử riêng.");
const db = new PrismaClient({
  adapter: new PrismaNeon({
    connectionString: z.url().parse(env.DATABASE_URL),
  }),
});
const password = "TestSunway2026!";
function passwordHash() {
  const salt = randomBytes(16).toString("hex");
  return `scrypt$${salt}$${scryptSync(password, salt, 64, { N: 32768, r: 8, p: 3, maxmem: 64 * 1024 * 1024 }).toString("hex")}`;
}
async function login(page: Page, code: string) {
  await page.goto("/dang-nhap?mode=admin");
  await page.getByLabel("Mã nhân viên", { exact: true }).fill(code);
  await page.getByLabel("Mật khẩu", { exact: true }).fill(password);
  await page.getByRole("button", { name: "Đăng nhập", exact: true }).click();
}
let participantId: string;
const participantName = "E2E Người làm bài";
async function enter(page: Page, department = "Sales") {
  await page.goto("/dang-nhap");
  await expect(
    page.getByRole("heading", { name: "Đánh giá kiến thức đầu vào" }),
  ).toBeVisible();
  await expect(page.locator('input[type="password"]')).toHaveCount(0);
  await expect(
    page.locator('[name="group"], [name="participantKind"]'),
  ).toHaveCount(0);
  await expect(page.getByLabel("Phòng ban").locator("option")).toHaveText([
    "Chọn phòng ban",
    "Sales",
    "CS",
    "OPS",
    "Thực tập sinh",
  ]);
  await page.getByLabel("Họ và tên").fill(participantName);
  const dateInput = page.getByLabel("Ngày sinh");
  await expect(dateInput).toHaveAttribute("type", "text");
  await dateInput.pressSequentially("20052001");
  await expect(dateInput).toHaveValue("20/05/2001");
  await page.getByLabel("Phòng ban").selectOption(department);
  await page
    .getByLabel("Chi nhánh", { exact: true })
    .selectOption({ label: "Hải Phòng" });
  // An extra client role is untrusted: public intake must always create a participant.
  await page.locator("form").evaluate((form) => {
    const input = document.createElement("input");
    input.type = "hidden";
    input.name = "role";
    input.value = "ADMIN";
    form.appendChild(input);
  });
  await page.getByRole("button", { name: "Vào làm bài" }).click();
  await expect(page).toHaveURL(/localhost:3100\/$/);
}

test.beforeAll(async () => {
  const hn = await db.branch.findUniqueOrThrow({ where: { name: "Hà Nội" } });
  const hp = await db.branch.findUniqueOrThrow({
    where: { name: "Hải Phòng" },
  });
  for (const [code, name, role, branchId] of [
    ["E2E_ADMIN", "Quản trị kiểm thử", "ADMIN", hn.id],
    ["E2E_EMPLOYEE", "Nhân sự kiểm thử", "EMPLOYEE", hp.id],
    ["E2E_OTHER", "Quản trị khác", "ADMIN", hn.id],
  ]) {
    const validRole = z.enum(["ADMIN", "EMPLOYEE"]).parse(role);
    const user = await db.user.upsert({
      where: { employeeCode: code },
      create: {
        employeeCode: code,
        name,
        role: validRole,
        branchId,
        passwordHash: passwordHash(),
        mustChangePassword: code === "E2E_OTHER",
      },
      update: {
        role: validRole,
        passwordHash: passwordHash(),
        mustChangePassword: code === "E2E_OTHER",
        isActive: true,
        failedLoginAttempts: 0,
        lockedUntil: null,
      },
    });
    await db.session.deleteMany({ where: { userId: user.id } });
    await db.attempt.deleteMany({ where: { userId: user.id } });
  }
});
test.afterAll(async () => {
  await db.settings.update({
    where: { id: "main" },
    data: {
      passThreshold: 80,
      showAnswers: true,
      allowLeaderboard: true,
      maxAttempts: 0,
    },
  });
  const fixtures = await db.user.findMany({
    where: {
      OR: [
        { employeeCode: { startsWith: "BATCH_" } },
        { employeeCode: { in: ["E2E_ADMIN", "E2E_EMPLOYEE", "E2E_OTHER"] } },
        { identityType: "PARTICIPANT", name: participantName },
      ],
    },
    select: { id: true, employeeCode: true },
  });
  const ids = fixtures
    .filter(
      (u) =>
        u.employeeCode.startsWith("E2E_") ||
        u.employeeCode.startsWith("HS-") ||
        /^BATCH_\d{13}_\d{1,3}$/.test(u.employeeCode),
    )
    .map((u) => u.id);
  await db.attempt.deleteMany({ where: { userId: { in: ids } } });
  await db.user.deleteMany({ where: { id: { in: ids } } });
  await db.$disconnect();
});
test.describe
  .serial("Sunway Quiz", () => {
    test("đổi mật khẩu lần đầu và khóa sau 5 lần sai", async ({ page }) => {
      await login(page, "E2E_OTHER");
      await expect(page).toHaveURL(/tai-khoan/);
      await expect(
        page.getByRole("heading", { name: "Đổi mật khẩu để bắt đầu" }),
      ).toBeVisible();
      await page
        .getByLabel("Mật khẩu hiện tại", { exact: true })
        .fill(password);
      await page
        .getByLabel("Mật khẩu mới", { exact: true })
        .fill("NewSunway2026!");
      await page.getByLabel("Nhập lại mật khẩu mới").fill("NewSunway2026!");
      await page.getByRole("button", { name: "Lưu mật khẩu mới" }).click();
      await expect(page).toHaveURL(/localhost:3100\/$/);
      await page.getByRole("button", { name: "Đăng xuất" }).click();
      await expect(page).toHaveURL(/dang-nhap/);
      await page.goto("/dang-nhap?mode=admin");
      for (let i = 0; i < 5; i++) {
        await page
          .getByLabel("Mã nhân viên", { exact: true })
          .fill("E2E_OTHER");
        await page
          .getByLabel("Mật khẩu", { exact: true })
          .fill("WrongPassword2026");
        await page
          .getByRole("button", { name: "Đăng nhập", exact: true })
          .click();
        await expect
          .poll(
            async () =>
              (
                await db.user.findUniqueOrThrow({
                  where: { employeeCode: "E2E_OTHER" },
                })
              ).failedLoginAttempts,
          )
          .toBe(i + 1);
        await expect(page.locator("p[role=alert]")).toContainText(
          i === 4 ? "15 phút" : "không đúng",
        );
      }
      const user = await db.user.findUniqueOrThrow({
        where: { employeeCode: "E2E_OTHER" },
      });
      expect(user.failedLoginAttempts).toBe(5);
      expect(user.lockedUntil?.getTime()).toBeGreaterThan(Date.now());
    });
    test("chương 05 đủ 23 câu, không lộ đáp án, khôi phục offline/tải lại, nộp và phân quyền", async ({
      page,
      context,
    }) => {
      await enter(page);
      await expect(page).toHaveURL(/localhost:3100\/$/);
      const participant = await db.user.findFirstOrThrow({
        where: { name: participantName, identityType: "PARTICIPANT" },
        orderBy: { createdAt: "desc" },
      });
      participantId = participant.id;
      expect(participant.role).toBe("EMPLOYEE");
      expect(participant.passwordHash).toBeNull();
      expect(participant.mustChangePassword).toBe(false);
      expect(participant.department).toBe("Sales");
      expect(participant.birthDate?.toISOString().slice(0, 10)).toBe(
        "2001-05-20",
      );
      await context.storageState({ path: ".local/e2e-participant.json" });
      await page.goto("/tai-khoan");
      await expect(
        page.getByRole("heading", { name: "Thông tin người làm bài" }),
      ).toBeVisible();
      await expect(page.locator('input[type="password"]')).toHaveCount(0);
      await expect(page.getByText("20/05/2001", { exact: true })).toBeVisible();
      await page.goto("/");
      await page
        .getByRole("button", { name: /Chứng từ logistics và thuật ngữ/ })
        .click();
      await expect(page).toHaveURL(/lam-bai\//);
      const attemptId = page.url().split("/").at(-1);
      expect(attemptId).toBeTruthy();
      await expect(
        page.getByText("Câu 1 / 23", { exact: false }),
      ).toBeVisible();
      const html = await page.content();
      expect(html).not.toContain('"correctIndex"');
      expect(html).not.toContain('"explanation"');
      await page.locator(".option").first().click();
      await expect(page.locator(".option").first()).toHaveAttribute(
        "aria-pressed",
        "true",
      );
      await expect(page.getByRole("status").last()).toContainText("Đã lưu", {
        timeout: 30000,
      });
      await page.reload();
      await expect(page.locator(".option").first()).toHaveAttribute(
        "aria-pressed",
        "true",
      );
      await context.setOffline(true);
      await page.getByRole("button", { name: "Câu tiếp", exact: true }).click();
      await page.locator(".option").nth(1).click();
      await context.setOffline(false);
      await page.reload();
      await expect(page.getByText(/đã trả lời 2/)).toBeVisible();
      await page.getByRole("button", { name: "Nộp bài sớm" }).click();
      await expect(
        page.getByText("Còn 21 câu chưa trả lời", { exact: false }),
      ).toBeVisible();
      await page.getByRole("button", { name: "Nộp bài", exact: true }).click();
      await expect(page).toHaveURL(/ket-qua\//);
      await expect(
        page.getByRole("heading", { name: "Xem lại đáp án" }),
      ).toBeVisible();
      const first = await db.attempt.findUniqueOrThrow({
        where: { id: attemptId },
      });
      expect(first.status).toBe("SUBMITTED");
      expect(first.total).toBe(23);
      await db.settings.update({
        where: { id: "main" },
        data: { maxAttempts: 1 },
      });
      await page.goto(`/ket-qua/${attemptId}`);
      await expect(
        page.getByRole("button", { name: "Làm lại", exact: true }),
      ).toBeDisabled();
      await expect(
        page.getByText("Bạn đã hết lượt làm cho bài này.", { exact: false }),
      ).toBeVisible();
      await db.settings.update({
        where: { id: "main" },
        data: { maxAttempts: 0 },
      });
      await page.goto("/quan-tri");
      await expect(page).toHaveURL(/localhost:3100\/$/);
      const otherContext = await page
        .context()
        .browser()
        ?.newContext({ baseURL: "http://localhost:3100" });
      if (!otherContext) throw new Error("Không có browser");
      const other = await otherContext.newPage();
      // Identical declarations on another browser create a distinct private profile.
      await enter(other);
      await expect(other).toHaveURL(/localhost:3100\/$/);
      const otherParticipant = await db.user.findFirstOrThrow({
        where: { name: participantName, department: "Sales" },
        orderBy: { createdAt: "desc" },
      });
      expect(otherParticipant.id).not.toBe(participantId);
      await other.goto(`/ket-qua/${attemptId}`);
      await expect(
        other.getByRole("heading", { name: "Không tìm thấy trang" }),
      ).toBeVisible();
      await otherContext.close();
      await db.settings.update({
        where: { id: "main" },
        data: { showAnswers: false },
      });
      await page.goto(`/ket-qua/${attemptId}`);
      await expect(
        page.getByText("Quản trị đang tắt xem đáp án sau khi nộp.", {
          exact: false,
        }),
      ).toBeVisible();
      await expect(
        page.getByRole("heading", { name: "Xem lại đáp án" }),
      ).toHaveCount(0);
      expect(await page.content()).not.toContain('"correctIndex"');
      await db.settings.update({
        where: { id: "main" },
        data: { showAnswers: true },
      });
      await page.goto("/xep-hang");
      await expect(page.locator(".me")).toContainText(participantName);
      expect(await page.content()).not.toContain("2001-05-20");
    });
    test("quản trị nhập 50 nhân sự, báo lỗi rõ, xuất Excel và xem đầy đủ các trang", async ({
      page,
    }) => {
      await login(page, "E2E_ADMIN");
      await expect(page).toHaveURL(/localhost:3100\/$/);
      await page.goto("/quan-tri/nhan-su");
      await page.goto(`/quan-tri/nhan-su/${participantId}`);
      await expect(page.getByLabel("Ngày sinh")).toHaveValue("2001-05-20");
      await expect(page.getByLabel("Phòng ban")).toHaveValue("Sales");
      await expect(
        page.getByText("Đặt lại mật khẩu", { exact: true }),
      ).toHaveCount(0);
      await expect(page.getByLabel("Vai trò").locator("option")).toHaveText([
        "Người làm bài",
      ]);
      await page.goto("/quan-tri/nhan-su");
      await page
        .getByText("Danh sách nhân sự cũ (CSV / Excel)", { exact: true })
        .click();
      const tag = Date.now();
      const rows = Array.from(
        { length: 50 },
        (_, i) => `BATCH_${tag}_${i},Nhân viên ${i + 1},Hải Phòng,`,
      );
      await page.getByLabel("Chọn file").setInputFiles({
        name: "staff.csv",
        mimeType: "text/csv",
        buffer: Buffer.from(
          "\uFEFFMã NV,Họ tên,Chi nhánh,Email\r\n" +
            rows.join("\r\n") +
            "\r\nBAD,,Không tồn tại,invalid",
        ),
      });
      await page.getByRole("button", { name: "Xem trước dữ liệu" }).click();
      await expect(page.getByText("50/51 dòng hợp lệ")).toBeVisible();
      await expect(page.getByText(/Dòng 52:/)).toBeVisible();
      await page
        .getByRole("button", { name: "Xác nhận nhập 50 nhân sự" })
        .click();
      await expect(
        page.getByText("Đã nhập 50 nhân sự", { exact: false }),
      ).toBeVisible({ timeout: 90000 });
      expect(
        await db.user.count({
          where: { employeeCode: { startsWith: `BATCH_${tag}_` } },
        }),
      ).toBe(50);
      const excel = new ExcelJS.Workbook();
      const sheet = excel.addWorksheet("Nhân sự");
      sheet.addRows([
        ["Mã NV", "Họ tên", "Chi nhánh", "Email"],
        [`BATCH_${tag}_50`, "Nhân viên 51", "Hải Phòng", ""],
        ["E2E_OTHER", "Mã bị trùng", "Hà Nội", ""],
      ]);
      await page.getByLabel("Chọn file").setInputFiles({
        name: "staff.xlsx",
        mimeType:
          "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        buffer: Buffer.from(await excel.xlsx.writeBuffer()),
      });
      await page.getByRole("button", { name: "Xem trước dữ liệu" }).click();
      await expect(page.getByText("1/2 dòng hợp lệ")).toBeVisible();
      await expect(page.getByText("Dòng 3: trùng mã E2E_OTHER")).toBeVisible();
      await page
        .getByRole("button", { name: "Xác nhận nhập 1 nhân sự" })
        .click();
      await expect(
        page.getByText("Đã nhập 1 nhân sự", { exact: false }),
      ).toBeVisible();
      const response = await page.request.get("/quan-tri/xuat?kind=progress");
      expect(response.status()).toBe(200);
      const workbook = new ExcelJS.Workbook();
      await workbook.xlsx.load(new Uint8Array(await response.body()).buffer);
      expect(workbook.worksheets[0].getRow(1).getCell(2).text).toBe("Họ tên");
      expect(workbook.worksheets[0].getRow(1).getCell(3).text).toBe(
        "Ngày sinh",
      );
      expect(workbook.worksheets[0].getRow(1).getCell(4).text).toBe(
        "Phòng ban",
      );
      const declaredRows: string[][] = [];
      workbook.worksheets[0].eachRow((row) => {
        if (row.getCell(2).text === participantName)
          declaredRows.push([row.getCell(3).text, row.getCell(4).text]);
      });
      expect(declaredRows).toContainEqual(["20/05/2001", "Sales"]);
      expect(workbook.worksheets[0].rowCount).toBeGreaterThan(50);
      await page.goto("/quan-tri/cau-hoi");
      await page.getByLabel("Chọn file").setInputFiles({
        name: "questions.json",
        mimeType: "application/json",
        buffer: readFileSync("prisma/seed-data/questions.json"),
      });
      await page.getByRole("button", { name: "Xem trước dữ liệu" }).click();
      await expect(page.getByText("222/222 dòng hợp lệ")).toBeVisible();
      await page.getByRole("button", { name: "Xác nhận nhập 222 câu" }).click();
      await expect(
        page.getByText("Đã nhập ngân hàng câu hỏi.", { exact: true }),
      ).toBeVisible({ timeout: 60000 });
      const bankDownload = await page.request.get(
        "/quan-tri/xuat?kind=bank-json",
      );
      expect(bankDownload.status()).toBe(200);
      const downloaded: unknown = await bankDownload.json();
      const bank = z
        .object({
          topics: z.array(z.object({ questions: z.array(z.unknown()) })),
        })
        .parse(downloaded);
      expect(bank.topics.flatMap((t) => t.questions)).toHaveLength(222);
      await page.screenshot({
        path: ".local/admin-desktop.png",
        fullPage: false,
      });
      for (const route of [
        "",
        "/tien-do",
        "/ket-qua",
        "/cau-hoi",
        "/cau-hinh",
        "/bao-cao",
        "/nhat-ky",
      ]) {
        await page.goto(`/quan-tri${route}`);
        await expect(page.locator("h2").last()).toBeVisible();
        await expect(
          page.getByRole("heading", { name: "Đã có lỗi xảy ra" }),
        ).toHaveCount(0);
        if (route === "") {
          await page.evaluate(() => window.scrollTo(0, 0));
          await page.screenshot({ path: ".local/dashboard-desktop.png" });
        }
      }
      const imported = await db.user.findMany({
        where: { employeeCode: { startsWith: `BATCH_${tag}_` } },
        select: { id: true },
      });
      await db.user.deleteMany({
        where: { id: { in: imported.map((u) => u.id) } },
      });
    });
    test("360px không cuộn ngang, theme tối và timer tự nộp", async ({
      page,
    }) => {
      await page.setViewportSize({ width: 360, height: 800 });
      await page.emulateMedia({ colorScheme: "dark" });
      const state: unknown = JSON.parse(
        readFileSync(".local/e2e-participant.json", "utf8"),
      );
      const cookies = z
        .object({
          cookies: z.array(
            z.object({
              name: z.string(),
              value: z.string(),
              domain: z.string(),
              path: z.string(),
              expires: z.number(),
              httpOnly: z.boolean(),
              secure: z.boolean(),
              sameSite: z.enum(["Strict", "Lax", "None"]),
            }),
          ),
        })
        .parse(state).cookies;
      await page.context().addCookies(cookies);
      await page.goto("/");
      await expect(page).toHaveURL(/localhost:3100\/$/);
      await expect(
        page.getByRole("heading", {
          name: "Sẵn sàng cho bước tiến tiếp theo?",
        }),
      ).toBeVisible();
      expect(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= window.innerWidth,
        ),
      ).toBe(true);
      await page.screenshot({ path: ".local/mobile-dark.png", fullPage: true });
      await page
        .getByRole("button", { name: /Chuỗi giá trị ngành logistics/ })
        .click();
      await expect(page).toHaveURL(/lam-bai\//);
      const id = page.url().split("/").at(-1);
      await db.attempt.update({
        where: { id },
        data: { deadlineAt: new Date(Date.now() + 6000) },
      });
      await page.reload();
      await expect(page).toHaveURL(/ket-qua\//, { timeout: 30000 });
      await expect(
        page.getByRole("heading", { name: "Xem lại đáp án" }),
      ).toBeVisible();
      expect(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= window.innerWidth,
        ),
      ).toBe(true);
      await db.session.updateMany({
        where: { userId: participantId },
        data: { expiresAt: new Date(Date.now() - 1000) },
      });
      await page.goto("/");
      await expect(page).toHaveURL(/dang-nhap/);
    });
    test("đổi người làm bài kết thúc phiên, giữ kết quả và tạo hồ sơ mới", async ({
      page,
    }) => {
      await page.setViewportSize({ width: 360, height: 800 });
      await page.goto("/dang-nhap");
      await expect(
        page.getByRole("heading", { name: "Đánh giá kiến thức đầu vào" }),
      ).toBeVisible();
      expect(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth,
        ),
      ).toBe(true);
      await page.screenshot({
        path: ".local/participant-entry-mobile.png",
        fullPage: true,
      });
      await enter(page, "CS");
      const first = await db.user.findFirstOrThrow({
        where: { name: participantName, department: "CS" },
        orderBy: { createdAt: "desc" },
      });
      await page.reload();
      await expect(
        page.getByRole("button", { name: "Đổi người làm bài", exact: true }),
      ).toBeVisible();
      await page
        .getByRole("button", { name: "Đổi người làm bài", exact: true })
        .click();
      await page.getByRole("button", { name: "Giữ phiên hiện tại" }).click();
      expect(await db.session.count({ where: { userId: first.id } })).toBe(1);
      await page
        .getByRole("button", { name: "Đổi người làm bài", exact: true })
        .click();
      await page.getByRole("button", { name: "Xác nhận đổi người" }).click();
      await expect(page).toHaveURL(/dang-nhap/);
      expect(await db.session.count({ where: { userId: first.id } })).toBe(0);
      expect(
        await db.attempt.count({
          where: { userId: participantId, status: "SUBMITTED" },
        }),
      ).toBeGreaterThan(0);
      await enter(page, "Thực tập sinh");
      const second = await db.user.findFirstOrThrow({
        where: { name: participantName, department: "Thực tập sinh" },
        orderBy: { createdAt: "desc" },
      });
      expect(second.id).not.toBe(first.id);
    });
  });

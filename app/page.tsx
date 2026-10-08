import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

const stack = [
  {
    title: "Next.js App Router",
    description: "Server Components mặc định, Cache Components bật sẵn.",
  },
  {
    title: "Prisma + Neon",
    description: "Prisma ORM 7 với driver adapter Neon, pooled connection.",
  },
  {
    title: "Tailwind CSS + shadcn/ui",
    description:
      "Theme tokens trong app/globals.css, primitives ở components/ui.",
  },
  {
    title: "Zod + Biome",
    description: "Validate env và input ở server; lint và format bằng Biome.",
  },
] as const;

// Fully static page: no runtime data, so it is prerendered at build time.
export default function HomePage() {
  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-10 px-4 py-12 sm:px-6 sm:py-16">
      <section className="flex flex-col gap-4">
        <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">
          Dự án đã sẵn sàng
        </h1>
        <p className="max-w-2xl text-muted-foreground">
          Bắt đầu bằng việc đọc <code className="font-mono">AGENTS.md</code> và{" "}
          <code className="font-mono">ARCHITECTURE.md</code>, sau đó thêm model
          vào <code className="font-mono">prisma/schema.prisma</code> và nghiệp
          vụ đầu tiên trong <code className="font-mono">features/</code>.
        </p>
        <div>
          <Dialog>
            <DialogTrigger render={<Button />}>
              Các bước tiếp theo
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Các bước tiếp theo</DialogTitle>
                <DialogDescription>
                  Kết nối database và tạo migration đầu tiên.
                </DialogDescription>
              </DialogHeader>
              <ol className="list-decimal space-y-1 pl-5 text-sm">
                <li>
                  Sao chép <code className="font-mono">.env.example</code> thành{" "}
                  <code className="font-mono">.env</code> và điền chuỗi kết nối
                  Neon.
                </li>
                <li>Thêm model vào schema.</li>
                <li>
                  Chạy <code className="font-mono">pnpm db:migrate</code>.
                </li>
              </ol>
              <DialogFooter>
                <DialogClose render={<Button variant="outline" />}>
                  Đóng
                </DialogClose>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </section>

      <section aria-labelledby="stack-heading" className="flex flex-col gap-4">
        <h2 id="stack-heading" className="text-lg font-medium">
          Stack
        </h2>
        <ul className="grid gap-4 sm:grid-cols-2">
          {stack.map((item) => (
            <li key={item.title}>
              <Card className="h-full">
                <CardHeader>
                  <CardTitle>{item.title}</CardTitle>
                  <CardDescription>{item.description}</CardDescription>
                </CardHeader>
                <CardContent />
              </Card>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}

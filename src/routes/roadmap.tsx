import { createFileRoute, Link } from "@tanstack/react-router";
import { CodeNovaLayout } from "@/components/CodeNovaLayout";
import { Code, Lightbulb, ArrowRight } from "lucide-react";

export const Route = createFileRoute("/roadmap")({
  head: () => ({
    meta: [
      { title: "Lộ trình học — Code Nova" },
      {
        name: "description",
        content:
          "Chọn ngôn ngữ lập trình để xem lộ trình chi tiết: C++, Java, Python...",
      },
    ],
  }),
  component: RoadmapPage,
});

function RoadmapPage() {
  return (
    <CodeNovaLayout>
      <div className="mx-auto max-w-5xl px-4 pt-10 pb-20">
        <div className="mb-10">
          <h1 className="text-4xl font-black tracking-tight">
            Lộ trình học{" "}
            <span className="bg-gradient-to-r from-primary to-fuchsia-400 bg-clip-text text-transparent">
              chi tiết
            </span>
          </h1>
          <p className="mt-4 max-w-2xl text-muted-foreground">
            Chọn ngôn ngữ bạn muốn khám phá. Mỗi lộ trình bao gồm: giới thiệu,
            lý do nên học, kiến thức cần chuẩn bị, cơ hội nghề nghiệp và code
            mẫu cơ bản.
          </p>
        </div>

        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {LANGUAGES.map((lang) => (
            <Link
              key={lang.id}
              to={lang.link}
              className="group flex flex-col items-center rounded-2xl border border-border bg-card/80 p-8 backdrop-blur transition-all hover:-translate-y-1 hover:border-primary hover:shadow-xl hover:shadow-primary/10 text-center"
            >
              <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 text-3xl">
                {lang.icon}
              </div>
              <h3 className="text-xl font-bold mb-2">{lang.name}</h3>
              <p className="text-sm text-muted-foreground mb-4 line-clamp-2">
                {lang.desc}
              </p>
              <span className="inline-flex items-center gap-1 text-xs font-medium text-primary group-hover:underline">
                Xem lộ trình <ArrowRight className="h-3 w-3" />
              </span>
            </Link>
          ))}
        </div>
      </div>
    </CodeNovaLayout>
  );
}

const LANGUAGES = [
  {
    id: "cpp",
    name: "C++",
    icon: "⚡",
    desc: "Ngôn ngữ mạnh mẽ cho game, hệ thống nhúng và phần mềm hiệu năng cao.",
    link: "/cplusplus-intro", // Đã có
  },
  {
    id: "java",
    name: "Java",
    icon: "☕",
    desc: "Ngôn ngữ phổ biến cho ứng dụng doanh nghiệp, Android và backend.",
    link: "/java-intro", // Sẽ tạo sau
  },
  {
    id: "python",
    name: "Python",
    icon: "🐍",
    desc: "Ngôn ngữ đơn giản, dễ học, dùng trong AI, data science, web.",
    link: "/python-intro", // Sẽ tạo sau
  },
  {
    id: "javascript",
    name: "JavaScript",
    icon: "💛",
    desc: "Vua của web frontend, nay còn mạnh ở backend (Node.js).",
    link: "/javascript-intro", // Sẽ tạo sau
  },
  {
    id: "html",
    name: "HTML & CSS",
    icon: "🎨",
    desc: "Nền tảng của mọi trang web. Học để tạo giao diện.",
    link: "/html-css-intro", // Sẽ tạo sau
  },
];

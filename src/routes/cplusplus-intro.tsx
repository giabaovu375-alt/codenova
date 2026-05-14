// cplusplus-intro.tsx — Trang giới thiệu chi tiết về C++
import { createFileRoute, Link } from "@tanstack/react-router";
import { CodeNovaLayout } from "@/components/CodeNovaLayout";
import { CodeBlock } from "@/components/CodeBlock";
import {
  BookOpen,
  Code,
  Briefcase,
  Lightbulb,
  ArrowRight,
  Target,
  CheckCircle,
} from "lucide-react";

export const Route = createFileRoute("/cplusplus-intro")({
  head: () => ({
    meta: [
      { title: "C++ cho người mới — Code Nova" },
      {
        name: "description",
        content:
          "C++ là gì? Tại sao nên học? Cần biết những gì? Học xong làm nghề gì?",
      },
    ],
  }),
  component: CPlusPlusIntro,
});

function CPlusPlusIntro() {
  return (
    <CodeNovaLayout>
      <div className="mx-auto max-w-4xl px-4 pt-10 pb-20 space-y-20">
        {/* Tiêu đề chính */}
        <div>
          <div className="inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/5 px-3 py-1 text-xs text-primary mb-4">
            <Code className="h-3 w-3" /> Ngôn ngữ lập trình
          </div>
          <h1 className="text-4xl font-black tracking-tight">
            C++ là gì? Tại sao nên học?{" "}
            <span className="bg-gradient-to-r from-primary to-fuchsia-400 bg-clip-text text-transparent">
              Cần biết những gì?
            </span>
          </h1>
          <p className="mt-4 max-w-2xl text-muted-foreground">
            C++ là một trong những ngôn ngữ lập trình mạnh mẽ và phổ biến nhất
            thế giới. Nó là "ông tổ" của nhiều ngôn ngữ hiện đại và vẫn được
            dùng rộng rãi trong các hệ thống yêu cầu hiệu năng cao.
          </p>
        </div>

        {/* 1. C++ là gì? */}
        <section>
          <div className="flex items-center gap-3 mb-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10">
              <BookOpen className="h-5 w-5 text-primary" />
            </div>
            <h2 className="text-2xl font-bold">C++ là gì?</h2>
          </div>
          <div className="grid gap-6 lg:grid-cols-[1fr_1.2fr]">
            <div className="aspect-video rounded-xl bg-secondary/50 flex items-center justify-center text-muted-foreground text-sm border border-border">
              {/* Ảnh minh hoạ: logo C++ hoặc sơ đồ */}
              🖼️ Ảnh minh hoạ C++
            </div>
            <div className="space-y-3 text-muted-foreground leading-relaxed">
              <p>
                C++ được phát triển từ ngôn ngữ C bởi Bjarne Stroustrup vào năm
                1979. Nó bổ sung các tính năng lập trình hướng đối tượng (OOP)
                vào C, tạo ra một ngôn ngữ vừa mạnh mẽ vừa linh hoạt.
              </p>
              <p>
                C++ là ngôn ngữ biên dịch (compiled), tức code của bạn được
                dịch trực tiếp thành mã máy, giúp chương trình chạy cực kỳ
                nhanh. Chính vì vậy, nó được dùng trong các hệ thống đòi hỏi
                hiệu năng cao như game engine, hệ điều hành, phần mềm nhúng.
              </p>
            </div>
          </div>
        </section>

        {/* 2. Tại sao nên học C++? */}
        <section>
          <div className="flex items-center gap-3 mb-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10">
              <Lightbulb className="h-5 w-5 text-primary" />
            </div>
            <h2 className="text-2xl font-bold">Tại sao nên học C++?</h2>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            {WHY_LEARN.map((item) => (
              <div
                key={item.title}
                className="rounded-xl border border-border bg-card/80 p-5 backdrop-blur"
              >
                <div className="flex items-center gap-2 mb-2">
                  <CheckCircle className="h-4 w-4 text-primary" />
                  <h3 className="font-semibold text-sm">{item.title}</h3>
                </div>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  {item.desc}
                </p>
              </div>
            ))}
          </div>
        </section>
        {/* 3. Những thứ cần biết khi học C++ */}
        <section>
          <div className="flex items-center gap-3 mb-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10">
              <Target className="h-5 w-5 text-primary" />
            </div>
            <h2 className="text-2xl font-bold">
              Những thứ cần biết khi học C++
            </h2>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            {PREREQUISITES.map((item) => (
              <div
                key={item.title}
                className="rounded-xl border border-border bg-card/80 p-5 backdrop-blur"
              >
                <h3 className="font-semibold text-sm mb-1">{item.title}</h3>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  {item.desc}
                </p>
              </div>
            ))}
          </div>
        </section>

        {/* 4. Học C++ sau này làm gì? */}
        <section>
          <div className="flex items-center gap-3 mb-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10">
              <Briefcase className="h-5 w-5 text-primary" />
            </div>
            <h2 className="text-2xl font-bold">
              Học C++ sau này làm nghề gì?
            </h2>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            {CAREERS.map((item) => (
              <div
                key={item.title}
                className="rounded-xl border border-border bg-card/80 p-5 backdrop-blur"
              >
                <h3 className="font-semibold text-sm mb-1">{item.title}</h3>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  {item.desc}
                </p>
              </div>
            ))}
          </div>
        </section>

        {/* 5. Code cơ bản và cấu trúc phải biết */}
        <section>
          <div className="flex items-center gap-3 mb-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10">
              <Code className="h-5 w-5 text-primary" />
            </div>
            <h2 className="text-2xl font-bold">
              Code cơ bản & cấu trúc phải biết
            </h2>
          </div>
          <p className="text-muted-foreground mb-6">
            Dưới đây là chương trình C++ đơn giản nhất mà mọi người mới đều bắt
            đầu. Hãy xem qua từng dòng để hiểu cấu trúc cơ bản.
          </p>
          <CodeBlock
            language="cpp"
            code={`#include <iostream>
using namespace std;

int main() {
    cout << "Hello, CodeNova!" << endl;
    return 0;
}`}
          />
          <div className="mt-4 space-y-2 text-sm text-muted-foreground">
            <p>
              <strong>#include &lt;iostream&gt;</strong> – Khai báo thư viện
              nhập/xuất chuẩn.
            </p>
            <p>
              <strong>using namespace std;</strong> – Giúp viết code gọn hơn
              (không cần <code>std::cout</code>).
            </p>
            <p>
              <strong>int main()</strong> – Hàm chính, nơi chương trình bắt
              đầu.
            </p>
            <p>
              <strong>cout &lt;&lt; "Hello";</strong> – In ra màn hình.
            </p>
            <p>
              <strong>return 0;</strong> – Kết thúc chương trình thành công.
            </p>
          </div>
        </section>

        {/* CTA */}
        <div className="text-center pt-8">
          <p className="text-muted-foreground mb-4">
            Sẵn sàng bắt đầu hành trình C++ của bạn chưa?
          </p>
          <Link
            to="/lessons"
            className="inline-flex items-center gap-2 rounded-xl bg-primary px-6 py-3 text-sm font-medium text-primary-foreground shadow-lg transition-all hover:-translate-y-1 hover:shadow-primary/40"
          >
            Xem bài học C++
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </div>
    </CodeNovaLayout>
  );
}

// ─── Dữ liệu ──────────────────────────────────────────
const WHY_LEARN = [
  {
    title: "Hiểu sâu về máy tính",
    desc: "C++ giúp bạn hiểu cách bộ nhớ, con trỏ và CPU hoạt động. Kiến thức này là nền tảng cho mọi ngôn ngữ khác.",
  },
  {
    title: "Hiệu năng cực cao",
    desc: "C++ là một trong những ngôn ngữ nhanh nhất. Nó được dùng trong game AAA, engine đồ hoạ, và hệ thống nhúng.",
  },
  {
    title: "Cộng đồng khổng lồ",
    desc: "Hàng triệu lập trình viên, hàng ngàn thư viện và tài liệu. Bạn không bao giờ cô đơn khi học C++.",
  },
  {
    title: "Nền tảng cho các ngôn ngữ khác",
    desc: "Nhiều ngôn ngữ như Java, C#, Python (CPython) được viết bằng C/C++. Học C++ giúp bạn hiểu gốc rễ của chúng.",
  },
];

const PREREQUISITES = [
  {
    title: "Tư duy logic cơ bản",
    desc: "Hiểu các khái niệm “nếu… thì…”, “đúng/sai”, vòng lặp. Bạn không cần giỏi toán, chỉ cần suy nghĩ theo từng bước.",
  },
  {
    title: "Cài đặt môi trường",
    desc: "Bạn cần một compiler (g++, clang) và editor/IDE (VS Code, Code::Blocks). CodeNova Playground cũng hỗ trợ chạy thử C++.",
  },
  {
    title: "Kiên nhẫn với lỗi",
    desc: "C++ có thông báo lỗi dài và đôi khi khó hiểu. Đừng nản – mỗi lỗi là một bài học quý giá.",
  },
  {
    title: "Hiểu về biên dịch",
    desc: "Khác với Python/JS, C++ cần được biên dịch thành file thực thi (.exe, .out). Biết quy trình này giúp bạn debug tốt hơn.",
  },
];

const CAREERS = [
  {
    title: "Lập trình game",
    desc: "C++ là ngôn ngữ chính của Unreal Engine và nhiều engine tự phát triển. Các studio AAA như Epic, Ubisoft đều tuyển C++ developer.",
  },
  {
    title: "Hệ thống nhúng & IoT",
    desc: "Từ ô tô, máy giặt đến robot, C++ kiểm soát phần cứng nhờ khả năng quản lý bộ nhớ sát sao.",
  },
  {
    title: "Phần mềm hệ thống",
    desc: "Hệ điều hành (Windows, Linux), driver, database engine đều viết bằng C/C++. Đây là mảng khó nhưng lương rất cao.",
  },
  {
    title: "Tài chính & Ngân hàng",
    desc: "Các hệ thống giao dịch tần suất cao (HFT) dùng C++ để đạt tốc độ microsecond. Lập trình viên C++ trong lĩnh vực này cực kỳ được trọng dụng.",
  },
];

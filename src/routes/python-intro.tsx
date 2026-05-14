// python-intro.tsx — Premium Landing Page for Python
import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState, useRef } from "react";
import { CodeNovaLayout } from "@/components/CodeNovaLayout"; // nếu muốn bọc layout chung, có thể bỏ dòng này và dùng layout riêng
import { CodeBlock } from "@/components/CodeBlock";
import {
  BookOpen,
  Download,
  Briefcase,
  Lightbulb,
  ArrowRight,
  Target,
  CheckCircle,
  ChevronUp,
} from "lucide-react";

// Ảnh — nếu chưa có, để chuỗi rỗng và component sẽ hiện placeholder
import pythonHero from "@/assets/python-hero.jpg";
import pythonInstall from "@/assets/python-install.jpg";
import pythonCareers from "@/assets/python-careers.jpg";
import pythonLearn from "@/assets/python-learn.jpg";

export const Route = createFileRoute("/python-intro")({
  head: () => ({
    meta: [
      { title: "Python cho người mới bắt đầu — CodeNova" },
      {
        name: "description",
        content:
          "Khám phá Python từ con số 0: định nghĩa, cách cài đặt, lý do nên học, cơ hội nghề nghiệp và lộ trình chi tiết.",
      },
    ],
  }),
  component: PythonIntroPage,
});

const SECTIONS = [
  { id: "python-la-gi", label: "Python là gì" },
  { id: "cai-dat-python", label: "Cài đặt Python" },
  { id: "tai-sao-hoc-python", label: "Tại sao nên học" },
  { id: "python-lam-gi", label: "Sau này làm gì" },
  { id: "can-biet", label: "Cần biết khi học" },
];

function PythonIntroPage() {
  const [activeSection, setActiveSection] = useState<string>("");
  const [showBackToTop, setShowBackToTop] = useState(false);
  const sectionRefs = useRef<Record<string, HTMLElement | null>>({});

  // Scroll spy
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setActiveSection(entry.target.id);
          }
        });
      },
      { rootMargin: "-30% 0px -60% 0px" }
    );

    SECTIONS.forEach(({ id }) => {
      const el = document.getElementById(id);
      if (el) {
        sectionRefs.current[id] = el;
        observer.observe(el);
      }
    });

    return () => observer.disconnect();
  }, []);

  // Back‑to‑top visibility
  useEffect(() => {
    const onScroll = () => {
      setShowBackToTop(window.scrollY > 600);
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const scrollTo = (id: string) => {
    const el = document.getElementById(id);
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  };

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  return (
    <div id="top" className="min-h-screen bg-background text-foreground">
      {/* Sticky Nav */}
      <header className="sticky top-0 z-40 border-b border-border bg-background/80 backdrop-blur-md">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
          {/* Logo dẫn về trang chủ CodeNova */}
          <Link to="/" className="flex items-center gap-2 group">
            <span className="relative inline-flex h-8 w-8 items-center justify-center rounded-md bg-primary text-primary-foreground font-bold">
              N
              <span className="absolute -right-0.5 -top-0.5 h-1.5 w-1.5 rounded-full bg-[var(--gold)]" />
            </span>
            <span className="font-semibold tracking-tight">
              Code<span className="text-primary">Nova</span>
            </span>
          </Link>

          <nav className="hidden gap-6 text-sm text-muted-foreground md:flex">
            {SECTIONS.map((s) => (
              <button
                key={s.id}
                onClick={() => scrollTo(s.id)}
                className={`transition-colors hover:text-foreground ${
                  activeSection === s.id ? "text-primary font-medium" : ""
                }`}
              >
                {s.label}
              </button>
            ))}
          </nav>

          <button
            onClick={() => scrollTo("python-la-gi")}
            className="rounded-full bg-primary px-4 py-2 text-xs font-semibold text-primary-foreground transition-opacity hover:opacity-90"
          >
            Bắt đầu học
          </button>
        </div>
      </header>

      {/* Hero */}
      <section className="relative overflow-hidden border-b border-border bg-card">
        <div className="mx-auto grid max-w-6xl gap-10 px-4 py-20 md:grid-cols-[1.1fr_1fr] md:py-28">
          <div className="flex flex-col justify-center">
            <span className="mb-5 inline-flex w-fit items-center gap-2 rounded-full border border-[var(--gold)]/40 px-3 py-1 text-xs font-medium text-[var(--gold)]">
              <span className="h-1.5 w-1.5 rounded-full bg-[var(--gold)]" />
              Hướng dẫn nhập môn · CodeNova
            </span>
            <h1 className="text-4xl font-black leading-[1.05] tracking-tight md:text-6xl">
              Học <span className="text-[var(--gold)]">Python</span> từ con số 0, theo cách tự nhiên nhất.
            </h1>
            <p className="mt-6 max-w-xl text-base leading-relaxed text-muted-foreground md:text-lg">
              Python là ngôn ngữ lập trình dễ đọc, dễ viết và đang chiếm lĩnh
              gần như mọi lĩnh vực — từ web, tự động hoá, dữ liệu cho tới trí
              tuệ nhân tạo. Trang này tóm tắt mọi thứ bạn cần biết trước khi
              bắt đầu.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <button
                onClick={() => scrollTo("python-la-gi")}
                className="rounded-full bg-[var(--gold)] px-6 py-3 text-sm font-semibold text-foreground transition-transform hover:-translate-y-0.5"
              >
                Khám phá ngay
              </button>
              <button
                onClick={() => scrollTo("cai-dat-python")}
                className="rounded-full border border-border px-6 py-3 text-sm font-semibold text-foreground transition-colors hover:bg-secondary"
              >
                Cài đặt Python
              </button>
            </div>
          </div>
          <div className="relative">
            <div className="absolute -inset-4 rounded-3xl bg-[var(--gold)]/10 blur-2xl" />
            <SafeImage
              src={pythonHero}
              alt="Minh hoạ ngôn ngữ Python"
              className="relative aspect-[16/10] w-full rounded-2xl border border-border object-cover"
            />
          </div>
        </div>
      </section>

      {/* Table of Contents */}
      <section className="border-b border-border bg-background">
        <div className="mx-auto max-w-6xl px-4 py-12">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">
            Mục lục
          </p>
          <div className="mt-6 grid gap-3 grid-cols-2 sm:grid-cols-3 md:grid-cols-5">
            {SECTIONS.map((s, i) => (
              <button
                key={s.id}
                onClick={() => scrollTo(s.id)}
                className={`group flex h-full flex-col gap-3 rounded-xl border p-4 text-left transition-all hover:border-primary hover:shadow-lg ${
                  activeSection === s.id
                    ? "border-primary bg-primary/5"
                    : "border-border bg-card"
                }`}
              >
                <span className="text-2xl font-black text-[var(--gold)]">
                  0{i + 1}
                </span>
                <span className="text-sm font-semibold leading-snug">
                  {s.label}
                </span>
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* Main Content */}
      <main className="mx-auto max-w-4xl px-4 py-20">
        {/* 01 Python là gì */}
        <Article
          id="python-la-gi"
          number="01"
          title="Python là gì?"
          image={pythonHero}
          imageAlt="Biểu tượng ngôn ngữ Python"
        >
          <p>
            <strong>Python</strong> là một ngôn ngữ lập trình bậc cao, mã nguồn
            mở, được Guido van Rossum tạo ra năm 1991. Triết lý thiết kế của
            Python đề cao sự rõ ràng và dễ đọc — một đoạn code Python thường
            đọc gần giống tiếng Anh tự nhiên.
          </p>
          <p>
            Khác với C++ hay Java, bạn không cần khai báo kiểu dữ liệu rườm rà,
            không cần dấu chấm phẩy cuối dòng, và cấu trúc khối code dựa vào
            thụt đầu dòng. Điều này khiến Python trở thành ngôn ngữ lý tưởng
            cho người mới bắt đầu.
          </p>
          <Callout>
            Một dòng <code>print("Hello, World!")</code> là đủ để chạy chương
            trình Python đầu tiên của bạn — không cần biên dịch, không cần
            thiết lập phức tạp.
          </Callout>
          <p>
            Python là ngôn ngữ <em>thông dịch</em> (interpreted) và{" "}
            <em>đa mục đích</em> (general-purpose). Bạn có thể dùng nó để viết
            một script đổi tên file, dựng một website, huấn luyện mô hình AI,
            hay phân tích dữ liệu tài chính — tất cả với cùng một cú pháp.
          </p>
          <CodeBlock
            language="python"
            code={`# Chương trình Python đầu tiên
print("Hello, World!")`}
          />
        </Article>

        {/* 02 Cài đặt Python */}
        <Article
          id="cai-dat-python"
          number="02"
          title="Cài đặt Python"
          image={pythonInstall}
          imageAlt="Cài đặt Python trên máy tính"
        >
          <p>
            Việc cài đặt Python rất đơn giản và miễn phí. Bạn có thể tải bản
            mới nhất (Python 3.12 trở lên) từ trang chính thức{" "}
            <a
              href="https://www.python.org/downloads"
              target="_blank"
              rel="noreferrer"
              className="font-semibold text-primary underline decoration-[var(--gold)] decoration-2 underline-offset-4"
            >
              python.org/downloads
            </a>
            .
          </p>
          <h3>Trên Windows</h3>
          <ol>
            <li>Tải file <code>.exe</code> từ python.org.</li>
            <li>
              Chạy installer và <strong>nhớ tick "Add Python to PATH"</strong>{" "}
              ngay trang đầu tiên.
            </li>
            <li>
              Mở Command Prompt và gõ <code>python --version</code> để kiểm tra.
            </li>
          </ol>
          <h3>Trên macOS</h3>
          <p>
            Cách nhanh nhất là dùng Homebrew: <code>brew install python</code>.
            Hoặc tải bộ cài <code>.pkg</code> từ python.org.
          </p>
          <h3>Trên Linux</h3>
          <p>
            Hầu hết các bản phân phối đã có sẵn Python. Nếu chưa, dùng:{" "}
            <code>sudo apt install python3 python3-pip</code> (Ubuntu/Debian).
          </p>
          <Callout>
            Sau khi cài, hãy cài thêm <strong>VS Code</strong> kèm extension
            "Python" của Microsoft — đây là môi trường phổ biến nhất để viết
            Python hiện nay.
          </Callout>
        </Article>

        {/* 03 Tại sao nên học Python */}
        <Article
          id="tai-sao-hoc-python"
          number="03"
          title="Tại sao nên học Python?"
          image={pythonCareers}
          imageAlt="Lý do học Python"
        >
          <p>
            Python liên tục đứng top 1–2 trong các bảng xếp hạng ngôn ngữ lập
            trình phổ biến nhất thế giới (TIOBE, Stack Overflow, GitHub
            Octoverse). Có 5 lý do chính:
          </p>
          <ul>
            <li>
              <strong>Cú pháp dễ đọc:</strong> Bạn dành thời gian để giải quyết
              vấn đề, không phải để vật lộn với cú pháp.
            </li>
            <li>
              <strong>Thư viện khổng lồ:</strong> NumPy, Pandas, Django,
              FastAPI, PyTorch, TensorFlow — gần như mọi bài toán đều có sẵn
              thư viện.
            </li>
            <li>
              <strong>Cộng đồng lớn:</strong> Gặp lỗi gì tra Google đều ra. Có
              hàng triệu lập trình viên Python để hỏi đáp.
            </li>
            <li>
              <strong>Đa nền tảng:</strong> Code chạy được trên Windows, macOS,
              Linux, server, thậm chí cả vi điều khiển.
            </li>
            <li>
              <strong>Lương cao, việc nhiều:</strong> Đặc biệt trong các lĩnh
              vực AI, Data Science và Backend.
            </li>
          </ul>
        </Article>

        {/* 04 Học xong Python làm được gì */}
        <Article
          id="python-lam-gi"
          number="04"
          title="Học xong Python làm được gì?"
          image={pythonCareers}
          imageAlt="Nghề nghiệp với Python"
        >
          <p>
            Python "ăn" gần như mọi mảng trong ngành công nghệ. Một vài hướng
            đi phổ biến:
          </p>
          <div className="my-6 grid gap-4 md:grid-cols-2 not-prose">
            {[
              {
                t: "Web Backend",
                d: "Django, FastAPI, Flask — xây dựng API và website cho startup, ngân hàng, e-commerce.",
              },
              {
                t: "Data Science & Analytics",
                d: "Pandas, NumPy, Matplotlib — phân tích dữ liệu, làm dashboard, báo cáo.",
              },
              {
                t: "AI & Machine Learning",
                d: "PyTorch, TensorFlow, scikit-learn — huấn luyện mô hình, làm chatbot, computer vision.",
              },
              {
                t: "Tự động hoá",
                d: "Selenium, BeautifulSoup, scripts — crawl web, tự động hoá công việc văn phòng.",
              },
              {
                t: "DevOps & Scripting",
                d: "Ansible, Fabric — quản lý hạ tầng, viết script triển khai.",
              },
              {
                t: "Game & Đồ hoạ",
                d: "Pygame, Blender scripting — làm game indie, plugin cho phần mềm 3D.",
              },
            ].map((card) => (
              <div
                key={card.t}
                className="group rounded-xl border border-border bg-card p-5 transition-colors hover:border-primary"
              >
                <div className="mb-2 h-1 w-8 rounded-full bg-[var(--gold)]" />
                <h4 className="font-bold">{card.t}</h4>
                <p className="mt-1 text-sm text-muted-foreground">{card.d}</p>
              </div>
            ))}
          </div>
        </Article>

        {/* 05 Những thứ cần biết khi học Python */}
        <Article
          id="can-biet"
          number="05"
          title="Những thứ cần biết khi học Python"
          image={pythonLearn}
          imageAlt="Lộ trình học Python"
        >
          <p>
            Đừng học lan man. Một lộ trình hợp lý cho người mới sẽ đi qua các
            chủ đề sau, theo đúng thứ tự:
          </p>
          <ol>
            <li>
              <strong>Cú pháp cơ bản:</strong> biến, kiểu dữ liệu, toán tử,{" "}
              <code>if/else</code>, vòng lặp <code>for/while</code>.
            </li>
            <li>
              <strong>Cấu trúc dữ liệu:</strong> list, tuple, dict, set — và
              khi nào dùng cái nào.
            </li>
            <li>
              <strong>Hàm và module:</strong> tách code thành hàm, import
              module, hiểu scope.
            </li>
            <li>
              <strong>OOP:</strong> class, kế thừa, đa hình — cần thiết cho
              project lớn.
            </li>
            <li>
              <strong>File I/O và exception:</strong> đọc/ghi file, xử lý lỗi
              với <code>try/except</code>.
            </li>
            <li>
              <strong>Thư viện chuẩn & pip:</strong> biết cách cài thư viện,
              dùng <code>venv</code> để tạo môi trường ảo.
            </li>
            <li>
              <strong>Một dự án nhỏ:</strong> làm thử web scraper, bot Discord,
              hoặc tool dòng lệnh — để gắn kiến thức lại với nhau.
            </li>
          </ol>
          <Callout>
            <strong>Mẹo:</strong> Đừng đọc sách suông. Cứ 30 phút lý thuyết thì
            phải có 60 phút gõ code thật. Lập trình là kỹ năng, không phải
            kiến thức.
          </Callout>
        </Article>
      </main>

      {/* Footer */}
      <footer className="border-t border-border bg-card">
        <div className="mx-auto flex max-w-6xl flex-col items-start justify-between gap-6 px-4 py-12 md:flex-row md:items-center">
          <div>
            <Link to="/" className="flex items-center gap-2 group">
              <span className="relative inline-flex h-8 w-8 items-center justify-center rounded-md bg-primary text-primary-foreground font-bold">
                N
              </span>
              <span className="font-semibold tracking-tight">
                Code<span className="text-primary">Nova</span>
              </span>
            </Link>
            <p className="mt-3 max-w-md text-sm text-muted-foreground">
              CodeNova — Nơi bắt đầu hành trình lập trình của bạn.
            </p>
          </div>
          <p className="text-xs text-muted-foreground">
            © {new Date().getFullYear()} CodeNova. All rights reserved.
          </p>
        </div>
      </footer>

      {/* Back to top */}
      {showBackToTop && (
        <button
          onClick={scrollToTop}
          className="fixed bottom-6 right-6 z-50 flex h-10 w-10 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg hover:opacity-90 transition-all"
          aria-label="Lên đầu trang"
        >
          <ChevronUp className="h-5 w-5" />
        </button>
      )}
    </div>
  );
}

// ─── Reusable Article Component ──────────────────────
function Article({
  id,
  number,
  title,
  image,
  imageAlt,
  children,
}: {
  id: string;
  number: string;
  title: string;
  image: string;
  imageAlt: string;
  children: React.ReactNode;
}) {
  return (
    <article
      id={id}
      className="scroll-mt-24 border-b border-border py-16 first:pt-0 last:border-0"
    >
      <div className="mb-8 flex items-baseline gap-4">
        <span className="font-mono text-sm font-semibold text-[var(--gold)]">
          {number}
        </span>
        <h2 className="text-3xl font-black tracking-tight md:text-4xl">
          {title}
        </h2>
      </div>
      <SafeImage
        src={image}
        alt={imageAlt}
        className="mb-8 aspect-[16/9] w-full rounded-2xl border border-border object-cover"
      />
      <div className="prose prose-neutral max-w-none prose-headings:font-bold prose-h3:text-lg prose-h3:mt-6 prose-p:leading-relaxed prose-li:my-1 prose-code:rounded prose-code:bg-muted prose-code:px-1.5 prose-code:py-0.5 prose-code:text-sm prose-code:before:content-none prose-code:after:content-none prose-a:text-primary">
        {children}
      </div>
    </article>
  );
}

// ─── Callout Box ─────────────────────────────────────
function Callout({ children }: { children: React.ReactNode }) {
  return (
    <aside className="not-prose my-6 flex gap-3 rounded-xl border-l-4 border-[var(--gold)] bg-[var(--gold-soft)]/40 p-4 text-sm leading-relaxed text-foreground">
      <span className="font-mono text-[var(--gold)]">→</span>
      <div>{children}</div>
    </aside>
  );
}

// ─── Safe Image (fallback nếu ảnh chưa có) ───────────
function SafeImage({
  src,
  alt,
  className,
}: {
  src: string;
  alt: string;
  className: string;
}) {
  const [hasError, setHasError] = useState(false);

  if (!src || hasError) {
    return (
      <div
        className={`${className} bg-secondary flex items-center justify-center text-muted-foreground text-sm`}
      >
        🖼️ {alt || "Hình ảnh minh hoạ"}
      </div>
    );
  }

  return (
    <img
      src={src}
      alt={alt}
      loading="lazy"
      className={className}
      onError={() => setHasError(true)}
    />
  );
}

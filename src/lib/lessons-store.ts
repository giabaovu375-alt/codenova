// LocalStorage-backed lessons store for Code Nova
export type CodeBlock = {
  id: string;
  code: string;
  explanation?: string;
};

export type Exercise = {
  id: string;
  prompt: string;
};

export type LessonLanguage =
  | "python"
  | "html"
  | "css"
  | "javascript"
  | "java"
  | "cpp";

export type Lesson = {
  slug: string;
  title: string;
  level: "Cơ bản" | "Trung cấp" | "Nâng cao";
  language?: LessonLanguage;
  description: string;
  image?: string; // data URL or external URL
  blocks: CodeBlock[];
  exercises: Exercise[];
  createdAt: number;
};

export const LANGUAGE_LABEL: Record<LessonLanguage, string> = {
  python: "Python",
  html: "HTML",
  css: "CSS",
  javascript: "JavaScript",
  java: "Java",
  cpp: "C++",
};

const KEY = "codenova:lessons:v2";

function uid() {
  return Math.random().toString(36).slice(2, 10);
}

const seed: Lesson[] = [
  {
    slug: "python-bat-dau",
    title: "Bắt đầu với Python",
    level: "Cơ bản",
    description: "Cài đặt, chạy chương trình đầu tiên và hiểu cú pháp Python.",
    blocks: [
      { code: 'print("Hello, Code Nova!")', explanation: "Hàm print() in nội dung ra màn hình. Chuỗi nằm trong dấu nháy." },
      { code: '# Đây là comment\nprint("Bỏ qua dòng trên")', explanation: "Dấu # bắt đầu một comment, Python sẽ bỏ qua." },
      { code: 'name = "Nova"\nprint("Xin chào,", name)', explanation: "Gán giá trị vào biến rồi sử dụng lại trong print." },
      { code: 'a = 10\nb = 3\nprint(a + b, a - b, a * b, a / b)', explanation: "Bốn phép toán cơ bản trên số nguyên." },
      { code: 'print(10 // 3)\nprint(10 % 3)\nprint(2 ** 8)', explanation: "Chia lấy nguyên, chia lấy dư, và lũy thừa." },
      { code: 'x = 5\nx += 2\nprint(x)', explanation: "Toán tử gán kết hợp += tăng giá trị biến." },
      { code: 'pi = 3.14\nradius = 2\nprint(pi * radius ** 2)', explanation: "Tính diện tích hình tròn." },
      { code: 'first = "Code"\nlast = "Nova"\nprint(first + " " + last)', explanation: "Nối chuỗi bằng dấu +." },
      { code: 'name = "Nova"\nprint(f"Xin chào {name}!")', explanation: "f-string giúp chèn biến trực tiếp vào chuỗi." },
      { code: 'age = input("Tuổi của bạn? ")\nprint("Bạn", age, "tuổi")', explanation: "input() đọc dữ liệu từ người dùng (luôn trả về chuỗi)." },
      { code: 'n = int(input("Nhập số: "))\nprint(n * 2)', explanation: "Ép kiểu chuỗi sang int để tính toán." },
      { code: 'print(type(10))\nprint(type(3.14))\nprint(type("hi"))', explanation: "type() cho biết kiểu dữ liệu." },
      { code: 'print(int("42"))\nprint(str(42))\nprint(float("3.14"))', explanation: "Chuyển đổi qua lại giữa các kiểu cơ bản." },
      { code: 'print(True and False)\nprint(True or False)\nprint(not True)', explanation: "Toán tử logic and / or / not." },
      { code: 'print(5 > 3)\nprint(5 == 5)\nprint(5 != 4)', explanation: "Toán tử so sánh trả về True hoặc False." },
    ].map(b => ({ id: uid(), ...b })),
    exercises: [
      { id: uid(), prompt: "Viết chương trình hỏi tên và in 'Xin chào <tên>'." },
      { id: uid(), prompt: "Tính chu vi và diện tích hình chữ nhật từ 2 số nhập vào." },
      { id: uid(), prompt: "Đổi nhiệt độ từ Celsius sang Fahrenheit." },
    ],
    createdAt: Date.now(),
  },
  {
    slug: "python-dieu-kien",
    title: "Câu lệnh điều kiện",
    level: "Cơ bản",
    description: "if / elif / else và các phép so sánh.",
    blocks: [
      { code: 'x = 10\nif x > 0:\n    print("dương")', explanation: "Câu lệnh if cơ bản. Khối lệnh thụt vào 4 khoảng trắng." },
      { code: 'x = -3\nif x >= 0:\n    print("không âm")\nelse:\n    print("âm")', explanation: "if-else chia hai nhánh." },
      { code: 'p = 75\nif p >= 90:\n    print("A")\nelif p >= 70:\n    print("B")\nelse:\n    print("C")', explanation: "elif xử lý nhiều điều kiện." },
      { code: 'a, b = 5, 8\nprint("max:", a if a > b else b)', explanation: "Biểu thức điều kiện một dòng." },
      { code: 'name = "nova"\nif name == "nova":\n    print("đúng")', explanation: "So sánh chuỗi bằng ==." },
      { code: 'n = 7\nif 1 <= n <= 10:\n    print("trong khoảng")', explanation: "Python cho phép so sánh chuỗi liên tiếp." },
      { code: 'age = 20\nif age >= 18 and age < 60:\n    print("người lớn")', explanation: "Kết hợp điều kiện bằng and." },
      { code: 'role = "admin"\nif role == "admin" or role == "mod":\n    print("có quyền")', explanation: "or trả True nếu một trong hai đúng." },
      { code: 'x = 0\nif not x:\n    print("x là falsy")', explanation: "0, '', None, [] đều được coi là falsy." },
      { code: 'fruits = ["táo", "lê"]\nif "táo" in fruits:\n    print("có táo")', explanation: "Toán tử in kiểm tra phần tử trong list." },
      { code: 'value = None\nif value is None:\n    print("trống")', explanation: "Dùng `is None` thay vì `== None`." },
      { code: 'n = 15\nif n % 2 == 0:\n    print("chẵn")\nelse:\n    print("lẻ")', explanation: "Kiểm tra số chẵn/lẻ." },
      { code: 'y = 2024\nif y % 4 == 0 and (y % 100 != 0 or y % 400 == 0):\n    print("nhuận")', explanation: "Kiểm tra năm nhuận." },
      { code: 'a, b, c = 3, 5, 4\nm = a\nif b > m: m = b\nif c > m: m = c\nprint(m)', explanation: "Tìm số lớn nhất trong ba số." },
      { code: 'pwd = "1234"\nif len(pwd) < 6:\n    print("yếu")\nelse:\n    print("ok")', explanation: "len() trả về độ dài chuỗi." },
    ].map(b => ({ id: uid(), ...b })),
    exercises: [
      { id: uid(), prompt: "Nhập 1 số, in ra 'âm', 'dương' hoặc 'không'." },
      { id: uid(), prompt: "Nhập điểm 0-10, in ra xếp loại Giỏi/Khá/TB/Yếu." },
      { id: uid(), prompt: "Kiểm tra một năm có phải năm nhuận hay không." },
    ],
    createdAt: Date.now(),
  },
  {
    slug: "python-vong-lap",
    title: "Vòng lặp",
    level: "Cơ bản",
    description: "for, while, range và break/continue.",
    blocks: [
      { code: 'for i in range(5):\n    print(i)', explanation: "range(5) tạo dãy 0..4." },
      { code: 'for i in range(1, 6):\n    print(i)', explanation: "range(start, stop) đi từ start đến stop-1." },
      { code: 'for i in range(0, 10, 2):\n    print(i)', explanation: "Tham số thứ ba là bước nhảy." },
      { code: 'fruits = ["táo", "lê", "cam"]\nfor f in fruits:\n    print(f)', explanation: "Duyệt qua từng phần tử trong list." },
      { code: 'for i, f in enumerate(["a", "b"]):\n    print(i, f)', explanation: "enumerate() trả về cả chỉ số." },
      { code: 'n = 5\nwhile n > 0:\n    print(n)\n    n -= 1', explanation: "while lặp khi điều kiện còn đúng." },
      { code: 'for i in range(10):\n    if i == 5:\n        break\n    print(i)', explanation: "break thoát khỏi vòng lặp." },
      { code: 'for i in range(5):\n    if i == 2:\n        continue\n    print(i)', explanation: "continue bỏ qua vòng lặp hiện tại." },
      { code: 's = 0\nfor i in range(1, 101):\n    s += i\nprint(s)', explanation: "Tính tổng 1..100." },
      { code: 'for i in range(1, 4):\n    for j in range(1, 4):\n        print(i, j)', explanation: "Vòng lặp lồng nhau." },
      { code: 'n = 5\nfor i in range(1, n+1):\n    print("*" * i)', explanation: "In tam giác sao." },
      { code: 'word = "nova"\nfor c in word:\n    print(c)', explanation: "Duyệt từng ký tự của chuỗi." },
      { code: 'for i in range(10):\n    if i % 2 == 0:\n        print(i)', explanation: "In số chẵn từ 0..9." },
      { code: 'fact = 1\nfor i in range(1, 6):\n    fact *= i\nprint(fact)', explanation: "Tính 5! = 120." },
      { code: 'else_test = 0\nfor i in range(3):\n    pass\nelse:\n    print("xong")', explanation: "for-else: else chạy khi vòng lặp kết thúc bình thường." },
    ].map(b => ({ id: uid(), ...b })),
    exercises: [
      { id: uid(), prompt: "In bảng cửu chương 2 đến 9." },
      { id: uid(), prompt: "Đếm số chữ số của một số nguyên dương." },
      { id: uid(), prompt: "Tìm tất cả ước số của một số n." },
    ],
    createdAt: Date.now(),
  },
  {
    slug: "python-list-dict",
    title: "List, Tuple và Dict",
    level: "Trung cấp",
    description: "Cấu trúc dữ liệu cơ bản trong Python.",
    blocks: [
      { code: 'a = [1, 2, 3]\nprint(a[0], a[-1])', explanation: "Truy cập phần tử bằng chỉ số. -1 là phần tử cuối." },
      { code: 'a = [1, 2, 3]\na.append(4)\nprint(a)', explanation: "append() thêm vào cuối list." },
      { code: 'a = [1, 2, 3, 4]\nprint(a[1:3])', explanation: "Slicing lấy lát cắt từ chỉ số 1..2." },
      { code: 'a = [3, 1, 2]\na.sort()\nprint(a)', explanation: "sort() sắp xếp tăng dần tại chỗ." },
      { code: 'a = [1, 2, 3]\nb = [x*2 for x in a]\nprint(b)', explanation: "List comprehension." },
      { code: 'a = (1, 2, 3)\nprint(a[0])', explanation: "Tuple giống list nhưng không sửa được." },
      { code: 'a, b, c = (10, 20, 30)\nprint(b)', explanation: "Unpacking tuple vào nhiều biến." },
      { code: 'd = {"name": "Nova", "age": 1}\nprint(d["name"])', explanation: "Dict lưu cặp key-value." },
      { code: 'd = {"a": 1}\nd["b"] = 2\nprint(d)', explanation: "Thêm key mới bằng cách gán." },
      { code: 'd = {"a": 1, "b": 2}\nfor k, v in d.items():\n    print(k, v)', explanation: "Duyệt key-value bằng items()." },
      { code: 'd = {"a": 1}\nprint(d.get("z", 0))', explanation: "get() trả mặc định nếu key không tồn tại." },
      { code: 's = {1, 2, 2, 3}\nprint(s)', explanation: "Set không có phần tử trùng." },
      { code: 'a = [1, 2, 3]\nprint(len(a), sum(a), max(a))', explanation: "Hàm có sẵn cho list số." },
      { code: 'a = [1, 2, 3]\nprint(list(reversed(a)))', explanation: "reversed() đảo ngược dãy." },
      { code: 'pairs = list(zip([1,2,3], ["a","b","c"]))\nprint(pairs)', explanation: "zip() ghép hai dãy lại." },
    ].map(b => ({ id: uid(), ...b })),
    exercises: [
      { id: uid(), prompt: "Đếm số lần xuất hiện của mỗi ký tự trong chuỗi." },
      { id: uid(), prompt: "Loại bỏ phần tử trùng trong list mà giữ thứ tự." },
      { id: uid(), prompt: "Trộn 2 dict thành 1 dict mới." },
    ],
    createdAt: Date.now(),
  },
  {
    slug: "python-ham-module",
    title: "Hàm và Module",
    level: "Nâng cao",
    description: "Định nghĩa hàm, tham số và sử dụng module.",
    blocks: [
      { code: 'def hello():\n    print("hi")\nhello()', explanation: "Định nghĩa hàm bằng def và gọi hàm." },
      { code: 'def add(a, b):\n    return a + b\nprint(add(2, 3))', explanation: "Hàm có tham số và return giá trị." },
      { code: 'def greet(name="bạn"):\n    print("Chào", name)\ngreet()\ngreet("Nova")', explanation: "Tham số có giá trị mặc định." },
      { code: 'def info(name, age):\n    print(name, age)\ninfo(age=20, name="Nova")', explanation: "Truyền tham số bằng tên." },
      { code: 'def total(*nums):\n    return sum(nums)\nprint(total(1,2,3,4))', explanation: "*args nhận số tham số bất kỳ." },
      { code: 'def show(**kw):\n    print(kw)\nshow(a=1, b=2)', explanation: "**kwargs nhận tham số dạng key-value." },
      { code: 'square = lambda x: x*x\nprint(square(5))', explanation: "Hàm lambda ngắn gọn." },
      { code: 'a = [1,2,3,4]\nprint(list(filter(lambda x: x%2==0, a)))', explanation: "filter() lọc theo điều kiện." },
      { code: 'a = [1,2,3]\nprint(list(map(lambda x: x*10, a)))', explanation: "map() biến đổi từng phần tử." },
      { code: 'import math\nprint(math.sqrt(16))', explanation: "Import module math sử dụng sqrt." },
      { code: 'from math import pi, sin\nprint(pi, sin(0))', explanation: "Import phần tử cụ thể từ module." },
      { code: 'import random\nprint(random.randint(1, 10))', explanation: "random sinh số ngẫu nhiên." },
      { code: 'from datetime import datetime\nprint(datetime.now())', explanation: "Lấy thời gian hiện tại." },
      { code: 'def factorial(n):\n    return 1 if n <= 1 else n * factorial(n-1)\nprint(factorial(5))', explanation: "Hàm đệ quy tính giai thừa." },
      { code: 'def fib(n):\n    a, b = 0, 1\n    for _ in range(n):\n        a, b = b, a+b\n    return a\nprint(fib(10))', explanation: "Tính Fibonacci dùng vòng lặp." },
    ].map(b => ({ id: uid(), ...b })),
    exercises: [
      { id: uid(), prompt: "Viết hàm kiểm tra số nguyên tố." },
      { id: uid(), prompt: "Viết hàm đảo ngược một chuỗi không dùng [::-1]." },
      { id: uid(), prompt: "Viết hàm tính UCLN của hai số." },
    ],
    createdAt: Date.now(),
  },
  {
    slug: "html-co-ban",
    title: "HTML cơ bản",
    level: "Cơ bản",
    language: "html",
    description: "Cấu trúc trang web, các thẻ HTML thường dùng.",
    blocks: [
      { code: '<!DOCTYPE html>\n<html>\n<head><title>Chào</title></head>\n<body>Hello</body>\n</html>', explanation: "Khung HTML5 tối thiểu." },
      { code: '<h1>Tiêu đề lớn</h1>\n<h2>Tiêu đề nhỏ hơn</h2>', explanation: "Thẻ heading từ h1 đến h6." },
      { code: '<p>Một đoạn văn bản.</p>', explanation: "Thẻ <p> tạo đoạn văn." },
      { code: '<a href="https://google.com">Tới Google</a>', explanation: "Thẻ <a> tạo siêu liên kết." },
      { code: '<img src="logo.png" alt="Logo" />', explanation: "Hiển thị ảnh, alt giúp SEO và accessibility." },
      { code: '<ul>\n  <li>Táo</li>\n  <li>Lê</li>\n</ul>', explanation: "Danh sách không thứ tự." },
      { code: '<ol>\n  <li>Một</li>\n  <li>Hai</li>\n</ol>', explanation: "Danh sách có thứ tự." },
      { code: '<div class="box">Nội dung</div>', explanation: "Div là khối container thông dụng." },
      { code: '<span style="color:red">đỏ</span>', explanation: "Span là phần tử inline." },
      { code: '<input type="text" placeholder="Tên" />', explanation: "Ô nhập văn bản đơn." },
      { code: '<button onclick="alert(1)">Bấm</button>', explanation: "Nút bấm với sự kiện onclick." },
      { code: '<form action="/submit" method="post">\n  <input name="email" />\n  <button>Gửi</button>\n</form>', explanation: "Form gửi dữ liệu lên server." },
      { code: '<table>\n  <tr><th>Tên</th><th>Tuổi</th></tr>\n  <tr><td>Nova</td><td>1</td></tr>\n</table>', explanation: "Bảng đơn giản gồm hàng và cột." },
      { code: '<header>...</header>\n<main>...</main>\n<footer>...</footer>', explanation: "Các thẻ semantic giúp cấu trúc rõ ràng." },
      { code: '<meta name="viewport" content="width=device-width, initial-scale=1" />', explanation: "Meta viewport giúp web responsive trên mobile." },
    ].map(b => ({ id: uid(), ...b })),
    exercises: [
      { id: uid(), prompt: "Tạo trang giới thiệu bản thân với heading, ảnh, đoạn văn." },
      { id: uid(), prompt: "Tạo form đăng ký gồm email, mật khẩu, nút submit." },
    ],
    createdAt: Date.now(),
  },
  {
    slug: "css-co-ban",
    title: "CSS cơ bản",
    level: "Cơ bản",
    language: "css",
    description: "Định kiểu cho HTML: màu sắc, layout, responsive.",
    blocks: [
      { code: 'p { color: red; }', explanation: "Selector theo tên thẻ." },
      { code: '.box { background: yellow; }', explanation: "Selector theo class." },
      { code: '#main { padding: 20px; }', explanation: "Selector theo id." },
      { code: 'div { margin: 10px; padding: 8px; border: 1px solid #000; }', explanation: "Box model: margin, padding, border." },
      { code: 'body { font-family: Arial, sans-serif; font-size: 16px; }', explanation: "Đặt font cho toàn trang." },
      { code: '.center { text-align: center; }', explanation: "Căn giữa văn bản." },
      { code: '.flex { display: flex; gap: 12px; justify-content: space-between; }', explanation: "Flexbox để xếp ngang." },
      { code: '.grid { display: grid; grid-template-columns: 1fr 1fr 1fr; }', explanation: "Grid 3 cột bằng nhau." },
      { code: 'a:hover { color: orange; }', explanation: "Pseudo-class :hover khi rê chuột." },
      { code: '.btn { background: #000; color: #fff; padding: 8px 16px; border-radius: 6px; }', explanation: "Style nút bấm cơ bản." },
      { code: '@media (max-width: 600px) {\n  .grid { grid-template-columns: 1fr; }\n}', explanation: "Media query cho mobile." },
      { code: ':root { --main: #f5c518; }\n.btn { background: var(--main); }', explanation: "CSS variables giúp tái sử dụng." },
      { code: '.card { box-shadow: 0 4px 12px rgba(0,0,0,.1); }', explanation: "Đổ bóng tạo chiều sâu." },
      { code: '.fade { transition: opacity .3s; }\n.fade:hover { opacity: .5; }', explanation: "Transition tạo hiệu ứng mượt." },
      { code: 'img { max-width: 100%; height: auto; }', explanation: "Ảnh co dãn theo container." },
    ].map(b => ({ id: uid(), ...b })),
    exercises: [
      { id: uid(), prompt: "Tạo card sản phẩm với ảnh, tiêu đề, giá, nút mua." },
      { id: uid(), prompt: "Layout 3 cột desktop, 1 cột mobile bằng grid + media query." },
    ],
    createdAt: Date.now(),
  },
  {
    slug: "javascript-co-ban",
    title: "JavaScript cơ bản",
    level: "Cơ bản",
    language: "javascript",
    description: "Biến, hàm, DOM và các khái niệm nền tảng.",
    blocks: [
      { code: 'console.log("Hello Nova");', explanation: "In ra console của trình duyệt." },
      { code: 'let x = 10;\nconst PI = 3.14;', explanation: "let cho biến thay đổi, const cho hằng." },
      { code: 'let s = `Xin chào ${"Nova"}`;\nconsole.log(s);', explanation: "Template literal dùng dấu backtick." },
      { code: 'function add(a, b) {\n  return a + b;\n}\nconsole.log(add(2, 3));', explanation: "Khai báo hàm bằng function." },
      { code: 'const square = x => x * x;\nconsole.log(square(5));', explanation: "Arrow function gọn hơn." },
      { code: 'const arr = [1, 2, 3];\narr.push(4);\nconsole.log(arr);', explanation: "Mảng và phương thức push." },
      { code: 'const arr = [1,2,3];\nconst doubled = arr.map(n => n * 2);\nconsole.log(doubled);', explanation: "map() trả về mảng mới." },
      { code: 'const arr = [1,2,3,4];\nconst even = arr.filter(n => n % 2 === 0);\nconsole.log(even);', explanation: "filter() lọc theo điều kiện." },
      { code: 'const user = { name: "Nova", age: 1 };\nconsole.log(user.name);', explanation: "Object với cặp key-value." },
      { code: 'const { name, age } = { name: "Nova", age: 1 };\nconsole.log(name, age);', explanation: "Destructuring object." },
      { code: 'if (x > 0) console.log("dương");\nelse console.log("không dương");', explanation: "Câu lệnh if-else." },
      { code: 'for (let i = 0; i < 3; i++) console.log(i);', explanation: "Vòng lặp for cổ điển." },
      { code: 'document.querySelector("#btn").addEventListener("click", () => alert("Hi"));', explanation: "Bắt sự kiện click trên DOM." },
      { code: 'fetch("/api/data")\n  .then(r => r.json())\n  .then(d => console.log(d));', explanation: "Gọi API bằng fetch." },
      { code: 'async function load() {\n  const r = await fetch("/api/data");\n  return r.json();\n}', explanation: "async/await đọc dễ hơn .then()." },
    ].map(b => ({ id: uid(), ...b })),
    exercises: [
      { id: uid(), prompt: "Viết hàm đảo ngược một chuỗi không dùng split/reverse." },
      { id: uid(), prompt: "Lọc các số > 10 trong mảng và in tổng." },
    ],
    createdAt: Date.now(),
  },
  {
    slug: "java-co-ban",
    title: "Java cơ bản",
    level: "Trung cấp",
    language: "java",
    description: "Cú pháp Java, class và OOP nền tảng.",
    blocks: [
      { code: 'public class Main {\n    public static void main(String[] args) {\n        System.out.println("Hello Nova");\n    }\n}', explanation: "Chương trình Java tối thiểu." },
      { code: 'int a = 10;\ndouble b = 3.14;\nString s = "Nova";', explanation: "Khai báo biến với kiểu rõ ràng." },
      { code: 'final int MAX = 100;', explanation: "final tạo hằng số." },
      { code: 'int sum = a + b;\nSystem.out.println(sum);', explanation: "Phép toán cộng và in ra." },
      { code: 'if (a > 0) {\n    System.out.println("dương");\n} else {\n    System.out.println("không dương");\n}', explanation: "Câu lệnh if-else trong Java." },
      { code: 'for (int i = 0; i < 5; i++) {\n    System.out.println(i);\n}', explanation: "Vòng lặp for." },
      { code: 'int[] arr = {1, 2, 3};\nfor (int n : arr) System.out.println(n);', explanation: "Mảng và for-each." },
      { code: 'String name = "Nova";\nSystem.out.println(name.length());', explanation: "Phương thức của String." },
      { code: 'public static int add(int a, int b) {\n    return a + b;\n}', explanation: "Khai báo phương thức static." },
      { code: 'class Dog {\n    String name;\n    void bark() { System.out.println(name + ": Woof"); }\n}', explanation: "Định nghĩa class với field và method." },
      { code: 'Dog d = new Dog();\nd.name = "Rex";\nd.bark();', explanation: "Tạo object và gọi method." },
      { code: 'class Animal { void speak() {} }\nclass Cat extends Animal { void speak() { System.out.println("Meow"); } }', explanation: "Kế thừa với extends và override." },
      { code: 'try {\n    int x = 10 / 0;\n} catch (ArithmeticException e) {\n    System.out.println("Lỗi: " + e.getMessage());\n}', explanation: "Bắt ngoại lệ với try-catch." },
      { code: 'import java.util.ArrayList;\nArrayList<Integer> list = new ArrayList<>();\nlist.add(1);\nlist.add(2);', explanation: "ArrayList là list động." },
      { code: 'import java.util.HashMap;\nHashMap<String, Integer> map = new HashMap<>();\nmap.put("a", 1);', explanation: "HashMap lưu cặp key-value." },
    ].map(b => ({ id: uid(), ...b })),
    exercises: [
      { id: uid(), prompt: "Viết class Sinh viên với tên, điểm, phương thức xếp loại." },
      { id: uid(), prompt: "Tính giai thừa của n bằng vòng lặp." },
    ],
    createdAt: Date.now(),
  },
  {
    slug: "cpp-co-ban",
    title: "C++ cơ bản",
    level: "Trung cấp",
    language: "cpp",
    description: "Cú pháp C++, con trỏ và STL nền tảng.",
    blocks: [
      { code: '#include <iostream>\nusing namespace std;\nint main() {\n    cout << "Hello Nova" << endl;\n    return 0;\n}', explanation: "Chương trình C++ tối thiểu." },
      { code: 'int a = 10;\ndouble b = 3.14;\nstring s = "Nova";', explanation: "Khai báo biến cơ bản." },
      { code: 'const int MAX = 100;', explanation: "const tạo hằng số." },
      { code: 'int x;\ncin >> x;\ncout << x * 2;', explanation: "Đọc số từ bàn phím." },
      { code: 'if (x > 0) cout << "dương";\nelse cout << "không dương";', explanation: "if-else trong C++." },
      { code: 'for (int i = 0; i < 5; i++) cout << i << " ";', explanation: "Vòng lặp for." },
      { code: 'int arr[5] = {1, 2, 3, 4, 5};\nfor (int i = 0; i < 5; i++) cout << arr[i];', explanation: "Mảng tĩnh kích thước cố định." },
      { code: 'int x = 10;\nint* p = &x;\ncout << *p;', explanation: "Con trỏ trỏ tới địa chỉ của biến." },
      { code: 'int add(int a, int b) {\n    return a + b;\n}', explanation: "Hàm trả về int." },
      { code: 'void swap(int& a, int& b) {\n    int t = a; a = b; b = t;\n}', explanation: "Tham chiếu để hàm sửa biến gốc." },
      { code: '#include <vector>\nvector<int> v = {1, 2, 3};\nv.push_back(4);', explanation: "vector là mảng động trong STL." },
      { code: '#include <string>\nstring s = "Nova";\ncout << s.length();', explanation: "string của STL tiện hơn char[]." },
      { code: 'class Dog {\npublic:\n    string name;\n    void bark() { cout << name << ": Woof"; }\n};', explanation: "Định nghĩa class với public method." },
      { code: 'Dog d;\nd.name = "Rex";\nd.bark();', explanation: "Tạo object và gọi method." },
      { code: '#include <algorithm>\nvector<int> v = {3,1,2};\nsort(v.begin(), v.end());', explanation: "sort() từ thư viện algorithm." },
    ].map(b => ({ id: uid(), ...b })),
    exercises: [
      { id: uid(), prompt: "Nhập n số nguyên vào vector, in ra số lớn nhất." },
      { id: uid(), prompt: "Viết hàm đệ quy tính Fibonacci." },
    ],
    createdAt: Date.now(),
  },
];

function read(): Lesson[] {
  if (typeof window === "undefined") return seed;
  const raw = localStorage.getItem(KEY);
  if (!raw) {
    localStorage.setItem(KEY, JSON.stringify(seed));
    return seed;
  }
  try {
    return JSON.parse(raw) as Lesson[];
  } catch {
    return seed;
  }
}

function write(lessons: Lesson[]) {
  if (typeof window === "undefined") return;
  localStorage.setItem(KEY, JSON.stringify(lessons));
  window.dispatchEvent(new Event("codenova:lessons:changed"));
}

export const lessonsStore = {
  list(): Lesson[] {
    return read().sort((a, b) => b.createdAt - a.createdAt);
  },
  get(slug: string): Lesson | undefined {
    return read().find(l => l.slug === slug);
  },
  upsert(lesson: Lesson) {
    const all = read();
    const idx = all.findIndex(l => l.slug === lesson.slug);
    if (idx >= 0) all[idx] = lesson;
    else all.push(lesson);
    write(all);
  },
  remove(slug: string) {
    write(read().filter(l => l.slug !== slug));
  },
  reset() {
    if (typeof window !== "undefined") localStorage.removeItem(KEY);
  },
  newId: uid,
  slugify(s: string) {
    return s
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/đ/g, "d")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)/g, "")
      .slice(0, 60) || "lesson-" + uid();
  },
};

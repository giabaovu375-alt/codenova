// Mỗi bài học có thể có một mảng câu hỏi
export const QUESTIONS_BY_LESSON: Record<string, {
  code: string;       // code mẫu hiển thị
  language: string;
  questions: { question: string; options: string[]; answer: number }[];
}> = {
  "python-oop-co-ban": {
    code: `class Student:\n    def __init__(self, name):\n        self.name = name\n\ns1 = Student("An")\nprint(s1.name)`,
    language: "python",
    questions: [
      {
        question: "Hàm __init__ trong class có vai trò gì?",
        options: ["Hàm hủy", "Hàm khởi tạo", "Hàm in dữ liệu", "Hàm tính toán"],
        answer: 1,
      },
      {
        question: "Kết quả của print(s1.name) là gì?",
        options: ["An", "Student", "None", "Lỗi"],
        answer: 0,
      },
    ],
  },
  // Thêm bài khác ở đây
};

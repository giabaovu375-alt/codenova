// lib/pyodide-runner.ts
// Tải Pyodide từ CDN và cung cấp hàm runPython

let pyodidePromise: Promise<any> | null = null;

function loadScript(src: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const script = document.createElement("script");
    script.src = src;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error(`Không thể tải ${src}`));
    document.head.appendChild(script);
  });
}

export async function getPyodide() {
  if (pyodidePromise) return pyodidePromise;

  pyodidePromise = (async () => {
    // Tải Pyodide core + Python standard library
    await loadScript("https://cdn.jsdelivr.net/pyodide/v0.24.1/full/pyodide.js");

    // @ts-ignore
    const pyodide = await window.loadPyodide({
      indexURL: "https://cdn.jsdelivr.net/pyodide/v0.24.1/full/",
    });

    return pyodide;
  })();

  return pyodidePromise;
}

export async function runPython(code: string) {
  try {
    const pyodide = await getPyodide();
    let stdout = "";

    // Chuyển hướng stdout
    pyodide.setStdout({
      batched: (text: string) => {
        stdout += text + "\n";
      },
    });

    // Chạy code
    await pyodide.runPythonAsync(code);
    return { stdout: stdout.trim() || "(không có output)", error: "" };
  } catch (e: any) {
    return { stdout: "", error: e.message || String(e) };
  }
}

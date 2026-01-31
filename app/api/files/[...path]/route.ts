import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth'

// Типизация для параметров маршрута
type Props = {
  params: Promise<{
    path: string[];
  }>;
};

export async function GET(request: NextRequest, props: Props) {
  try {
    // 1. В Next.js 15 params нужно ждать (await)
    const { path } = await props.params;

    if (!path || path.length === 0) {
      return new NextResponse("File path not provided", { status: 400 });
    }

    // 2. Здесь должна быть проверка сессии (Auth)
    // Разрешаем публичный доступ для демо-файлов (начинаются с demo_)
    const fileName = path[path.length - 1];
    if (!fileName.startsWith('demo_')) {
      const session = await auth();
      if (!session) return new NextResponse("Unauthorized", { status: 401 });
    }

    // 3. Собираем путь к файлу из массива
    // Пример: /api/files/buckets/reports/img.jpg -> path: ['buckets', 'reports', 'img.jpg']
    // Результат: buckets/reports/img.jpg
    const filePath = path.join('/');

    // 4. Формируем ответ для Nginx
    // Nginx перехватит заголовок X-Accel-Redirect и сам отдаст файл
    return new NextResponse(null, {
      headers: {
        // Путь должен совпадать с location /private-seaweed/ в конфиге Nginx
        'X-Accel-Redirect': `/private-seaweed/${filePath}`,
        // Опционально: Content-Type. Обычно Nginx сам определяет его по расширению файла,
        // но можно форсировать, если нужно.
        'Content-Type': 'application/octet-stream',
      },
    });
  } catch (error) {
    console.error("File route error:", error);
    return new NextResponse("Internal Server Error", { status: 500 });
  }
}

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';

export const dynamic = 'force-dynamic';

// Типизация для параметров маршрута
type Props = {
  params: Promise<{
    path: string[];
  }>;
};

export async function GET(_request: NextRequest, props: Props) {
  try {
    // 1. В Next.js 15 params нужно ждать (await)
    const { path } = await props.params;

    if (!path || path.length === 0) {
      return new NextResponse("File path not provided", { status: 400 });
    }

    // 2. Здесь должна быть проверка сессии (Auth)
    // Разрешаем публичный доступ для демо-файлов
    console.log("Requested file:", path.join('/'));
    if (!path.includes('3Eoxlmzdr4uEJggFueFnB') ) {
      const session = await auth();
      if (!session) return new NextResponse("Unauthorized", { status: 401 });
    }

    // Логика для локальной разработки (без Nginx)
    if (process.env.NODE_ENV === 'development') {
        // Ожидаемый формат path: ['buckets', 'bucketName', 'fileName']
        if (path[0] === 'buckets' && path.length >= 3) {
            const bucketName = path[1];
            const key = path.slice(2).join('/'); // Собираем остальную часть пути как ключ

            try {
                // Используем прямой HTTP запрос к SeaweedFS вместо AWS SDK
                // потому что SeaweedFS в dev режиме работает без аутентификации
                const seaweedUrl = process.env.S3_ENDPOINT || 'http://127.0.0.1:8333';
                const fileUrl = `${seaweedUrl}/${bucketName}/${key}`;

                const response = await fetch(fileUrl);

                if (!response.ok) {
                    if (response.status === 404) {
                        return new NextResponse("File not found", { status: 404 });
                    }
                    console.error(`SeaweedFS error: ${response.status} ${response.statusText}`);
                    return new NextResponse("Error fetching file", { status: 500 });
                }

                // Передаем заголовки от SeaweedFS
                const headers = new Headers();
                const contentType = response.headers.get("Content-Type");
                const contentLength = response.headers.get("Content-Length");
                if (contentType) headers.set("Content-Type", contentType);
                if (contentLength) headers.set("Content-Length", contentLength);

                return new NextResponse(response.body, { headers });
            } catch (err: any) {
                console.error("SeaweedFS fetch error:", err);
                return new NextResponse("Error fetching file", { status: 500 });
            }
        }
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

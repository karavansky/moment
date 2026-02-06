import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth'
import { GetObjectCommand } from "@aws-sdk/client-s3";
import { s3Client } from "@/lib/s3";

export const dynamic = 'force-dynamic';

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
                const command = new GetObjectCommand({
                    Bucket: bucketName,
                    Key: key,
                });
                
                const response = await s3Client.send(command);
                
                // Преобразуем ReadableStream (web) или Readable (node) в то, что понимает NextResponse
                // @ts-ignore - типы AWS SDK и Next.js могут немного конфликтовать, но body совместим
                const stream = response.Body as ReadableStream; 

                const headers = new Headers();
                if (response.ContentType) headers.set("Content-Type", response.ContentType);
                if (response.ContentLength) headers.set("Content-Length", response.ContentLength.toString());

                return new NextResponse(stream, { headers });
            } catch (err: any) {
                console.error("S3 GetObject error:", err);
                if (err.name === 'NoSuchKey') {
                    return new NextResponse("File not found", { status: 404 });
                }
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

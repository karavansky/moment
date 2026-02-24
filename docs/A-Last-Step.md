Проблема находится в функции getGeoData (AppointmentReport.tsx:149) и конкретно в том, как она вызывается из handleFinish.

Есть два взаимосвязанных места:

1. Условие вычисления distance (строка 171):


if (clientLat && clientLon) {
  distance = haversineMeters(lat, lon, clientLat, clientLon)
}
distance вычисляется только если у клиента есть координаты. Если appointment.client?.latitude или longitude — undefined/null/0, расстояние не посчитается.

2. Таймаут геолокации (строка 177):


{ enableHighAccuracy: true, timeout: 5000 }
Это главная причина нестабильности. enableHighAccuracy: true требует GPS, который может долго получать фикс. 5 секунд — очень короткий таймаут. Если первый вызов успел (браузер вернул кешированную позицию), а второй — нет (требовался свежий GPS-фикс), срабатывает error callback:


() => resolve({})  // ← всё geo = {}
В итоге geo.distance = undefined, и при JSON.stringify это поле просто выбрасывается из тела запроса:


closeDistanceToAppointment: geo.distance  // undefined → поле не попадает в JSON
Сервер ничего не получает и не сохраняет.

Также: maximumAge не указан (по умолчанию 0) — значит браузер каждый раз запрашивает свежую позицию, без кеша.

Фикс — добавить maximumAge и увеличить timeout, или разделить сохранение closeAt и гео-данных:


{ enableHighAccuracy: true, timeout: 10000, maximumAge: 30000 }


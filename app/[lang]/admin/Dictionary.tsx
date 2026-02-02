'use client'

import React, { useState, useEffect } from 'react'
import DictionaryTable from './DictionaryTable'

// Импортируем все словари
import enDict from '@/config/dictionaries/en.json'
import deDict from '@/config/dictionaries/de.json'
import ruDict from '@/config/dictionaries/ru.json'
import frDict from '@/config/dictionaries/fr.json'
import esDict from '@/config/dictionaries/es.json'
import ukDict from '@/config/dictionaries/uk.json'
import ptDict from '@/config/dictionaries/pt.json'
import trDict from '@/config/dictionaries/tr.json'
import jaDict from '@/config/dictionaries/ja.json'
import idDict from '@/config/dictionaries/id.json'
import itDict from '@/config/dictionaries/it.json'
import plDict from '@/config/dictionaries/pl.json'

const Dictionary = () => {
  // Собираем все словари с ключами языков
  const initialDictionaries = {
    en: enDict,
    de: deDict,
    ru: ruDict,
    fr: frDict,
    es: esDict,
    uk: ukDict,
    pt: ptDict,
    tr: trDict,
    ja: jaDict,
    id: idDict,
    it: itDict,
    pl: plDict,
  }

  const [dictionaries, setDictionaries] = useState(initialDictionaries)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    // Словари уже загружены через импорты
    setIsLoading(false)
  }, [])

  const handleSave = (updatedDictionaries: any) => {
    setDictionaries(updatedDictionaries)
    console.log('Сохранено:', updatedDictionaries)
  }

  const handleAddKey = (keyPath: string[], values: { [lang: string]: string }) => {
    console.log('Добавлен ключ:', { keyPath, values })
  }

  const handleDeleteKey = (keyPath: string[]) => {
    console.log('Удален ключ:', keyPath)
  }

  if (isLoading) {
    return (
      <div className="p-6 flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-default-500">Загрузка словарей...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-6">Редактор многоязычных словарей (12 языков)</h1>
      <p className="text-default-500 mb-8">
        Нажмите на значение, чтобы отредактировать его. Используйте кнопки для загрузки/выгрузки
        JSON файлов.
      </p>

      <DictionaryTable
        dictionaries={dictionaries}
        onSave={handleSave}
        onAddKey={handleAddKey}
        onDeleteKey={handleDeleteKey}
        maxPreviewLength={50}
      />

      <div className="mt-8 p-4 bg-default-100 rounded-lg">
        <h3 className="font-semibold mb-2">Инструкция:</h3>
        <ul className="list-disc pl-5 space-y-1 text-sm">
          <li>Нажмите на значение в ячейке для редактирования</li>
          <li>
            Используйте кнопки загрузки/выгрузки в панели управления для работы с JSON файлами
          </li>
          <li>Наведите курсор на значение, чтобы увидеть полный текст</li>
          <li>Прокручивайте таблицу горизонтально для просмотра всех языков</li>
          <li>Колонки "Действия" и "Ключ" закреплены для удобства</li>
          <li>Используйте поиск для быстрого нахождения нужных ключей</li>
        </ul>
      </div>
    </div>
  )
}

export default Dictionary

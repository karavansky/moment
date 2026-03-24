'use client'

import { Card } from '@heroui/react'
import {
  Target,
  Users,
  CheckCircle,
  XCircle,
  Building2,
  Calendar,
  FileText,
  Shield,
} from 'lucide-react'

export function SportBookingInfo() {
  return (
    <div className="min-h-screen bg-default-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-5xl mx-auto">
        {/* Header */}
        <div className="text-center mb-12">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 mb-4">
            <Calendar className="w-5 h-5" />
            <span className="text-sm font-medium">Sport- und Bäderamt Bonn</span>
          </div>
          <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight text-default-900 mb-4">
            Sport Booking System
          </h1>
          <p className="text-lg text-default-600 max-w-3xl mx-auto">
            Buchungssystem für Sportstätten
          </p>
        </div>

        {/* Ziel Section */}
        <Card className="mb-8 border-none bg-default-50 dark:bg-default-100">
          <Card.Content className="p-8">
            <div className="flex items-start gap-4 mb-6">
              <div className="w-12 h-12 rounded-2xl bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0">
                <Target className="w-6 h-6" />
              </div>
              <div className="flex-1">
                <h2 className="text-2xl font-bold text-default-900 mb-2">🎯 Ziel</h2>
                <p className="text-default-700 leading-relaxed mb-4">
                  Erstellung eines Systems zur Buchung von Nutzungszeiten für ca. 40 Sportstätten
                  mit:
                </p>
                <ul className="space-y-3">
                  <li className="flex items-start gap-3">
                    <CheckCircle className="w-5 h-5 text-green-600 mt-0.5 shrink-0" />
                    <span className="text-default-700">
                      Möglichkeit der Eigenbuchung durch Teilnehmer
                    </span>
                  </li>
                  <li className="flex items-start gap-3">
                    <CheckCircle className="w-5 h-5 text-green-600 mt-0.5 shrink-0" />
                    <span className="text-default-700">
                      Verpflichtender Bestätigung durch die zuständigen Manager (Verwaltung)
                    </span>
                  </li>
                  <li className="flex items-start gap-3">
                    <CheckCircle className="w-5 h-5 text-green-600 mt-0.5 shrink-0" />
                    <span className="text-default-700">
                      Berichtswesen über die Objekte und deren Auslastung
                    </span>
                  </li>
                </ul>
              </div>
            </div>
          </Card.Content>
        </Card>

        {/* Rollen Section */}
        <div className="grid md:grid-cols-2 gap-6 mb-8">
          {/* Verwaltung */}
          <Card className="border-none bg-default-50 dark:bg-default-100">
            <Card.Content className="p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-xl bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400 flex items-center justify-center">
                  <Shield className="w-5 h-5" />
                </div>
                <h3 className="text-xl font-bold text-default-900">1. Verwaltung</h3>
              </div>
              <p className="text-sm text-default-600 mb-3">(Sportverwaltung)</p>
              <div className="space-y-2">
                {[
                  'Ansicht aller Buchungen',
                  'Bestätigung/Ablehnung von Teilnehmern Anfragen',
                  'Manuelle Erstellung von Buchungen',
                  'Bearbeitung von Buchungen',
                  'Löschung von Buchungen',
                  'Einsicht in Objektberichte',
                  'Verwaltung der Teilnehmer',
                  'Verwaltung der Objekte (Sportstätten)',
                ].map((item, i) => (
                  <div key={i} className="flex items-start gap-2">
                    <CheckCircle className="w-4 h-4 text-green-600 mt-0.5 shrink-0" />
                    <span className="text-sm text-default-700">{item}</span>
                  </div>
                ))}
              </div>
            </Card.Content>
          </Card>

          {/* Teilnehmer */}
          <Card className="border-none bg-default-50 dark:bg-default-100">
            <Card.Content className="p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-xl bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400 flex items-center justify-center">
                  <Users className="w-5 h-5" />
                </div>
                <h3 className="text-xl font-bold text-default-900">2. Teilnehmer</h3>
              </div>
              <p className="text-sm text-default-600 mb-3">Rechte:</p>
              <div className="space-y-2 mb-4">
                {['Erstellung von Buchungsanfragen', 'Ansicht nur der eigenen Buchungen'].map(
                  (item, i) => (
                    <div key={i} className="flex items-start gap-2">
                      <CheckCircle className="w-4 h-4 text-green-600 mt-0.5 shrink-0" />
                      <span className="text-sm text-default-700">{item}</span>
                    </div>
                  )
                )}
                {[
                  'Keine Bearbeitung nach erfolgter Bestätigung',
                  'Keine Einsicht in fremde Buchungen',
                  'Kein Zugriff auf Berichte',
                ].map((item, i) => (
                  <div key={i} className="flex items-start gap-2">
                    <XCircle className="w-4 h-4 text-red-600 mt-0.5 shrink-0" />
                    <span className="text-sm text-default-700">{item}</span>
                  </div>
                ))}
              </div>
            </Card.Content>
          </Card>
        </div>

        {/* Ziel/Leistung Section */}
        <Card className="mb-8 border-none bg-default-50 dark:bg-default-100">
          <Card.Content className="p-8">
            <div className="flex items-start gap-4 mb-6">
              <div className="w-12 h-12 rounded-2xl bg-orange-100 dark:bg-orange-900/30 text-orange-600 dark:text-orange-400 flex items-center justify-center shrink-0">
                <Building2 className="w-6 h-6" />
              </div>
              <div className="flex-1">
                <h2 className="text-2xl font-bold text-default-900 mb-4">
                  Ziel/Leistung (Services)
                </h2>
                <p className="text-default-600 mb-6">
                  Mehrstufiges Verzeichnis der Nutzungszwecke:
                </p>

                <div className="grid md:grid-cols-3 gap-6">
                  {/* Stadion */}
                  <div className="bg-default-100 dark:bg-default-200/30 rounded-xl p-4">
                    <div className="font-bold text-default-900 dark:text-default-50 mb-3 flex items-center gap-2">
                      <span className="text-xl">📁</span>
                      <span>Stadion</span>
                    </div>
                    <div className="space-y-2 pl-4">
                      <div className="text-sm text-default-700 dark:text-default-300">⚽ Fußball</div>
                      <div className="text-sm text-default-700 dark:text-default-300">🏑 Hockey auf Rasen</div>
                      <div className="text-sm text-default-700 dark:text-default-300">🏃 Leichtathletik</div>
                    </div>
                  </div>

                  {/* Schwimmbad */}
                  <div className="bg-default-100 dark:bg-default-200/30 rounded-xl p-4">
                    <div className="font-bold text-default-900 dark:text-default-50 mb-3 flex items-center gap-2">
                      <span className="text-xl">📁</span>
                      <span>Schwimmbad</span>
                    </div>
                    <div className="space-y-2 pl-4">
                      <div className="text-sm text-default-700 dark:text-default-300">🏊 Schwimmtraining</div>
                      <div className="text-sm text-default-700 dark:text-default-300">🤽 Wasserball</div>
                      <div className="text-sm text-default-700 dark:text-default-300">🏊 Aquafitness</div>
                    </div>
                  </div>

                  {/* Sporthalle */}
                  <div className="bg-default-100 dark:bg-default-200/30 rounded-xl p-4">
                    <div className="font-bold text-default-900 dark:text-default-50 mb-3 flex items-center gap-2">
                      <span className="text-xl">📁</span>
                      <span>Sporthalle</span>
                    </div>
                    <div className="space-y-2 pl-4">
                      <div className="text-sm text-default-700 dark:text-default-300">🏀 Basketball</div>
                      <div className="text-sm text-default-700 dark:text-default-300">🏐 Volleyball</div>
                      <div className="text-sm text-default-700 dark:text-default-300">🤸 Turnen</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </Card.Content>
        </Card>

        {/* Workflow Section */}
        <Card className="mb-8 border-none bg-default-50 dark:bg-default-100">
          <Card.Content className="p-8">
            <div className="flex items-start gap-4 mb-6">
              <div className="w-12 h-12 rounded-2xl bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shrink-0">
                <FileText className="w-6 h-6" />
              </div>
              <div className="flex-1">
                <h2 className="text-2xl font-bold text-default-900 mb-4">
                  🔄 Buchungs-Workflow
                </h2>
                <p className="text-sm text-default-600 mb-6 italic">
                  Hinweis: Der folgende Ablauf ist ein Vorschlag zur Abstimmung und kann bei
                  Bedarf angepasst werden.
                </p>

                {/* Szenario 1 */}
                <div className="mb-6">
                  <h3 className="font-bold text-default-900 mb-3">
                    Szenario 1: Teilnehmer erstellt eine Buchung
                  </h3>
                  <ol className="space-y-2 list-decimal list-inside text-sm text-default-700">
                    <li>Teilnehmer loggt sich ins System ein</li>
                    <li>Erstellt eine Buchung</li>
                    <li>Wählt das Objekt aus</li>
                    <li>Wählt Datum und Uhrzeit</li>
                    <li>Wählt Ziel/Leistung</li>
                    <li>Sendet die Anfrage ab</li>
                    <li>
                      Status: <code className="text-xs bg-default-100 dark:bg-default-300 dark:text-default-900 px-1 py-0.5 rounded">isConfirmed = false</code>
                    </li>
                    <li>Verwaltung erhält eine Benachrichtigung</li>
                    <li>Verwaltung prüft die Anfrage:
                      <ul className="pl-6 mt-1 space-y-1">
                        <li>Bei Bestätigung: <code className="text-xs bg-default-100 dark:bg-default-300 dark:text-default-900 px-1 py-0.5 rounded">isConfirmed = true</code></li>
                        <li>Bei Ablehnung: Buchung wird gelöscht/abgelehnt</li>
                      </ul>
                    </li>
                    <li>Teilnehmer erhält eine entsprechende Benachrichtigung</li>
                  </ol>
                </div>

                {/* Szenario 2 */}
                <div>
                  <h3 className="font-bold text-default-900 mb-3">
                    Szenario 2: Verwaltung erstellt eine Buchung
                  </h3>
                  <ol className="space-y-2 list-decimal list-inside text-sm text-default-700">
                    <li>Verwaltung loggt sich ins System ein</li>
                    <li>Erstellt eine Buchung</li>
                    <li>Wählt Objekt, Datum/Uhrzeit, Teilnehmer und Ziel/Leistung aus</li>
                    <li>Speichert die Buchung</li>
                    <li>
                      Status: <code className="text-xs bg-default-100 dark:bg-default-300 dark:text-default-900 px-1 py-0.5 rounded">isConfirmed = true</code> (automatisch)
                    </li>
                    <li>Teilnehmer erhält eine Benachrichtigung</li>
                  </ol>
                </div>
              </div>
            </div>
          </Card.Content>
        </Card>

        {/* Footer */}
        <div className="text-center text-default-600 text-sm">
          <p>
            Selbstverständlich können notwendige Änderungen jederzeit kurzfristig eingearbeitet
            werden.
          </p>
          <p className="mt-2">Für alle weiteren Fragen stehe ich dir gerne zur Verfügung.</p>
        </div>
      </div>
    </div>
  )
}

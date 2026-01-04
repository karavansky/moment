//
//  Calendar.swift
//  Standortbezogene Dienste
//
//  Created by Serhii Karavanskyi on 26.11.24.
//
import Foundation

var calendar : Calendar {
  var calendar = Calendar(identifier: .gregorian)
  calendar.timeZone = .current
  calendar.locale = Locale.preferredLocale()
  return calendar
}

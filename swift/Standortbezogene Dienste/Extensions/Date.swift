//
//  Date.swift
//  Standortbezogene Dienste
//
//  Created by Serhii Karavanskyi on 16.11.24.
//
import Foundation

extension Date {

    var onlyDate: Date? {
        get {
          let calender = Calendar.current
          var dateComponents = calender.dateComponents([.year, .month, .day], from: self)
//          dateComponents.timeZone = TimeZone.current
          return calender.date(from: dateComponents)
        }
    }
    var stringNormalized: String {
      get {
        let formatter = DateFormatter()
        formatter.locale = Locale.preferredLocale()
        formatter.dateFormat = "EEEE - d MMMM yyyy"
        return formatter.string(from: self)

      }
  }
}

///  let date = Date()
///
///  MARK: Way 1
///
///  let components = date.get(.day, .month, .year)
///  if let day = components.day, let month = components.month, let year = components.year {
///    print("day: \(day), month: \(month), year: \(year)")
///  }
///
///  MARK: Way 2
///
///  print("day: \(date.get(.day)), month: \(date.get(.month)), year: \(date.get(.year))")

extension Date {
    func get(_ components: Calendar.Component..., calendar: Calendar = Calendar.current) -> DateComponents {
        return calendar.dateComponents(Set(components), from: self)
    }

    func get(_ component: Calendar.Component, calendar: Calendar = Calendar.current) -> Int {
        return calendar.component(component, from: self)
    }
}

//
//  MockData.swift
//  Standortbezogene Dienste
//
//  Created by Serhii Karavanskyi on 16.11.24.
//

import Foundation
import SwiftUI



final class MockDataProvider {
  static var shared: MockDataProvider = .init()
  var dateArray: [DateApoitmentView] = []
  init(){
    var resultArray: [DateApoitmentView] = []
    var calendar = Calendar.autoupdatingCurrent
    calendar.locale = Locale.preferredLocale() //(identifier: "ru_RU") // Locale.current
    print("Locale.autoupdatingCurrent.identifier class:", Locale.preferredLocale().identifier)
    let startDate = calendar.date(byAdding: .weekOfYear, value: -1, to: Date())!
    let endDate = calendar.date(byAdding: .month, value: 3, to: Date())!
    let numberOfDays = calendar.dateComponents([.day], from: startDate, to: endDate)
    for i in 0..<numberOfDays.day! {
      let dateIncreasing = calendar.date(byAdding: .day, value: i, to: startDate)!
      let day = calendar.component(.day, from: dateIncreasing)
      let index = calendar.component(.weekday, from: dateIncreasing)
      let characterDay = calendar.veryShortWeekdaySymbols[index - 1] // weekdaySymbols[index - 1].first!
      let dateApoitmentView = DateApoitmentView(id: UUID(), date: dateIncreasing.onlyDate!, dayOfWeek: String(characterDay), day: day.description)
      resultArray.append(dateApoitmentView)
    }
    dateArray = resultArray
  }
//  {
//    var resultArray: [DateApoitmentView] = []
//    var calendar = Calendar.autoupdatingCurrent
//    calendar.locale = Locale.preferredLocale() //(identifier: "ru_RU") // Locale.current
//    print("Locale.autoupdatingCurrent.identifier class:", Locale.preferredLocale().identifier)
//    let startDate = calendar.date(byAdding: .weekOfYear, value: -1, to: Date())!
//    let endDate = calendar.date(byAdding: .month, value: 3, to: Date())!
//    let numberOfDays = calendar.dateComponents([.day], from: startDate, to: endDate)
//    for i in 0..<numberOfDays.day! {
//      let dateIncreasing = calendar.date(byAdding: .day, value: i, to: startDate)!
//      let day = calendar.component(.day, from: dateIncreasing)
//      let index = calendar.component(.weekday, from: dateIncreasing)
//      let characterDay = calendar.veryShortWeekdaySymbols[index - 1] // weekdaySymbols[index - 1].first!
//      let dateApoitmentView = DateApoitmentView(id: UUID(), date: dateIncreasing.onlyDate!, dayOfWeek: String(characterDay), day: day.description)
//      resultArray.append(dateApoitmentView)
//    }
//    return resultArray
//  }
}

struct MockData {
  struct DateApoitmentView: Codable, Transferable, Hashable, Identifiable {
    let id: UUID
    let date: Date
    let dayOfWeek: String
    let day: String
    
    func hash(into hasher: inout Hasher) {
        hasher.combine(id)
    }
    static func == (lhs: DateApoitmentView, rhs: DateApoitmentView) -> Bool {
        return lhs.id == rhs.id
    }
    static var transferRepresentation: some TransferRepresentation {
      CodableRepresentation(contentType: .dateApoitmentView)
    }
  }
  
  static var dateArray: [DateApoitmentView] {
    var resultArray: [DateApoitmentView] = []
    var calendar = Calendar.autoupdatingCurrent
    calendar.timeZone = .current
    calendar.locale = Locale.preferredLocale() //(identifier: "ru_RU") // Locale.current
    print("Locale.autoupdatingCurrent.identifier:", Locale.preferredLocale().identifier)
    let startDate = calendar.date(byAdding: .weekOfYear, value: -1, to: Date())!
    let endDate = calendar.date(byAdding: .month, value: 3, to: Date())!
    let numberOfDays = calendar.dateComponents([.day], from: startDate, to: endDate)
    for i in 0..<numberOfDays.day! {
      let dateIncreasing = calendar.date(byAdding: .day, value: i, to: startDate)!
      let day = calendar.component(.day, from: dateIncreasing)
      let index = calendar.component(.weekday, from: dateIncreasing)
      let characterDay = calendar.veryShortWeekdaySymbols[index - 1] // weekdaySymbols[index - 1].first!
      let dateApoitmentView = DateApoitmentView(id: UUID(), date: dateIncreasing.onlyDate!, dayOfWeek: String(characterDay), day: day.description)
      resultArray.append(dateApoitmentView)
    }
    return resultArray
  }

}

extension Locale {
    static func preferredLocale() -> Locale {
        guard let preferredIdentifier = Locale.preferredLanguages.first else {
            return Locale.current
        }
        return Locale(identifier: preferredIdentifier)
    }
}

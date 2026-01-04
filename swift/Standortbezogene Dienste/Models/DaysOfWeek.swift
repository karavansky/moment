//
//  DaysOfWeek.swift
//  Standortbezogene Dienste
//
//  Created by Serhii Karavanskyi on 28.11.24.
//

import Foundation
import SwiftUI

public enum DaysOfWeekEnum: String, Codable {
  case monday = "Montag"
  case tuesday = "Dienstag"
  case wednesday = "Mittwoch"
  case thursday = "Donnerstag"
  case friday = "Freitag"
  case saturday = "Samstag"
  case sunday = "Sonntag"
}

struct WeekDays: Equatable, Codable, Identifiable {
  let id: Int
  let name: String //" DaysOfWeekEnum
  var isSelected: Bool
  init(id: Int, name: String, isSelected: Bool) {
    self.id = id
    self.name = name
    self.isSelected = isSelected
  }
}

class DaysOf: ObservableObject {
  @Published var days: [WeekDays] = [ WeekDays(id: 0, name: DaysOfWeekEnum.monday.rawValue, isSelected: false),
                          WeekDays(id: 1, name: DaysOfWeekEnum.tuesday.rawValue, isSelected: false),
                          WeekDays(id: 2, name: DaysOfWeekEnum.wednesday.rawValue, isSelected: false),
                          WeekDays(id: 3, name: DaysOfWeekEnum.thursday.rawValue, isSelected: false),
                          WeekDays(id: 4, name: DaysOfWeekEnum.friday.rawValue, isSelected: false),
                          WeekDays(id: 5, name: DaysOfWeekEnum.saturday.rawValue, isSelected: false),
                          WeekDays(id: 6, name: DaysOfWeekEnum.sunday.rawValue, isSelected: false) ]
  func titleRepeat() -> String {
    if days.contains(where: {$0.isSelected}) {
      // "Wird jede Woche am Dienstag wiedeholt"
      var result = "Wird jede Woche"
      var filterArray = days.filter({$0.isSelected})
      if filterArray.count == 1 {
        if let indexWeekday = days.firstIndex(where: {$0.isSelected == true}) {
//           let value == DaysOfWeek.shared.list[indexWeekday] {
        print("value:", indexWeekday)
          print("",DaysOfWeek.shared.list[indexWeekday].rawValue)
//        }
          result += " am \(DaysOfWeek.shared.list[indexWeekday].rawValue) wiedeholt"
        }
      } else {
        var foo: [String] = []
        for indexWeekday in 0..<(days.count) {
          if days[indexWeekday].isSelected {
//            result += "am Dienstag wiedeholt "
              foo.append(DaysOfWeek.shared.list[indexWeekday].rawValue)
          }
        }
        if foo.count > 2 {
          for i in 0..<(foo.count - 1) {
            result += " am \(foo[i]),"
          }
          if let last = foo.last {
            let foo = result.prefix(result.count - 1)
            result = String(foo)
            result += " und am \(last)"
          }
        } else {
          if let last = foo.first {
            result += " am \(last)"
          }
          if let last = foo.last {
            result += " und am \(last)"
          }
        }
        result += " wiedeholt"
      }
      return result
    } else {
//      isRepeating = false
      return "Nischt wiederhollen"
    }
  }

}

public class DaysOfWeek: ObservableObject, Codable {
  



//  let dayOfWeek: [Int:String] = [0 : "Monday", 1:"Tuesday", 2:"Wednesday", 3:"Thursday", 4:"Friday", 5:"Saturday", 6:"Sunday"]

   var days: [WeekDays] = [ WeekDays(id: 0, name: DaysOfWeekEnum.monday.rawValue, isSelected: false),
                           WeekDays(id: 1, name: DaysOfWeekEnum.tuesday.rawValue, isSelected: false),
                           WeekDays(id: 2, name: DaysOfWeekEnum.wednesday.rawValue, isSelected: false),
                           WeekDays(id: 3, name: DaysOfWeekEnum.thursday.rawValue, isSelected: false),
                           WeekDays(id: 4, name: DaysOfWeekEnum.friday.rawValue, isSelected: false),
                           WeekDays(id: 5, name: DaysOfWeekEnum.saturday.rawValue, isSelected: false),
                           WeekDays(id: 6, name: DaysOfWeekEnum.sunday.rawValue, isSelected: false) ]
  
  public static let shared: DaysOfWeek = .init()
  
  let monday: DaysOfWeekEnum?
  let tuesday: DaysOfWeekEnum?
  let wednesday: DaysOfWeekEnum?
  let thursday: DaysOfWeekEnum?
  let friday: DaysOfWeekEnum?
  let saturday: DaysOfWeekEnum?
  let sunday: DaysOfWeekEnum?
  
  var list: [DaysOfWeekEnum] {
    [monday, tuesday, wednesday, thursday, friday, saturday, sunday].compactMap(\.self)
  }
  
  init()
  {
    self.monday = DaysOfWeekEnum.monday
    self.tuesday = DaysOfWeekEnum.tuesday
    self.wednesday = DaysOfWeekEnum.wednesday
    self.thursday = DaysOfWeekEnum.thursday
    self.friday = DaysOfWeekEnum.friday
    self.saturday = DaysOfWeekEnum.saturday
    self.sunday = DaysOfWeekEnum.sunday
  }
}

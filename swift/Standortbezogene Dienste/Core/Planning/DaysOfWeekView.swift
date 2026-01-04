//
//  DaysOfWeekView.swift
//  Standortbezogene Dienste
//
//  Created by Serhii Karavanskyi on 21.11.24.
//

import SwiftUI


struct DaysOfWeekView: View {
  
//  struct WeekDays: Identifiable {
//    let id: Int
//    let name: String
//    var isSelected: Bool
//  }
  let dayOfWeek: [Int:String] = [0 : "Monday", 1:"Tuesday", 2:"Wednesday", 3:"Thursday", 4:"Friday", 5:"Saturday", 6:"Sunday"]
  @ObservedObject var days: DaysOf

//  @Binding var days: [WeekDays]
//  = [ WeekDays(id: 1, name: "Montag", isSelected: false),
//                           WeekDays(id: 2, name: "Dienstag", isSelected: false),
//                           WeekDays(id: 3, name: "Mittwoch", isSelected: false),
//                           WeekDays(id: 4, name: "Donnerstag", isSelected: false),
//                           WeekDays(id: 5, name: "Freitag", isSelected: false),
//                           WeekDays(id: 6, name: "Samstag", isSelected: false),
//                           WeekDays(id: 7, name: "Sonntag", isSelected: false) ]
  
  var body: some View {
    List {
      ForEach(Array(days.days.enumerated()), id: \.offset) { index, day in
        HStack{
          Text(day.name)
          Spacer()
          if day.isSelected {
            Image(systemName: "checkmark")
          }
        }
        .contentShape(Rectangle())
        .onTapGesture {
//          print("eeee")
          let currentIndex = index
          var isAnybodyElse = false
          for i in 0..<days.days.count {
            if days.days[i].isSelected && i != currentIndex {
              isAnybodyElse = true
            }
          }
          if isAnybodyElse {
            days.days[index].isSelected.toggle()
          }
        }
      }
    }
//    List {
//      ForEach(Array(days.enumerated()), id: \.offset) { index, day in
//        HStack{
//          Text(day.name)
//          Spacer()
//          if day.isSelected {
//            Image(systemName: "checkmark")
//          }
//        }
//        .contentShape(Rectangle())   
//        .onTapGesture {
//          print("eeee")
//          days[index].isSelected.toggle()
//        }
//      }
//    }
  }
}

#Preview {
//  @Previewable @StateObject
  var days: [WeekDays] = [ WeekDays(id: 0, name: DaysOfWeekEnum.monday.rawValue, isSelected: false),
                           WeekDays(id: 1, name: DaysOfWeekEnum.tuesday.rawValue, isSelected: false),
                           WeekDays(id: 2, name: DaysOfWeekEnum.wednesday.rawValue, isSelected: false),
                           WeekDays(id: 3, name: DaysOfWeekEnum.thursday.rawValue, isSelected: false),
                           WeekDays(id: 4, name: DaysOfWeekEnum.friday.rawValue, isSelected: false),
                           WeekDays(id: 5, name: DaysOfWeekEnum.saturday.rawValue, isSelected: false),
                           WeekDays(id: 6, name: DaysOfWeekEnum.sunday.rawValue, isSelected: false) ]
//  @Previewable @StateObject var foo = DaysOfWeek.shared.days
//
//  let foo = DaysOfWeek.shared.days
//  DaysOfWeekView(days: DaysOf.self)
//  DaysOfWeekView(days: Binding(projectedValue: .constant(days)))
}

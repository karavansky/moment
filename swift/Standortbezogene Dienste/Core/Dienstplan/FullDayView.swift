//
//  FullDayView.swift
//  Standortbezogene Dienste
//
//  Created by Serhii Karavanskyi on 07.12.24.
//

import SwiftUI

public struct FullDayView: View {
  
  @EnvironmentObject var mock: MockContainer
  
//  @State var currentDate: Date
  
  private let daysOfWeek = DaysOfWeek()
  @State var listDaysToScroll: [MockDataPlan] = []
  @State private var positionHeader: MockDataPlan.ID?
  @State private var positionBody: MockDataPlan.ID?
  @State var selectedDay: Date
  @State var selectedDayIndex: Int?
  @State var selectedWeekIndex: Int?
  @State var title: String = ""

  @Environment(\.dismiss) var dismiss
  @Environment(\.verticalSizeClass) private var verticalSizeClass
  @State var refresh: Bool = false
  @Namespace var namespace
  @State var isAddAppointment: Bool = false
  
//  @State var selectedDayIndexToScroll: Int?
  public var body: some View {
    VStack(alignment: .center, spacing: 0)  {
      HStack(spacing: 0) {
        Button {
          dismiss()
        } label: {
          Image(systemName: "xmark.circle.fill")
            .font(.system(size: 30))
            .foregroundStyle(Color(UIColor.label))
            .opacity(0.7)
            .padding(.leading, 20)
        }
        Spacer()
        Button {
          isAddAppointment = true
        } label: {
          Image(systemName: "plus.circle.fill")
            .font(.system(size: 30))
            .foregroundStyle(Color(UIColor.label))
            .opacity(0.7)
            .padding(.trailing, 20)
        }
      }
      .frame(minHeight: 50, maxHeight: 50)
      Divider()
      VStack {
        GeometryReader { geometry3 in
          HStack(alignment: .center, spacing: 0) {
            ForEach(Array(daysOfWeek.list.enumerated()), id: \.offset) { index, day in
              let text = (geometry3.size.width < 500) ? String(day.rawValue.prefix(2)) : day.rawValue
              Text(text)
                .font(.caption)
                .frame(width: geometry3.size.width/7)
                .onTapGesture {
//                  print("onTapGesture daysOfWeek.list")
                  selectedDayIndex = index
                }
            }
          }
        }
      }
      .frame( minHeight: 18,  maxHeight: 18)
      .padding(.horizontal)
      
      VStack{
        GeometryReader { geometry in
          ScrollView(.horizontal) {
            LazyHGrid(rows: [GridItem(.flexible())], spacing: 0) {
              ForEach(listDaysToScroll) { week in
                VStack(alignment: .center, spacing: 0) {
                  HeaderView(weekArray: week.weekArray, selectedDay: $selectedDay)
//                    .frame(maxWidth: .infinity)
                  //                                        .frame(width: geometry.size.width)
                  //                  .frame(width: geometry2.frame(in: .global).width)
//                  Text(week.monat + " \(geometry.size.width)")
                  //                  .frame(maxWidth: .infinity)
                  //                    .frame(minWidth: geometry.size.width)
                  
                }
                .frame(width: geometry.size.width)
                //                                .frame(maxWidth: .infinity)
              }
            }
                      .scrollTargetLayout()
          }
          .scrollPosition(id: $positionHeader, anchor: .center)
          //        .scrollTargetBehavior(.viewAligned)
          .scrollTargetBehavior(.paging)
          //          .safeAreaPadding(.all)
          //                      .safeAreaPadding(.horizontal, 40)
          .scrollIndicators(.hidden)
          .onChange(of: selectedDayIndex, { oldValue, newValue  in
            if let weekIndex = selectedWeekIndex,
               let unNewValue = newValue,
               let foo = listDaysToScroll[weekIndex].weekArray[unNewValue].day,
                let date = listDaysToScroll[weekIndex].weekArray[unNewValue].date {
//              print("onChange(of: selectedDayIndex, Ok?", date)
              self.selectedDay = date

            }
          })
          .onChange(of: positionHeader, {oldValue, newValue in
//            print(".onChange(of: positionHeader:",newValue?.uuidString)
            if let id = newValue {
              if let indexWeek = listDaysToScroll.firstIndex(where: {$0.id == id}) {
                selectedWeekIndex = indexWeek
                if let index = selectedDayIndex, listDaysToScroll[indexWeek].weekArray.indices.contains(index) {
                  if listDaysToScroll[indexWeek].weekArray[index].day != nil,
                     let date = listDaysToScroll[indexWeek].weekArray[index].date?.onlyDate{
                    selectedDay = date
                  } else { // new day looking !
                    if let date = listDaysToScroll[indexWeek].weekArray.first?.date?.onlyDate {
                      selectedDay = date
                    }
                  }
                }
//                positionBody = mockDay.id
//                if let date = mockDay.date?.onlyDate {
//                  title = date.stringNormalized
//                  self.selectedDay = date
//                }
              }

            }
          })
          .onAppear {
//            print("listDaysToScroll: wird suchen ", listDaysToScroll.count)
            if let weekIndex = listDaysToScroll.firstIndex(where: {
              $0.weekArray.contains(where: {$0.date?.onlyDate == selectedDay.onlyDate}) }) {
              self.positionHeader = listDaysToScroll[weekIndex].id
              selectedWeekIndex = weekIndex
              if let dayIndex = listDaysToScroll[weekIndex].weekArray.firstIndex(where: {$0.date?.onlyDate == selectedDay.onlyDate}) {
                selectedDayIndex = dayIndex
              }
            }
            if let mockDay = mock.mockDayArray.first(where: {$0.date?.onlyDate == selectedDay.onlyDate}) {
              positionBody = mockDay.id
              if let date = mockDay.date?.onlyDate {
                title = date.stringNormalized
                self.selectedDay = date
              }
            }
          }
        }
      }
      .frame(height: 50 )
      .padding(.horizontal)
      if let indexWeek = selectedWeekIndex, let indexDay = selectedDayIndex {
        VStack {
          Text(title) // " - \(indexDay) : \(indexWeek)"
          GeometryReader { geometry in
            ScrollView(.horizontal) {
              LazyHGrid(rows: [GridItem(.flexible())], spacing: 0) {
                ForEach(mock.mockDayArray) { day in
                  VStack {
                    BodyView(appointments: day.envents)
                  }
                    .frame(width: geometry.size.width)

                }
              }
              .scrollTargetLayout()
            }
            .onChange(of: verticalSizeClass, { oldValue, newValue in
                // Update your variables/state here
              let foo = positionBody
              positionBody = UUID()
              Task {
                positionBody = foo
              }
            })
            .scrollPosition(id: $positionBody, anchor: .center)
            .scrollTargetBehavior(.paging)
            .scrollIndicators(.hidden)
            .onChange(of: selectedDay, { oldValue, newValue in
//              print("onChange(of: selectedDay")
              if let newDay = mock.mockDayArray.first(where: {$0.date?.onlyDate == newValue.onlyDate}) {
                if let date = newDay.date?.onlyDate {
                  title = date.stringNormalized
                }
                positionBody = newDay.id
//                print("onChange(of: selectedDay, positionBody:",positionBody?.uuidString)

              }
            })
            .onChange(of: positionBody, {oldValue, newValue in
//              print(".onChange(of: positionBody: oldValue ",oldValue?.uuidString)
//              print(".onChange(of: positionBody: newValue ",newValue?.uuidString)
              if let id = newValue, let dayIndex = mock.mockDayArray.firstIndex(where: {
                $0.id == id }) {
//                print("Ok!", mock.mockDayArray[dayIndex].date?.onlyDate)
                if let date = mock.mockDayArray[dayIndex].date?.onlyDate, let weekIndex = listDaysToScroll.firstIndex(where: {
                  $0.weekArray.contains(where: {$0.date?.onlyDate == date}) }) {
//                  print("Super!")
                  self.positionHeader = listDaysToScroll[weekIndex].id
                  if let dayIndex = listDaysToScroll[weekIndex].weekArray.firstIndex(where: { $0.date?.onlyDate == date.onlyDate}) {
                    selectedDayIndex = dayIndex
                  }
                }
                if let date = mock.mockDayArray[dayIndex].date?.onlyDate {
                  if date.onlyDate != selectedDay.onlyDate {
                    title = date.stringNormalized
                    self.selectedDay = date
                  }
//                  else {
//                    print("self.selectedDay = date")
//                  }
                }
              }
            })
            
          }
        }
        .padding(.horizontal)
      }
    }
    .onAppear {
      makeListDaysToScroll()
    }
   // .fullScreenCover(item: $isAddAppointment)
  }
  
  func makeListDaysToScroll() {
    listDaysToScroll.removeAll()
    let bar = mock.mockDayArray.count
    if let fisrtDay = mock.mockDayArray.first?.date {
      let dateFormatter = DateFormatter()
      dateFormatter.dateFormat = "LLLL"
      
      let index = calendar.component(.weekday, from: fisrtDay)
      var indexUm: Int = 0
      if index == 1 {
        indexUm = 7
      } else {
        indexUm = index - 1
      }
      var addEmpyDay: [MockDay] = []
      for _ in 1..<indexUm {
        addEmpyDay.append(MockDay(day: nil, envents: [], date: fisrtDay))
      }
      var nameOfMonth = dateFormatter.string(from: fisrtDay)
      var isNewWeek: Bool = false
      var counterDaysInWeek: Int = indexUm
      let countDays = mock.mockDayArray.count
      for i in 0..<countDays {
        if let dayDate = mock.mockDayArray[i].date {
          nameOfMonth = dateFormatter.string(from: dayDate)
          let dayString = String(dayDate.get(.day))
          
          if counterDaysInWeek < 7 {
            
            addEmpyDay.append(MockDay(day: dayString, envents: mock.mockDayArray[i].envents, date: dayDate))
            counterDaysInWeek += 1
          } else {
            addEmpyDay.append(MockDay(day: dayString, envents:  mock.mockDayArray[i].envents, date: dayDate))
            let newWeekEmpty = MockDataPlan(monat: nameOfMonth, weekArray: addEmpyDay, monatScroll: nameOfMonth)
            listDaysToScroll.append(newWeekEmpty)
//            print("Control addEmpyDay.count \(addEmpyDay.count)")
            
            addEmpyDay.removeAll()
            counterDaysInWeek = 1
            isNewWeek = true
          }
        } else {
          fatalError("No date")
        }
      }
      if !addEmpyDay.isEmpty {
        let howManyEmptyDays = 7 - addEmpyDay.count
        for _ in 0..<howManyEmptyDays {
          addEmpyDay.append(MockDay(day: nil, envents: [], date: fisrtDay))
        }
        let newWeekEmpty = MockDataPlan(monat: nameOfMonth, weekArray: addEmpyDay, monatScroll: nameOfMonth)
        listDaysToScroll.append(newWeekEmpty)
      }
    } else {
      fatalError("No mock days")
    }
  }
  
}

#Preview {
  @Previewable @StateObject var mock: MockContainer = MockContainer()
  
  FullDayView(selectedDay: Date())
    .environmentObject(mock)
}

//
//  WeekView.swift
//  Standortbezogene Dienste
//
//  Created by Serhii Karavanskyi on 25.11.24.
//

import SwiftUI



struct WeekView: View {
  
  let mock: MockDataPlan
  @Namespace var namespace
  @EnvironmentObject var mockObj: MockContainer
  
  var body: some View {
      
      GeometryReader { geometry in
        VStack(alignment: .leading, spacing: 0) {
          HStack{
            if !mock.monat.isEmpty {
              Text(mock.monat)
                .frame(maxWidth: .infinity, minHeight: 18,  maxHeight: 18)
              //              .background(Color.blue.opacity(0.5))
            } else {
              //            Text(String(index))
              EmptyView()
                .frame(maxWidth: .infinity, minHeight: 18,  maxHeight: 18)
              //              .background(Color.teal.opacity(0.5))
            }
          }
          Divider()
          
          HStack(alignment: .center, spacing: 2) {
            ForEach(mock.weekArray) { day in
              
              NavigationLink(destination: {
                FullDayView(selectedDay: day.date ?? Date())
                  .navigationTransition(.zoom(sourceID: day.id, in: namespace))
                  .toolbarVisibility(.hidden, for: .navigationBar)
                  .environmentObject(mockObj)

              }, label: {
                DayView(date: day.date, day: day.day, events: day.envents)
                  .frame(width: geometry.size.width/7 - 1)
                  .matchedTransitionSource(id: day.id, in: namespace)
                
              })
              .id(day.id)
              .disabled(day.day == nil)
              //            NavigationLink(value: day) {
              //              DayView(date: day.date, day: day.day, events: day.envents)
              //                .frame(width: geometry.size.width/7 - 1)
              //            }
              //            .id(day.id)
              
            }
          }
        }
      }
  }
}

#Preview {
//  @Previewable @StateObject var mockObj: MockContainer = MockContainer()
//
//  let event1 = Event(id: UUID(), client: "Pupkin", worker: "Vasia")
//  let event2 = Event(id: UUID(), client: "Pupkin", worker: "Vasia")
//  let event3 = Event(id: UUID(), client: "Pupkin", worker: "Vasia")
//  let event4 = Event(id: UUID(), client: "Pupkin", worker: "Vasia")
//  let event5 = Event(id: UUID(), client: "Pupkin", worker: "Vasia")
//  let weekArray = [MockDay(day: nil, envents: []),
//               MockDay(day: nil, envents: []),
//                   MockDay(day: "1", envents: [event1], date: Date()),
//               MockDay(day: "2", envents: [event2,event3,event4,event5,event1, event2,event3,event4,event5,event1,
//                                                          event2,event3], date: Date()),
//               MockDay(day: "3", envents: [], date: Date()),
//               MockDay(day: "4", envents: [event1],  date: Date()),
//               MockDay(day: "5", envents: [event2,event3], date: Date())]
//  let mock = MockDataPlan(monat: "November", weekArray: weekArray, monatScroll: "November")
//  NavigationStack {
//    WeekView(mock: mock)
//      .environmentObject(mockObj)
//  }
}

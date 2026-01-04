//
//  DayView.swift
//  Standortbezogene Dienste
//
//  Created by Serhii Karavanskyi on 25.11.24.
//

import SwiftUI
import SwiftData

struct DayView: View {
  @State var date: Date?
  @State var day: String?
  @State var events: [Appointment]
  var body: some View {
    VStack(spacing: 3) {
      if let day {
        if let date,
           date.onlyDate == Date().onlyDate {
          Text(day)
            .font(.subheadline)
            .frame(maxHeight: 22)
            .foregroundStyle(.white)
            .background {
              RoundedRectangle(cornerRadius: 5)
                .fill(Color.red)
                .frame(width: 25, height: 22)
            }
            .padding(.top, 2)
        } else {
          Text(day)
            .font(.subheadline)
            .frame(maxHeight: 22)
            .padding(.top, 2)
        }
      }
      else {
        EmptyView()
      }
    
      VStack(spacing: 5) {
        ForEach(events, id:\.id) {  item in
          
          //        ForEach(Array(text.enumerated()), id: \.offset) { index, item in
          ZStack {
            Rectangle()
              .opacity(0.3)
              .clipShape(RoundedRectangle(cornerRadius: 5, style: .continuous))
              .foregroundColor(.teal)
            VStack(alignment: .center, spacing: 5) {
              Text(item.client.clientName)
                .font(.caption2)
                .foregroundColor(Color(UIColor.label))
              HStack(spacing: 2) {
                if let date = item.date.onlyDate,
                   let currentDate = Date().onlyDate,
                   date < currentDate { 
                  if item.isReport {
                    Image(systemName: "figure.walk")
                      .symbolRenderingMode(.hierarchical)
                      .foregroundStyle(.green)
                      .font(.system(size: 12))
                  } else {
                    Image(systemName: "figure.walk")
                      .symbolRenderingMode(.hierarchical)
                      .foregroundStyle(.red)
                      .font(.system(size: 12))
                  }
                } else {
                  Image(systemName: "figure.walk")
                    .symbolRenderingMode(.hierarchical)
                    .foregroundStyle(.blue)
                    .font(.system(size: 12))
                }
                Text(item.worker.workerName)
                  .font(.caption2)
                  .foregroundColor(Color(UIColor.label))
              }
            }
          }
          .frame(maxHeight: 40)
        }
      }
      Spacer()
    }
  }
}


#Preview {
  let container = try! ModelContainer.sample()
  DienstplanView(isClients: false)
    .modelContainer(container)
}


//#Preview {
////  let event1 = Event(text: "Event 1")
////  let event2 = Event(text: "Event 2")
////  let event3 = Event(text: "Event 3")
////  let event4 = Event(text: "Event 4")
////  let event5 = Event(text: "Event 5")
////  let weekArray = [MockDay(day: nil, envents: []),
////                   MockDay(day: nil, envents: []),
////                   MockDay(day: "1", envents: [event1], date: Date()),
////                   MockDay(day: "2", envents: [event2,event3,event4,event5,event1, event2,event3,event4,event5,event1,
////                                               event2,event3], date: Date()),
////                   MockDay(day: "3", envents: [], date: Date()),
////                   MockDay(day: "4", envents: [event1],  date: Date()),
////                   MockDay(day: "5", envents: [event2,event3], date: Date())]
////  let mock = MockDataPlan(monat: "November", weekArray: weekArray, monatScroll: "November")
////  WeekView(mock: mock)
//  
//}

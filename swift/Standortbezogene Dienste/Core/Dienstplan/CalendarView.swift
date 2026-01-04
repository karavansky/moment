//
//  CalendarView.swift
//  Standortbezogene Dienste
//
//  Created by Serhii Karavanskyi on 25.11.24.
//

import SwiftUI
import SwiftData



struct CalendarView: View {
  
  @Binding var mock: [MockDataPlan]

  private let daysOfWeek = DaysOfWeek()
  
  @State private var position: MockDataPlan.ID?
  @State private var monat: String = "Test"
  
  var body: some View {
    
    GeometryReader { geometry in
      NavigationStack {
        VStack(alignment: .leading) {
          VStack(alignment: .center, spacing: 0) {
            Text(monat)
              .font(.largeTitle)
              .onTapGesture {
                if let currentWeekID = mock.first(where: {
                  $0.weekArray.contains(where: {$0.date?.onlyDate == Date().onlyDate}) }) {
                  withAnimation(.spring(response: 0.3, dampingFraction: 0.3)) {
                    self.position = currentWeekID.id
                    monat = currentWeekID.monatScroll
                  }
                }
              }
            HStack(alignment: .center, spacing: 0) {
              ForEach(daysOfWeek.list, id: \.self) { day in
                let text = (geometry.size.width < 500) ? String(day.rawValue.prefix(2)) : day.rawValue
                Text(text)
                  .font(.caption)
                  .frame(width: geometry.size.width/7 - 1)
              }
            }
            .frame(maxWidth: .infinity, minHeight: 18,  maxHeight: 18)
          }
          //.padding(0)
          //          .padding()
          
          GeometryReader { geo in
            ScrollView{
              LazyVStack(spacing: 0) {
                ForEach(mock, id: \.id) { item in
                  WeekView(mock: item)
                    .frame(height: geometry.size.height/2 - 32 )
                }
              }
              .frame(
                alignment: .bottom)
              .scrollTargetLayout()
            }
            .scrollPosition(id: $position, anchor: .center)
            .onChange(of: $mock.wrappedValue) {
              //          print("currentWeekID: onChange wird suchen ", mock.count)
              if let currentWeekID = mock.first(where: {
                $0.weekArray.contains(where: {$0.date?.onlyDate == Date().onlyDate}) }) {
                self.position = currentWeekID.id
              }
            }
            .onChange(of: position, {oldValue, newValue in
              if let currenScrollValue = newValue,
                 let element =  mock.first(where: {$0.id == currenScrollValue}) {
                monat = element.monatScroll
              }
            })
            .onAppear {
              print("currentWeekID: wird suchen ", mock.count)
              if let currentWeekID = mock.first(where: {
                $0.weekArray.contains(where: {$0.date?.onlyDate == Date().onlyDate}) }) {
                self.position = currentWeekID.id
                monat = currentWeekID.monatScroll
              }
            }
          }
          //          .scrollTargetBehavior(.paging)
          
          //          .safeAreaPadding(.bottom, 320.0)
          //        .scrollPosition(initialAnchor: .init(x: 0, y: 0.9))
          
        }
      }
    }
  }
}


#Preview {
  let container = try! ModelContainer.sample()
  DienstplanView(isClients: false)
    .modelContainer(container)
}



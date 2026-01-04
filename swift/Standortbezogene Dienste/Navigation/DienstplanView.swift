//
//  DienstplanView.swift
//  Standortbezogene Dienste
//
//  Created by Serhii Karavanskyi on 24.11.24.
//

import SwiftUI
import SwiftData

@Observable
class DienstplanModel: ObservableObject {
  var query: String = ""
  var selectedWorker: Worker = Worker(id: UUID(), firmaID: UUID(), workerName: "WTF", appointments: [], team: Team(id: UUID(), firmaID: UUID(), worker: [], teamName: "WTF"))
  var client: Client?
  var date = Date()
  var appointment: Appointment?
  // ...
}

// Appointment
struct Event: Identifiable{
  
  let id: UUID
  let client: String
  let worker: String
  
  init(id: UUID, client: String, worker: String) {
    self.id = id
    self.client = client
    self.worker = worker
  }
}

struct DataProviderTests {
  let id = UUID()
  let day: String?
  let envents: [Event]
}

struct MockDay: Identifiable, Equatable,  Hashable {
  let id = UUID()
  let day: String?
  let envents: [Appointment]  // [Event]
  let date: Date?
  init(day: String?, envents: [Appointment], date: Date? = nil) {
    self.day = day
    self.envents = envents
    self.date = date
  }
  func hash(into hasher: inout Hasher) {
      hasher.combine(id)
  }
  static func == (lhs: MockDay, rhs: MockDay) -> Bool {
    if lhs.id != rhs.id { return false }
    return true
  }
}

class MockDataPlan: ObservableObject, Equatable, Identifiable {
  static func == (lhs: MockDataPlan, rhs: MockDataPlan) -> Bool {
    if lhs.id != rhs.id { return false }
    return true
  }
  
  @Published var id = UUID()
  @Published var monat: String
  @Published var monatScroll: String
  @Published var weekArray: [MockDay]
  
  init(monat: String, weekArray: [MockDay], monatScroll: String) {
    self.monat = monat
    self.weekArray = weekArray
    self.monatScroll = monatScroll
  }

}

class MockContainer: ObservableObject {
   
  @Published var mockDayArray: [MockDay] = []
  
//  init(isPreview: Bool = false){
//    if isPreview {
//      let startDate = calendar.date(byAdding: .weekOfYear, value: -1, to: Date())!
//      let endDate = calendar.date(byAdding: .month, value: 1, to: Date())!
//      let numberOfDays = calendar.dateComponents([.day], from: startDate, to: endDate).day!
//
//      for i in 0..<numberOfDays {
//        let dateIncreasing = calendar.date(byAdding: .day, value: i, to: startDate)!
//        let event1 = Event(id: UUID(), client: "Vasia", worker: "Pupkin")
//        let event2 = Event(id: UUID(), client: "Vasia", worker: "Pupkin")
//        let event3 = Event(id: UUID(), client: "Vasia", worker: "Pupkin")
//        let event4 = Event(id: UUID(), client: "Vasia", worker: "Pupkin")
//        let event5 = Event(id: UUID(), client: "Vasia", worker: "Pupkin")
//        let mocDay = MockDay(day: String(i + 1), envents: [event1, event2, event3, event4, event5], date: dateIncreasing)
//        mockDayArray.append(mocDay)
//      }
//    }
//  }
  
}

struct DienstplanView: View {
  
  @Query(sort: \Appointment.date)
  private var appointments: [Appointment]
  
//  let mock: SampleData = SampleData()
  @State var mockArray: [MockDataPlan] = []
  @StateObject var mock = MockContainer()

  @State var isClients: Bool
  
  var body: some View {
    CalendarView(mock: $mockArray)
      .onChange(of: appointments) { oldState, newState in
        print("DienstplanView.onChange appointments:", newState.count)
        makeData(appointments: appointments)
      }
      .onAppear {
        print("DienstplanView.onAppear appointments:", appointments.count)
        makeData(appointments: appointments)
      }
      .environmentObject(mock)
  }
  
  func makeData(appointments: [Appointment]) {
    mockArray.removeAll()
    mock.mockDayArray.removeAll()
    /// Define start date and end date from Appointment
    guard !appointments.isEmpty else {
      print("No Appointments")
      return
    }
    
    // Находим минимальную и максимальную даты из всех appointments
    let sortedDates = appointments.map { $0.date }.sorted()
    guard let startDateApp = sortedDates.first,
          let endDateApp = sortedDates.last else {
      print("Cannot determine date range")
      return
    }
    
    print("📅 Start Date: \(startDateApp.formatted(date: .long, time: .omitted))")
    print("📅 End Date: \(endDateApp.formatted(date: .long, time: .omitted))")
    
    if true {
      /// Define start Monat and end Monat from Appointment
      var components = DateComponents()
      components.timeZone = TimeZone(abbreviation: "GMT")
      
      let startMonth = startDateApp.get(.month)
      let startYear = startDateApp.get(.year)
      
      components.day = 1
      components.month = startMonth
      components.year = startYear
      let startDate = Calendar.current.date(from: components)!
      
      let endMonth = endDateApp.get(.month)
      let endYear = endDateApp.get(.year)
      var numberOfMonats = 0
//      print("startMonth:", startMonth, "endMonth:", endMonth)
      let deltaYear = endYear - startYear
//      print("DeltaYear: \(deltaYear)")
      if deltaYear > 0 {
          // Месяцы от startMonth до конца года + месяцы в промежуточных годах + месяцы от начала года до endMonth
          numberOfMonats = (12 - startMonth + 1) + endMonth + 12 * (deltaYear - 1)
      } else {
        // В пределах одного года
        numberOfMonats = endMonth - startMonth + 1
      }
//      print("numberOfMonats +1 : \(numberOfMonats) startDate: \(startDate), endDate: \(endDateApp))")
      var indexWeek = -1
      var isNewWeek = false
      var isFirstWeek = true

      for numerOfMonats in 0..<numberOfMonats {
        /// Creating array of Weeks
        /// Name Month
        ///
        isFirstWeek = true
        isNewWeek = true
        let dateFormatter = DateFormatter()
        dateFormatter.dateFormat = "LLLL"
        let nowMonat = calendar.date(byAdding: .month, value: numerOfMonats, to: startDate)!
        let nameOfMonth = dateFormatter.string(from: nowMonat)
//        print("nowMonat:",nowMonat,"nameOfMonth:", nameOfMonth)
        /// Cycle while came  end monat
        let countDayInMonat = calendar.range(of: .day, in: .month, for: nowMonat)!.count
        let countWeekInMonat = calendar.range(of: .weekOfMonth, in: .month, for: nowMonat)!.count
//        print("countDayInMonat:", countDayInMonat, "countWeekInMonat:", countWeekInMonat)
        for day in 0..<(countDayInMonat ) {
          components.day = (day + 1)
          components.month = nowMonat.get(.month)
          components.year = nowMonat.get(.year)
          let date = calendar.date(from: components)!
          let appointment = appointments.filter({ $0.date.onlyDate == date.onlyDate })
          let index = calendar.component(.weekday, from: date)
          let characterDay = calendar.veryShortWeekdaySymbols[index - 1] // weekdaySymbols[index - 1].first!
//          let minimumDaysInFirstWeek = calendar.minimumDaysInFirstWeek
//          let numerDayInWeek = calendar.component(.weekdayOrdinal, from: date)
          let dateFormatter = DateFormatter()
          dateFormatter.dateFormat = "EEEE"
          dateFormatter.locale = Locale.preferredLocale()
          let weekName = dateFormatter.weekdaySymbols[calendar.component(.weekday, from: date) - 1]   // ["So", "Mo", "Di", "Mi", "Do", "Fr", "Sa"]
//          let dayInWeek = calendar.weekdaySymbols[index]
          //= calendar.veryShortWeekdaySymbols[index - 1]
          let weekOfMonth = calendar.component(.weekOfMonth, from: date)
          var indexUm: Int = 0
          if index == 1 {
            indexUm = 7
          } else {
            indexUm = index - 1
          }
          if isFirstWeek {
            var addEmpyDay: [MockDay] = []
//            print("isFirstWeek:",isFirstWeek , "indexUm: ",indexUm, "day:", day ," nameOfMonth: ", nameOfMonth)
//            print("date:", date," appointment:", appointment.count,"weekName:", weekName,  "index:", index, "indexUm:", indexUm, "weekOfMonth:", weekOfMonth )

            for _ in 1..<indexUm {
              addEmpyDay.append(MockDay(day: nil, envents: [], date: date))
            }
            let newWeekEmpty = MockDataPlan(monat: nameOfMonth, weekArray: addEmpyDay, monatScroll: nameOfMonth)
            mockArray.append(newWeekEmpty)
            isFirstWeek = false
            indexWeek = indexWeek + 1

          } else if isNewWeek { //if indexUm == 7
            let newWeek = MockDataPlan(monat: "", weekArray: [], monatScroll: nameOfMonth)
            mockArray.append(newWeek)
          }
          var _evets: [Event] = []
          if !appointment.isEmpty {
            for _appointment in appointment {
              _evets.append(Event(id: _appointment.id, client: _appointment.client.clientName, worker: _appointment.worker.workerName))
            }
          }
//          print("date:", date," appointment:", appointment.count,"weekName:", weekName,  "index:", index, "indexUm:", indexUm, "weekOfMonth:", weekOfMonth )
//          print("mockArray.count:", mockArray.count, "day:", day)
          let mocDay = MockDay(day: String(day + 1), envents: appointment, date: date)
          mockArray[indexWeek].weekArray.append(mocDay)
          print("MocDay: \(mocDay.date!.description)")
          mock.mockDayArray.append(mocDay)
          print("mock.mockDayArray.count: \(mock.mockDayArray.count)")

          if indexUm == 7 {
            isNewWeek = true
//            print("isNewWeek:", isNewWeek)
            indexWeek = indexWeek + 1
          } else {
            isNewWeek = false
          }
        } /// for day in 0..<countDayInMonat
      } /// for numerOfMonats in 0..<numberOfMonats
    }
  }
  
}

#Preview {
  let modelContainer = try! ModelContainer.sample()
  DienstplanView(isClients: true)
    .modelContainer(modelContainer)
  
}

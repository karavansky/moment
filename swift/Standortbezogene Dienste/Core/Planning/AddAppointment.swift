//
//  AddAppointment2.swift
//  Standortbezogene Dienste
//
//  Created by Serhii Karavanskyi on 22.11.24.
//

import SwiftUI



struct AddAppointment: View {
  
  @Environment(\.modelContext) private var modelContext
  @Environment(\.dismiss) var dismiss
  
  @State var timeToWork: Int = 0
  @State var isFixedTime: Bool = false
  @State private var date = Date.now
  @State private var wakeUp = Date.now
  @State var listApoitmentView: [DateApoitmentView] = []
  @State var startDate: Date = Date.now
  @State var workerName: String = ""
  @State var title: String = ""
  @State var isRepeating: Bool = false
  @State var fahrZeit: Int = 0
  @State var endDate: Date = Date.now

  @State var repeatAppointment: [Bool] = [true, false, false, false, false, false, false]
  @State var repeatAppointment2 = DaysOfWeek.shared.days
  @StateObject var days = DaysOf()

  @ObservedObject var provider: DataProvider
  @Binding var isUpdateAppointments: Bool
  @State var isDays = false
  var calendar: Calendar {
    var calendar =  Calendar.autoupdatingCurrent
    calendar.timeZone = .current
    calendar.locale = Locale.preferredLocale()
    return calendar
  }
  @State var repeatingDate: [Date] = []
  var dayOfWeek: String {
    let formatter = DateFormatter()
    formatter.locale = Locale.preferredLocale()
    formatter.dateFormat = "EEEE"
    return formatter.string(from: startDate)
  }
  var body: some View {
    GeometryReader { geometry in
      
      NavigationStack {
        VStack{
          Form {
            Section {
              HStack {
                DatePicker("Datum", selection: $startDate, in: Date()... , displayedComponents: .date )
                  .environment(\.locale, Locale.init(identifier: String(Locale.preferredLanguages[0].prefix(2))))
                  .onChange(of: startDate) { oldValue, newValue in
                    update(start: newValue, end: endDate)
                  }
                Text(dayOfWeek)
              }
              MultiPicker(selection: $timeToWork).frame(height: 100)
              Toggle(isOn: $isFixedTime, label: {
                Text("feste Zeit")
              })
              if isFixedTime {
                DatePicker("Bitte geben Sie eine Uhrzeit ein", selection: $wakeUp, displayedComponents: .hourAndMinute)
              }
              Picker("Fahrzeit", selection: $fahrZeit) {
                Text("Ohne").tag(0)
                Text("5 Minuten").tag(5)
                Text("15 Minuten").tag(15)
                Text("30 Minuten").tag(30)
                Text("1 Stunde").tag(60)
                Text("1 Stunde, 30 Minuten").tag(90)
                Text("2 Stunden").tag(120)
              }
              Toggle(isOn: $isRepeating, label: {
                Text(titleRepeat())
              })
              if isRepeating {
                Button(action: { isDays = true }) {
                  NavigationLink(destination: DaysOfWeekView(days: days)) {
                    Text(days.titleRepeat())
                      .font(.footnote)
                  }
                  .id(UUID())
                }
                .foregroundStyle(Color(UIColor.label))
                if !repeatingDate.isEmpty {
                  List{
                    ForEach(Array(repeatingDate.enumerated()), id:\.offset) { index, date in
                      Text("\(index + 1). " + date.stringNormalized)
                        .environment(\.locale, Locale.init(identifier: String(Locale.preferredLanguages[0].prefix(2))))
                    }
                  }
                }
                DatePicker("Enddatum", selection: $endDate, in: calendar.date(byAdding: .day, value: 1, to: startDate)!..., displayedComponents: .date)
                  .onChange(of: endDate) { oldValue, newValue in
                    update(start: startDate, end: newValue)
                  }
                  .environment(\.locale, Locale.init(identifier: String(Locale.preferredLanguages[0].prefix(2))))
              }
            } // Section
            Section("Dienstplan für " + workerName ) {
              if !listApoitmentView.isEmpty {
                Text("November")
                  .font(.body)
                ScrollView(.horizontal){
                  LazyHGrid(rows: [GridItem()], spacing: 2) {
                    ForEach($listApoitmentView, id: \.id) { dateInfo in
                      DayViewWorker(dayAppoitments: dateInfo)
                        .frame(width:  geometry.size.width < 400 ? geometry.size.width/5 : 100  )
                    }
                  }
                  .scrollTargetLayout()
                }
                .frame(minHeight: 300)
              } else {
                Text("nichts geplant")
                  .font(.body)
              }
            }
          } // Form
          
        }
        .sheet(isPresented: $isDays) {
          DaysOfWeekView(days: days)
            .presentationDetents([.medium])
            .presentationDragIndicator(.hidden)
        }
        .onChange(of: days.days) {
          update(start: startDate, end: endDate)
        }
        .onAppear(){
          var components = DateComponents()
          components.timeZone = .current
          components.hour = 9
          components.minute = 0
          wakeUp = calendar.date(from: components)!
          if let client = provider.client {
            title = client.clientName
            startDate = provider.date
            endDate = calendar.date(byAdding: .day, value: 1, to: startDate)!
            if let worker = provider.worker {
              workerName = worker.workerName
            }
            var index = calendar.component(.weekday, from: startDate)
            if index == 1 {
              index = 7 - 1
            } else {
              index = index - 2
            }
            days.days[index].isSelected = true

            updateWorkerListAppointments()
          } else {
            print("Client WTF in AddAppointment")

            let firmaID = UUID()
            let category = Category(id: UUID(), firmaID: firmaID, clients: [], categoryName: "Preview")
            let client = Client(id: UUID(), firmaID: firmaID, clientName: "Zimmermann", strasse: "Karl-Friedrich-Schinkel-Str", plz: "53127", ort: "Bonn-Ippendorf", houseNumber: "157", latitude: 0, longitude: 0, appointments: [], category: category)
            let team = Team(id: UUID(), firmaID: firmaID, worker: [], teamName: "Team 1")
            var worker = Worker(id: UUID(), firmaID: UUID(), workerName: "Pupkin", appointments: [],team: team)

          //  let worker = Worker(id: UUID(), firmaID: firmaID, workerName: "Pupkin", appointments: [], team: team)
            let appointment = Appointment(id: UUID(), userID: UUID(), clientID: client.id, client: client, date: Date(), startTime: Date(), endTime: Date(), worker: worker, fahrzeit: 0)
            provider.worker = worker
            provider.client = client
            provider.date = Date()
            workerName = worker.workerName
            startDate = provider.date
            title = client.clientName
            /// Made repeat
            var index = calendar.component(.weekday, from: startDate)
            if index == 1 {
              index = 7 - 1
            } else {
              index = index - 2
            }
            repeatAppointment[index] = true
            days.days[index].isSelected = true
            print("Index:", repeatAppointment)
            let foo = titleRepeat()
            print(foo)
          }
        }
        .toolbar {
          ToolbarItem(placement: .cancellationAction, content: {
            Button("Abbrechen", action: {
              //            isAddAppoitment = false
              dismiss()
            })
          })
          ToolbarItem(placement: .confirmationAction) {
            Button("Hinzufügen", action: {
              saveItem()
            })
            .disabled(timeToWork == 0 ? true : false )
          }
        }
        .navigationTitle(title)
      }
    }
  }
  func update(start: Date, end: Date){
    // "Wird jede Woche am Dienstag wiedeholt"
    var countRepeat = 0
    repeatingDate.removeAll()
    var components = DateComponents()
    components.timeZone = .current
    let startDay = start.get(.day)
    let startMonth = start.get(.month)
    let startYear = start.get(.year)
    
    components.day = startDay + 1
    components.month = startMonth
    components.year = startYear
    let startDateNew = calendar.date(from: components)!
    
    let endDay = end.get(.day)
    let endMonth = end.get(.month)
    let endYear = end.get(.year)
    
    components.day = endDay
    components.month = endMonth
    components.year = endYear
    let endDateNew = calendar.date(from: components)!

//     let nextDay = calendar.date(byAdding: .day, value: 1, to: startDateNew)!
    let countDay = calendar.dateComponents([.day], from: startDateNew, to: endDateNew).day!
    print("Start Date:", startDateNew)
//                    print("Next Day:", nextDay)
    print("Count Day:", countDay)
    for i in 0..<countDay+1 {
      let newDay = calendar.date(byAdding: .day, value: i, to: startDateNew)!

      let index = calendar.component(.weekday, from: newDay)
      print("index:",index)
      var indexUm: Int = 0
      if index == 1 {
        indexUm = 7
      } else {
        indexUm = index - 1
      }
      print("indexUm:",indexUm)
      if days.days[indexUm - 1].isSelected {
        repeatingDate.append(newDay)
        print("newDay:", newDay, "repeatingAppointment.count",repeatingDate.count)
        countRepeat += 1
      }
    }
  }
  
  func titleRepeat() -> String {
    if isRepeating {
      let foo = repeatingDate.count
      print("repeatingDate.count",foo)
      if foo == 0 {
        return "Wiederhollen"
      } else {
        return "Wiederhollen: \(foo) mal"
      }
    } else {
      return "Wiederhollen"
    }
  }
  
  func updateWorkerListAppointments() {
    print("updateWorkerListAppointments")
    if let worker = provider.worker {
      var resultArray: [DateApoitmentView] = []
      let appointments = worker.appointments
        .filter({$0.date.onlyDate! >= provider.date.onlyDate! } ).sorted(by: {$0.date < $1.date})
      if !appointments.isEmpty, let lastAppoitmentDate = appointments.last?.date{
        
        print(" addAppointment.date: ", provider.date)
        print("lastAppoitmentDate: \(lastAppoitmentDate.description.localized)")
        let numberOfDays = calendar.dateComponents([.day], from: provider.date.onlyDate!, to: lastAppoitmentDate).day! + 1
        
        for i in 0..<numberOfDays {
          let dateIncreasing = calendar.date(byAdding: .day, value: i, to: provider.date.onlyDate!)!
          let day = calendar.component(.day, from: dateIncreasing)
          let index = calendar.component(.weekday, from: dateIncreasing)
          let characterDay = calendar.veryShortWeekdaySymbols[index - 1] // weekdaySymbols[index - 1].first!
          let dateApoitmentView = DateApoitmentView(id: UUID(), date: dateIncreasing.onlyDate!, dayOfWeek: String(characterDay), day: day.description)
          resultArray.append(dateApoitmentView)
        }
        listApoitmentView = resultArray
      }
      if !appointments.isEmpty  {
        for day in appointments {
          print(day.date)
          if let dayIndex = listApoitmentView.firstIndex(where: {$0.date.onlyDate == day.date.onlyDate}) {
            listApoitmentView[dayIndex].appointmens.append(day.createDraggable())
            print("In listApoitmentView[\(dayIndex)].appointmens.append(\(day.date.description))")
          }
        }
      }
    } else {
      print("worker WTF saveItem updateWorkerListAppointments ")
    }
  }
  
  func saveItem() {
    if let client = provider.client {
      if let worker = provider.worker {
        // Start time initialization
        var startTime = Date()
        if isRepeating {
          let newAppointment = Appointment(id: UUID(), userID: UUID(), clientID: client.id, client: client, date: startDate, isFixedTime: isFixedTime, startTime: startTime, endTime: startTime, worker: worker, duration: timeToWork, fahrzeit: fahrZeit)
          modelContext.insert(newAppointment)
          for index in 0..<repeatingDate.count {
            let newAppointment = Appointment(id: UUID(), userID: UUID(), clientID: client.id, client: client, date: repeatingDate[index], isFixedTime: isFixedTime, startTime: startTime, endTime: startTime, worker: worker, duration: timeToWork, fahrzeit: fahrZeit)
            modelContext.insert(newAppointment)
          }
        } else {
          let newAppointment = Appointment(id: UUID(), userID: UUID(), clientID: client.id, client: client, date: startDate, isFixedTime: isFixedTime, startTime: startTime, endTime: startTime, worker: worker, duration: timeToWork, fahrzeit: fahrZeit)
          let actorQueueLabel = DispatchQueue.currentLabel
          print("DispatchQueue modelContext.insert:",actorQueueLabel)
          modelContext.insert(newAppointment)
        }

        isUpdateAppointments = true
        dismiss()
      } else {
        print("worker WTF saveItem AddAppointment2 ")
      }
    } else {
      print("Client WTF saveItem AddAppointment2 ")
    }
  }
}

#Preview {
  @Previewable @StateObject var provider = DataProvider()
  @Previewable @State var isUpdateAppointments = false

  let firmaID = UUID()
  let category = Category(id: UUID(), firmaID: firmaID, clients: [], categoryName: "Preview")
  let client = Client(id: UUID(), firmaID: firmaID, clientName: "Zimmermann", strasse: "Karl-Friedrich-Schinkel-Str", plz: "53127", ort: "Bonn-Ippendorf", houseNumber: "157", latitude: 0, longitude: 0, appointments: [], category: category)
  let team = Team(id: UUID(), firmaID: firmaID, worker: [], teamName: "Team 1")
  var worker = Worker(id: UUID(), firmaID: UUID(), workerName: "Pupkin", appointments: [],team: team)

//  let worker = Worker(id: UUID(), firmaID: firmaID, workerName: "Pupkin", appointments: [], team: team)
  let appointment = Appointment(id: UUID(), userID: UUID(), clientID: client.id, client: client, date: Date(), startTime: Date(), endTime: Date(), worker: worker, fahrzeit: 0)

  AddAppointment(provider: provider, isUpdateAppointments: $isUpdateAppointments)

}

//
//  EditAppointment2.swift
//  Standortbezogene Dienste
//
//  Created by Serhii Karavanskyi on 22.11.24.
//

import SwiftData
import SwiftUI



struct EditAppointment: View {
  
  @Environment(\.modelContext) private var modelContext
  @Environment(\.dismiss) var dismiss
  
  @State var timeToWork: Int = 0
  @State var isFixedTime: Bool = false
  @State private var date = Date.now
  @State private var wakeUp = Date.now
  @State var listApoitmentView: [DateApoitmentView] = []
  @State var workerName: String = ""
  @State var title: String = ""
  @State var isRepeating: Bool = false
  @State var fahrZeit: Int = 0
  @State var endDate: Date = Date.now
  @State var editAppointment: Appointment?
  @State var dateStart: Date = Date.now
  
  @ObservedObject var provider: DataProvider
  @Binding var isEditAppointment: Bool
  @Binding var isUpdateAppointments: Bool
  @State var isViewOnly: Bool = false

  @State var isDays = false
  @StateObject var days = DaysOf()
  @State var repeatingDate: [Date] = []
  var dayOfWeek: String {
    let formatter = DateFormatter()
    formatter.locale = Locale.preferredLocale()
    formatter.dateFormat = "EEEE"
    return formatter.string(from: dateStart)
  }
  
  var body: some View {
    GeometryReader { geometry in
      
      NavigationStack {
        VStack{
          Form {
            Section {
              HStack {
                DatePicker("Datum", selection: $dateStart, in: Date()... , displayedComponents: .date)
                  .disabled(isViewOnly)
                  .environment(\.locale, Locale.init(identifier: String(Locale.preferredLanguages[0].prefix(2))))
                  .onChange(of: dateStart) { oldValue, newValue in
                    update(start: newValue, end: endDate)
                  }
                Text(dayOfWeek)
              }
              if isViewOnly {
                HStack(alignment: .center) {
                  Spacer()
                  Text(timeToWork.timeString)
                  Spacer()
                }
              } else {
                MultiPicker(selection: $timeToWork).frame(height: 100)
                  .id(UUID())
              }
              Toggle(isOn: $isFixedTime, label: {
                Text("feste Zeit")
              })
              .disabled(isViewOnly)
              
              if isFixedTime {
                DatePicker("Bitte geben Sie eine Uhrzeit ein", selection: $wakeUp, displayedComponents: .hourAndMinute)
                  .disabled(isViewOnly)
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
              .disabled(isViewOnly)
              if !isViewOnly {
                Toggle(isOn: $isRepeating, label: {
                  Text("Wiederholen")
                })
              }
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
                DatePicker("Enddatum", selection: $endDate, displayedComponents: .date)
                  .environment(\.locale, Locale.init(identifier: String(Locale.preferredLanguages[0].prefix(2))))
              }
            } // Section
            if isViewOnly,
               let app = provider.appointment,
               !app.reports.isEmpty {
              Section("Bericht"){
                ForEach(app.reports) { report in
                  PhotosRow(photos: report.photos)
                }
              }
            } else {
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
            }
          } // Form
          
        }
        
        .onAppear(){
          if let app = provider.appointment {
            isFixedTime = app.isFixedTime
            title = app.client.clientName
            timeToWork = app.duration
            workerName = app.worker.workerName
            dateStart = app.date
            fahrZeit = app.fahrzeit
            endDate = calendar.date(byAdding: .day, value: 1, to: dateStart)!

            if dateStart.onlyDate! < Date().onlyDate! {
              isViewOnly = true
            }
          }
        }
        .toolbar {
          ToolbarItem(placement: .cancellationAction, content: {
            Button("Abbrechen", action: {
              //            isAddAppoitment = false
              isEditAppointment = false
              dismiss()
            })
          })
          if !isViewOnly {
            ToolbarItem(placement: .confirmationAction) {
              Button("Speichern", action: {
                saveItem()
              })
              .disabled(timeToWork == 0 ? true : false )
            }
          }
        }
        .navigationTitle(title)
      }
    }
  }
  func saveItem() {
    if let app = provider.appointment {
      // Start time initialization
      if isFixedTime {
        //
      }
      app.isFixedTime = isFixedTime
      app.duration = timeToWork
      app.date = dateStart
      app.fahrzeit = fahrZeit
      let actorQueueLabel = DispatchQueue.currentLabel
      print("DispatchQueue modelContext.insert:",actorQueueLabel)
      isUpdateAppointments = true
      dismiss()
    } else {
      print("Client WTF")
    }
  } /// func saveItem()
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

}

#Preview {
//  let client = Client(id: UUID(), firmaID: UUID(), clientName: "Zimmermann", strasse: "Karl-Friedrich-Schinkel-Str", plz: "53127", ort: "Bonn-Ippendorf", houseNumber: "157", latitude: 0, longitude: 0, appointments: [])
  let team1 = Team(id: UUID(), firmaID: UUID(), worker: [], teamName: "Team 1")
  
  let worker = Worker(id: UUID(), firmaID: UUID(), workerName: "Pupkin", appointments: [],team: team1)
  //  AddAppoitment(isAddAppoitment: .constant(true), newAppoitment: .constant(Appoitment(id: UUID(), userID: UUID(), clientID: UUID(), client: client, date: Date(), startTime: Date(), endTime: Date(), worker: worker)), selectedWorker: Binding(projectedValue: worker))
}

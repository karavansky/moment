//
//  DateApoitmentView.swift
//  Standortbezogene Dienste
//
//  Created by Serhii Karavanskyi on 16.11.24.
//
import Foundation

class DateApoitmentView: Hashable, Identifiable {
  let id: UUID
  let date: Date
  let dayOfWeek: String
  let day: String
  var appointmens: [AppointmentDraggable] = []
  init(id: UUID, date: Date, dayOfWeek: String, day: String, appointmens: [AppointmentDraggable] = []) {
    self.id = id
    self.date = date
    self.dayOfWeek = dayOfWeek
    self.day = day
    self.appointmens = appointmens
  }
  func hash(into hasher: inout Hasher) {
      hasher.combine(id)
  }
  static func == (lhs: DateApoitmentView, rhs: DateApoitmentView) -> Bool {
      return lhs.id == rhs.id
  }
}

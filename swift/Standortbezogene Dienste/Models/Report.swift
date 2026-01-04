//
//  Report.swift
//  Standortbezogene Dienste
//
//  Created by Serhii Karavanskyi on 23.11.24.
//

import Foundation
import SwiftData

@Model
final public class Report: ObservableObject {

  @Attribute(.unique)
  public var id: UUID
  var firmaID: UUID
  
  var worker: Worker
  var appointment: Appointment
  
  var photos: String

  init(id: UUID, firmaID: UUID, worker: Worker, photos: String, appointment: Appointment) {
    self.id = id
    self.firmaID = firmaID
    self.worker = worker
    self.photos = photos
    self.appointment = appointment
  }
}

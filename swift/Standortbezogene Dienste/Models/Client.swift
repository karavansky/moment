//
//  Client.swift
//  Standortbezogene Dienste
//
//  Created by Serhii Karavanskyi on 16.11.24.
//

import Foundation
import SwiftData

@Model
final public class Client: ObservableObject {

  @Attribute(.unique)
  public var id: UUID
  var firmaID: UUID
  var clientName: String
  var strasse: String
  var plz: String
  var ort: String
  var houseNumber: String
  var latitude: Double
  var longitude: Double
//  @Relationship(deleteRule: .nullify, inverse: \Appoitment.client)
  @Relationship(deleteRule: .cascade, inverse: \Appointment.client)
  var appointments: [Appointment] = []
  
  var category: Category
  
  init(id: UUID, firmaID: UUID, clientName: String, strasse: String, plz: String, ort: String, houseNumber: String, latitude: Double, longitude: Double, appointments: [Appointment], category: Category) {
    self.id = id
    self.firmaID = firmaID
    self.clientName = clientName
    self.strasse = strasse
    self.houseNumber = houseNumber
    self.plz = plz
    self.latitude = latitude
    self.longitude = longitude
    self.ort = ort
    self.appointments = appointments
    self.category = category
  }
}

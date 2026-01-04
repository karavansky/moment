//
//  User.swift
//  Standortbezogene Dienste
//
//  Created by Serhii Karavanskyi on 16.11.24.
//

import Foundation
import SwiftData

@Model
final public class User: ObservableObject {

  @Attribute(.unique)
  public var id: UUID
  var firmaID: UUID
  var userName: String

  init(id: UUID, firmaID: UUID, userName: String) {
    self.id = id
    self.firmaID = firmaID
    self.userName = userName
  }
}

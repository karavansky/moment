//
//  Token.swift
//  Standortbezogene Dienste
//
//  Created by Serhii Karavanskyi on 16.11.24.
//

import Foundation

final class Token: Codable {
    var id: UUID?
    var value: String
    var user: UserToken? = nil

    init(value: String) {
        self.value = value
    }

//    init(value: String, name: String) {
//        self.value = value
//        self.name = name
//    }
}
struct UserToken: Codable {
    let id: String
}


struct TokenResponse: Codable {
  let value: String
  let user: String
  let isAdmin: Bool
}

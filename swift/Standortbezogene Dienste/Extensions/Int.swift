//
//  Int.swift
//  Standortbezogene Dienste
//
//  Created by Serhii Karavanskyi on 22.11.24.
//

import Foundation

extension Int {

  var timeString: String {
        get {
          let std = Int(self / 60)
          let min = Int(self % 60)
          var result = ""
          if std == 0 {
            result = String(min) + " Minuten"
          } else {
            if std > 1 {
              if min > 0 {
                result = String(std) + " Stunden " + String(min) + " Minuten"
              } else {
                result = String(std) + " Stunden"
              }
            } else if min > 0 {
              result = String(std) + " Stunde " + String(min) + " Minuten"
            } else {
              result = String(std) + " Stunde"
            }
          }
          return result
        }
    }
  var timeStringShort: String {
        get {
          let std = Int(self / 60)
          let min = Int(self % 60)
          var result = ""
          if std == 0 {
            result = String(min) + "'"
          } else {
              if min > 0 {
                result = String(std) + "°" + String(min) + "'"
              } else {
                result = String(std) + "°"
              }
          }
          return result
        }
    }
}

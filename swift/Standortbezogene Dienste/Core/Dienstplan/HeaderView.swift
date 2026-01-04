//
//  Foo.swift
//  Standortbezogene Dienste
//
//  Created by Serhii Karavanskyi on 08.12.24.
//

import SwiftUI

public struct HeaderView: View {
  
  var weekArray: [MockDay]
  @Binding var selectedDay: Date
  
  public var body: some View {
    GeometryReader { geometry in
//      let width = geometry.size.width > 0 ? geometry.size.width/7 - 1 : 0

      HStack(alignment: .center, spacing: 0) {
        ForEach(weekArray) { day in
          VStack(alignment: .center, spacing: 0) {
            if let dayView = day.day {
              if let date = day.date {
                if date.onlyDate == selectedDay.onlyDate {
                  if date.onlyDate == Date().onlyDate {
                    Text(dayView)
                      .font(.headline)
                      .frame(maxHeight: 25)
                      .foregroundStyle(.white)
                      .background {
                        RoundedRectangle(cornerRadius: 5)
                          .fill(Color.red)
                          .frame(width: 25, height: 25)
                      }
                      .padding(.top, 2)
                      .onTapGesture {
//                        print(".onTapGesture HeaderView")
                        selectedDay = date
                      }
                  } else {
                    Text(dayView)
                      .font(.headline)
                      .frame(maxHeight: 25)
                      .foregroundStyle(Color(UIColor.systemBackground))
                      .background {
                        RoundedRectangle(cornerRadius: 5)
                          .fill(Color(UIColor.label))
                          .frame(width: 25, height: 25)
                      }
                      .padding(.top, 2)
                      .onTapGesture {
//                        print(".onTapGesture HeaderView")
                        selectedDay = date
                      }
                  }
                  
                } else {
                  if date.onlyDate == Date().onlyDate {
                    Text("\(dayView)")
                      .font(.headline)
                      .frame(maxHeight: 25)
                      .foregroundStyle(Color.red)
                      .padding(.top, 2)
                      .onTapGesture {
//                        print(".onTapGesture HeaderView")
                        selectedDay = date
                      }
                  } else {
                    Text("\(dayView)")
                      .font(.headline)
                      .frame(maxHeight: 25)
                      .foregroundStyle(Color(UIColor.label))
                      .padding(.top, 2)
                      .onTapGesture {
//                        print(".onTapGesture HeaderView")
                        selectedDay = date
                      }
                  }

                }
              }
//                .frame(width: geometry.size.width/7 , alignment: .center)
            } else {
              Text(" ")
//                .frame(width: geometry.size.width/7 , alignment: .center)
              //              .frame(width: width)
            }
          }
          .frame(width: geometry.size.width/7)
          
        }
      }
//      .frame(width: geometry.size.width/7)
//      .frame(width: geometry.size.width, minHeight: 18,  maxHeight: 18)

    }
  }
  
  func scrollToTap(tapDay: Date?) {
    print("scrollToTap:", tapDay)
    if let date = tapDay {
      selectedDay = date
    }
  }
}

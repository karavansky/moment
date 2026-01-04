//
//  AppointmentView.swift
//  Standortbezogene Dienste
//
//  Created by Serhii Karavanskyi on 09.12.24.
//

import SwiftUI

struct AppointmentView: View {
  
  @State var appointment: Appointment?
 
  @State var startDate: Date

  @Environment(\.dismiss) var dismiss
  
  var body: some View {
    VStack(alignment: .center, spacing: 0)  {
      HStack(spacing: 0) {
        Button {
          dismiss()
        } label: {
          Image(systemName: "xmark.circle.fill")
            .font(.system(size: 30))
            .foregroundStyle(Color(UIColor.label))
            .opacity(0.7)
            .padding(.leading, 20)
        }
        Spacer()
        Button {
          dismiss()
        } label: {
          Image(systemName: "checkmark.circle.fill")
            .font(.system(size: 30))
            .foregroundStyle(Color(UIColor.label))
            .opacity(0.7)
            .padding(.trailing, 20)
        }
      }
      .frame(minHeight: 50, maxHeight: 50, alignment: .top)
      Divider()
      Spacer()
    }
  }
}


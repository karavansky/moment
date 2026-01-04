//
//  BodyView.swift
//  Standortbezogene Dienste
//
//  Created by Serhii Karavanskyi on 08.12.24.
//

import SwiftUI

public struct BodyView: View {
  
  @State var appointments: [Appointment]
  @Namespace var namespace
  
  public var body: some View {
    List {
      ForEach(appointments) { appointment in
        NavigationLink {
          AppointmentView(appointment: appointment, startDate: Date())
            .navigationTransition(.zoom(sourceID: appointment, in: namespace))
            .toolbarVisibility(.hidden, for: .navigationBar)
          
        }
        label: {
          HStack {
            VStack (alignment: .leading){
              Text("\(appointment.worker.workerName)")
            }
            Spacer()
            if let date = appointment.date.onlyDate,
               let currentDate = Date().onlyDate,
               date < currentDate {
              if appointment.isReport {
                Image(systemName: "figure.walk")
                  .symbolRenderingMode(.hierarchical)
                  .foregroundStyle(.green)
                  .font(.system(size: 20))
              } else {
                Image(systemName: "figure.walk")
                  .symbolRenderingMode(.hierarchical)
                  .foregroundStyle(.red)
                  .font(.system(size: 20))
              }
            } else {
              Image(systemName: "figure.walk")
                .symbolRenderingMode(.hierarchical)
                .foregroundStyle(.teal)
                .font(.system(size: 20))
            }
            Spacer()
            VStack (alignment: .trailing){
              Text("\(appointment.client.clientName)")
              Text(appointment.client.strasse + " " + appointment.client.houseNumber)
              .font(.caption2)
              .lineLimit(1)
              Text(appointment.client.plz + " " + appointment.client.ort)
                .frame(alignment: .trailing)
              .font(.caption2)
            }
          }
          .matchedTransitionSource(id: appointment, in: namespace)
        }
        
      }
    }
    .listStyle(.grouped)
  }
}




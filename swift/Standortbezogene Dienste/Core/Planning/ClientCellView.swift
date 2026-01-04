//
//  ClientCellView.swift
//  Standortbezogene Dienste
//
//  Created by Serhii Karavanskyi on 17.11.24.
//

import SwiftUI

struct ClientCellView: View {
    
  @State var client: Client
    let animation = Animation
        .easeOut(duration: 1)
        .delay(0.5)
    @AppStorage("mutterschprache") var mutterschprache: String = ""

    var body: some View {
        HStack {

              VStack(alignment: .leading) {
                  Text(client.clientName)
                    .font(.title2)
                  Text(client.strasse + " " + client.houseNumber)
                  .font(.caption)
                Text(client.plz + " " + client.ort)
                  .font(.caption)

                    
               }
        }
    }
}

struct CircledText: View {

    let text: String
    @State private var radius: CGFloat = .zero

    var body: some View {
        
        return ZStack {
            
            Text(text)
                .padding()
                .background(GeometryReader { proxy in Color.clear.onAppear() { radius = max(proxy.size.width, proxy.size.height) } }.hidden())
                .font(.title2)
            
            if (!radius.isZero) {
                
//                Circle().strokeBorder().frame(width: radius/1.5, height: radius/1.5)
                
            }
            
        }
     
    }
}

#Preview {
//  ClientCellView(client: Client(backingData: <#any BackingData<Client>#>, name: "Test", clientID: UUID()))
}

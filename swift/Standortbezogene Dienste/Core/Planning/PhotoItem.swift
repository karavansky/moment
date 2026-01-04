//
//  PhotoItem.swift
//  Standortbezogene Dienste
//
//  Created by Serhii Karavanskyi on 23.11.24.
//

import SwiftUI

struct PhotoItem: View {
    var photo: String

    var body: some View {
        VStack(alignment: .leading) {
            Image(photo)
                .renderingMode(.original)
                .resizable()
                .frame(width: 155, height: 155)
                .cornerRadius(5)
//            Text(landmark.name)
//                .foregroundStyle(.primary)
//                .font(.caption)
        }
        .padding(.leading, 15)
    }
}

#Preview {
  PhotoItem(photo: "chilkoottrail")
}

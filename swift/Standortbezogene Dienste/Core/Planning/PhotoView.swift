//
//  PhotoView.swift
//  Standortbezogene Dienste
//
//  Created by Serhii Karavanskyi on 23.11.24.
//

import SwiftUI

struct PhotoView: View {
  var photo: String
  @Environment(\.dismiss) var dismiss

  var body: some View {
    Image(photo)
      .resizable()
//      .aspectRatio(contentMode: .fill)
      .scaledToFill()
      .frame(minWidth: 0, maxWidth: .infinity)
      .clipped()
      .overlay(alignment: .topLeading) {
        Button {
          dismiss()
        } label: {
          Image(systemName: "xmark.circle.fill")
            .font(.system(size: 30))
            .foregroundStyle(Color(UIColor.label))
            .opacity(0.7)
            .padding()
            .padding(.top, 10)
        }
      }
      .ignoresSafeArea()
  }
  
}
#Preview {
  let photo = "twinlake"
  PhotoView(photo: photo)
  
}

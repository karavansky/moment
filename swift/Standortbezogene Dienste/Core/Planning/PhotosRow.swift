//
//  PhotosRow.swift
//  Standortbezogene Dienste
//
//  Created by Serhii Karavanskyi on 23.11.24.
//

import SwiftUI

struct PhotosRow: View {
  var photos: String
  @Namespace var namespace

  var body: some View {
    VStack(alignment: .leading) {
      Text("Photos")
        .font(.headline)
        .padding(.leading, 15)
        .padding(.top, 5)
      
      
      ScrollView(.horizontal, showsIndicators: false) {
        HStack(alignment: .top, spacing: 0) {
//          ForEach(photos, id: \.self) { photo in
          
            NavigationLink {
              
              PhotoView(photo: photos)
                .navigationTransition(.zoom(sourceID: photos, in: namespace))
                .toolbarVisibility(.hidden, for: .navigationBar)

              //                            PhotoDetail(photo: photo)
            } label: {
              PhotoItem(photo: photos)
                .matchedTransitionSource(id: photos, in: namespace)

              //                            PhotoItem(photo: photo)
            }
//          }
        }
      }
      .frame(height: 185)
    }
  }
}

#Preview {
  let photos = "twinlake" //, "turtlerock", "chilkoottrail"]
//  PhotosRow(photos: photos)
  
}

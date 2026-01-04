//
//  MultiPickerView.swift
//  Standortbezogene Dienste
//
//  Created by Serhii Karavanskyi on 19.11.24.
//
import SwiftUI

struct MultiPicker: View  {
  
  @Binding var selection: Int
  @State var selectStd: Int
  @State var selectMin: Int
  
  init(selection: Binding<Int>) {
    _selection = selection
    if _selection.wrappedValue != 0 {
      let std = Int(_selection.wrappedValue / 60)
      let min = Int(_selection.wrappedValue % 60)
      let minSelect = Int(min / 5)
      _selectStd = .init(wrappedValue: std)
      _selectMin = .init(wrappedValue: minSelect)
//      print(std," ",min)
    } else {
      _selectStd = .init(wrappedValue: 0)
      _selectMin = .init(wrappedValue: 0)
    }
  }
  
  var body: some View {
    GeometryReader { geometry in
      HStack {
        Picker("Std", selection: self.$selectStd) {
          ForEach(0..<25) { row in
            Text(verbatim: String(row))
              .tag(row)
          }
        }
#if os(iOS)
        .pickerStyle(WheelPickerStyle())
#endif

        .clipped()
        .onChange(of: self.selectStd) { oldValue, newValue in
          print(oldValue," ",newValue)
          selection = newValue * 60 + self.selectMin * 5
          print(selection)
        }
        Text("Std")
        Picker("Min", selection: self.$selectMin) {
          ForEach(0..<12) { row in
            Text(verbatim: String(row*5))
              .tag(row)
          }
        }
#if os(macOS)
        .pickerStyle(PopUpButtonPickerStyle())
#endif
#if os(iOS)
        .pickerStyle(WheelPickerStyle())
#endif
        .clipped()
        .onChange(of: self.selectMin) { oldValue, newValue in
          print(oldValue," ",newValue)
          selection = selectStd * 60 + newValue * 5
          print(selection)
        }
        Text("Min")
      }
      .onAppear(){
      }
    }
  }
}

#Preview {
  @Previewable
  @State var selection: Int = 60 //[String] = [0, 11].map { "\($0)" }
  var data: [(String, [String])] = [
    ("Std", Array(0...24).map { "\($0)" }),
    ("Min", Array(1...11).map { "\($0 * 5)" })
  ]
  
  MultiPicker(selection: $selection)
}

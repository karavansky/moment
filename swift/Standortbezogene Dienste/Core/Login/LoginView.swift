//
//  LoginView.swift
//  Standortbezogene Dienste
//
//  Created by Serhii Karavanskyi on 16.11.24.
//

import SwiftUI
import Foundation
import AuthenticationServices

struct LoginRequest: Encodable {
  let username: String
  let password: String
}
struct LoginResponse: Decodable {
  let data: LoginResponseData
}
struct ErrorResponse: Codable {
  let error: Bool
  let reason: String
}
struct LoginResponseData: Decodable {
  let accessToken: String
  let refreshToken: String
}
extension String {
  var localized: String {
    return NSLocalizedString(self, comment: "")
  }
  func localized(arguments: CVarArg...) -> String {
    return String(format: self.localized, arguments: arguments)
  }
}

struct LoginAction {
  var parameters: LoginRequest
  
  //    func call(completion: @escaping (LoginResponse) -> Void) {
  func call(completion: @escaping (Token) -> Void) {
    
    //        let scheme: String = "https"
    //        let host: String = "34.66.6.50"
    //        let path = "/api/users/login"
    //
    //        var components = URLComponents()
    //        components.scheme = scheme
    //        components.host = host
    //        components.path = path
    //
    //        guard let url = components.url else {
    //            return
    //        }
    //
    //        var request = URLRequest(url: url)
    //        request.httpMethod = "post"
    //
    //        request.addValue("application/json", forHTTPHeaderField: "Content-Type")
    //        request.addValue("application/json", forHTTPHeaderField: "Accept")
    //
    //        do {
    //            request.httpBody = try JSONEncoder().encode(parameters)
    //        } catch {
    //            // Error: Unable to encode request parameters
    //        }
    let path = "\(apiHostname)/api/users/login"
    guard let url = URL(string: path) else {
      fatalError("Failed to convert URL")
    }
    guard
      let loginString = "\(parameters.username):\(parameters.password)"
        .data(using: .utf8)?
        .base64EncodedString()
    else {
      fatalError("Failed to encode credentials")
    }
    
    var loginRequest = URLRequest(url: url)
    loginRequest.addValue("Basic \(loginString)", forHTTPHeaderField: "Authorization")
    loginRequest.httpMethod = "POST"
    
    let task = URLSession.shared.dataTask(with: loginRequest) { data, _, error in
      if let data = data {
        //                let response = try? JSONDecoder().decode(LoginResponse.self, from: data)
        let response = try? JSONDecoder().decode(Token.self, from: data)
        
        if let response = response {
          print(".success")
          
          completion(response)
        } else {
          // Error: Unable to decode response JSON
        }
      } else {
        // Error: API request failed
        
        if let error = error {
          print("Error: \(error.localizedDescription)")
        }
      }
    }
    task.resume()
  }
}
class LoginViewModel: ObservableObject {
  
  @Published var username: String = ""
  @Published var password: String = ""
  
  func login() {
    print("            Auth.shared.loggedIn = true")
    //        Auth().login(username: username, password: password) { result in
    //          switch result {
    //          case .success:
    //              print(".success")
    //              Task {@MainActor in
    //                  AuthModel.shared.loggedIn = true
    //              }
    //          case .failure:
    //              print(".failure")
    //          }
    //        }
    
    //        AuthModel.shared.loggedIn = true
    //        call { token in
    //            // Login successful, navigate to the Home screen
    //            print("token.value:",token.value)
    //            Task {@MainActor in
    //                Auth.shared.loggedIn = true
    //              //  LibraryAPIModel.schared.getAll()
    //            }
    //        }
    //
    //        LoginAction(
    //            parameters: LoginRequest(
    //                username: username,
    //                password: password
    //            )
    //        ).call { _ in
    //            // Login successful, navigate to the Home screen
    //            Task {@MainActor in
    //                    AuthModel.shared.loggedIn = true
    //            }
    //        }
  }
  //    var parameters: LoginRequest
  
  func call() async throws -> Result<Token,ResourceRequestError> {
    let path = "\(apiHostname)/api/users/login"
    guard let url = URL(string: path) else {
      fatalError("Failed to convert URL")
    }
    print("username:", username)
    guard
      let loginString = "\(username):\(password)"
        .data(using: .utf8)?
        .base64EncodedString()
    else {
      fatalError("Failed to encode credentials")
    }
    
    var loginRequest = URLRequest(url: url)
    loginRequest.addValue("Basic \(loginString)", forHTTPHeaderField: "Authorization")
    loginRequest.httpMethod = "POST"
    
    let (data, response) = try await URLSession.shared.data(for: loginRequest)
    guard let httpResponse = response as? HTTPURLResponse, httpResponse.statusCode == 200 else {
      print("Bad response1: \(response)")
      return .failure(.noData)
    }
    do {
      let token = try JSONDecoder().decode(Token.self, from: data)
      Auth().token = token.value
      return .success(token)
    } catch {
      print("Bad response: \(response)")
      return .failure(.noData)
    }
    
  }
}

struct LoginView: View {
  @Environment(\.modelContext) private var modelContext

  @ObservedObject var viewModel: LoginViewModel = LoginViewModel()
  @State private var isLoading: Bool = false
  let coordinator: DataCoordinator
  
  var body: some View {
    VStack {
      Spacer()
      SignInWithAppleButton(.signIn, onRequest: { request in
        print("request.user:",request.user)
      }, onCompletion: { result in
        print(result)
        switch result {
        case .success(let authResults):
          print(authResults)
          guard let credentials = authResults.credential as? ASAuthorizationAppleIDCredential, let identityToken = credentials.identityToken, let identityTokenString = String(data: identityToken, encoding: .utf8) else { return }
          let body = ["appleIdentityToken": identityTokenString]
          guard let jsonData = try? JSONEncoder().encode(body) else { return }
        case .failure(let failure):
          print("ERROR:")
          print(failure.localizedDescription)
        }
      })
      .signInWithAppleButtonStyle(.whiteOutline)
      .frame(width: 280, height: 60, alignment: .center)
//      Spacer()
//      Button(
//        action: {
//          isLoading = true
//          Task {
//            let result = try await call()
//            switch result {
//            case .success(let token):
//              print(token.value)
//              isLoading = false
//            case .failure(let error):
//              isLoading = false
//              print(error)
//            }
//          }
//        },
//        label: {
//          Text("Login".localized)
//            .font(.system(size: 24, weight: .bold, design: .default))
//            .frame(maxWidth: .infinity, maxHeight: 60)
//            .foregroundColor(Color.white)
//            .background(Color.blue)
//            .cornerRadius(10)
//        }
//      )
//      .frame(width: 280, height: 60, alignment: .center)
      Spacer()
      Button(
        action: {
          coordinator.initialize(type: .demo)
//          getAllSampleObjects()
          Auth.shared.isDemo = true
        },
        label: {
          Text("Demo".localized)
            .font(.title2)
            .frame(maxWidth: .infinity, maxHeight: 60)
            .foregroundColor(.secondary)
//            .background(Color.blue)
            .cornerRadius(10)
          
        }
      )
      .frame(width: 280, height: 60, alignment: .center)
    }
    .padding(30)
    if isLoading {
      ProgressView("Loading ...")
        .progressViewStyle(CircularProgressViewStyle(tint: Color.white))
        .controlSize(.extraLarge)
        .padding()
        .background(.black)
        .cornerRadius(15)
    }
  }
  func getAllSampleObjects(){
    do { //           Appointment.self, User.self, Worker.self, Client.self, Team.self, Report.self , Category.self
      try modelContext.container.erase()
//      try modelContext.delete(model: Appointment.self)
//      try modelContext.delete(model: Client.self)
//      try modelContext.delete(model: Worker.self)
//      try modelContext.delete(model: Client.self)
//      try modelContext.delete(model: Team.self)
//      try modelContext.delete(model: Report.self)
//      try modelContext.delete(model: Category.self)
//      try modelContext.delete(model: User.self)
    } catch {
        print("Failed to clear all Country and City data.")
    }
    var calendar = Calendar(identifier: .gregorian)
    calendar.timeZone = .current
    calendar.locale = Locale.preferredLocale() //(identifier: "ru_RU") // Locale.current
    let currentDate = Date()
    let firmaID = UUID()
    let user = User(id: UUID(), firmaID: firmaID, userName: "Warsteiner")
    let team1 = Team(id: UUID(), firmaID: firmaID, worker: [], teamName: "Pflege")
    let team2 = Team(id: UUID(), firmaID: firmaID, worker: [], teamName: "Reinigung")
    let group1 = Category(id: UUID(), firmaID: firmaID, clients: [], categoryName: "VIP")
    let group2 = Category(id: UUID(), firmaID: firmaID, clients: [], categoryName: "Normal")
    let worker_1 = Worker(id: UUID(), firmaID: firmaID, workerName: "Schmidt", appointments: [], team: team1)
    let worker_2 = Worker(id: UUID(), firmaID: firmaID, workerName: "Müller", appointments: [], team: team2)
    let worker_3 = Worker(id: UUID(), firmaID: firmaID, workerName: "Meyer", appointments: [], team: team1)
    let worker_4 = Worker(id: UUID(), firmaID: firmaID, workerName: "Schulz", appointments: [], team: team1)
    let worker_5 = Worker(id: UUID(), firmaID: firmaID, workerName: "Schneider", appointments: [], team: team1)
    let worker_6 = Worker(id: UUID(), firmaID: firmaID, workerName: "Hoffmann", appointments: [], team: team1)
    let worker_7 = Worker(id: UUID(), firmaID: firmaID, workerName: "Becker", appointments: [], team: team1)
    let worker_8 = Worker(id: UUID(), firmaID: firmaID, workerName: "Fischer", appointments: [], team: team1)
    let worker_11 = Worker(id: UUID(), firmaID: firmaID, workerName: "Schmidt", appointments: [], team: team2)
    let worker_21 = Worker(id: UUID(), firmaID: firmaID, workerName: "Müller", appointments: [], team: team2)
    let worker_31 = Worker(id: UUID(), firmaID: firmaID, workerName: "Meyer", appointments: [], team: team2)
    let worker_41 = Worker(id: UUID(), firmaID: firmaID, workerName: "Schulz", appointments: [], team: team2)
    let worker_51 = Worker(id: UUID(), firmaID: firmaID, workerName: "Schneider", appointments: [], team: team2)
    let worker_61 = Worker(id: UUID(), firmaID: firmaID, workerName: "Hoffmann", appointments: [], team: team2)
    let worker_71 = Worker(id: UUID(), firmaID: firmaID, workerName: "Becker", appointments: [], team: team2)
    let worker_81 = Worker(id: UUID(), firmaID: firmaID, workerName: "Fischer", appointments: [], team: team2)
    let client_1 = Client(id: UUID(), firmaID: firmaID, clientName: "Wagner", strasse: "Burgstarsse", plz: "53177", ort: "München", houseNumber: "157", latitude: 0, longitude: 0, appointments: [], category: group1)
    let client_2 = Client(id: UUID(), firmaID: firmaID, clientName: "Zimmermann", strasse: "Karl-Friedrich-Schinkel-Str", plz: "53127", ort: "Bonn-Ippendorf", houseNumber: "157", latitude: 0, longitude: 0, appointments: [], category: group2)
    let appointmentDate_1 = calendar.date(byAdding: .day, value: -1, to: currentDate)!
    let appointmentDate_2 = calendar.date(byAdding: .day, value: -3, to: currentDate)!
    let appointmentDate_3 = calendar.date(byAdding: .day, value: 3, to: currentDate)!
    let appointmentDate_4 = calendar.date(byAdding: .day, value: 4, to: currentDate)!
    let appointmentDate_5 = calendar.date(byAdding: .day, value: -2, to: currentDate)!
    let appointmentDate_6 = calendar.date(byAdding: .day, value: 0, to: currentDate)!
    let appointmentDate_7 = calendar.date(byAdding: .day, value: 1, to: currentDate)!
    let appointmentDate_8 = calendar.date(byAdding: .day, value: 3, to: currentDate)!
    
    let appointment_1 = Appointment(id: UUID(), userID: worker_1.id, clientID: client_1.id, client: client_1, date: appointmentDate_1.onlyDate!, startTime: appointmentDate_1, endTime: calendar.date(byAdding: .hour, value: 1, to: appointmentDate_1)!, worker: worker_1, duration: 90, fahrzeit: 0)
    
    let appointment_2 = Appointment(id: UUID(), userID: worker_2.id, clientID: client_1.id, client: client_1, date: appointmentDate_2.onlyDate!, startTime: appointmentDate_2, endTime: calendar.date(byAdding: .hour, value: 1, to: appointmentDate_2)!, worker: worker_2, duration: 60 , fahrzeit: 0)
    let appointment_3 = Appointment(id: UUID(), userID: worker_3.id, clientID: client_1.id, client: client_1, date: appointmentDate_3.onlyDate!, startTime: appointmentDate_3, endTime: calendar.date(byAdding: .hour, value: 1, to: appointmentDate_3)!, worker: worker_3, duration: 30, fahrzeit: 0)
    let appointment_4 = Appointment(id: UUID(), userID: worker_4.id, clientID: client_1.id, client: client_1, date: appointmentDate_4.onlyDate!, startTime: appointmentDate_4, endTime: calendar.date(byAdding: .hour, value: 1, to: appointmentDate_4)!, worker: worker_4, duration: 30, fahrzeit: 0)
    let appointment_5 = Appointment(id: UUID(), userID: worker_5.id, clientID: client_2.id, client: client_2, date: appointmentDate_5.onlyDate!, startTime: appointmentDate_5, endTime: calendar.date(byAdding: .hour, value: 1, to: appointmentDate_5)!, worker: worker_5, duration: 60, fahrzeit: 0)
    let appointment_6 = Appointment(id: UUID(), userID: worker_6.id, clientID: client_2.id, client: client_2, date: appointmentDate_6.onlyDate!, startTime: appointmentDate_6, endTime: calendar.date(byAdding: .hour, value: 1, to: appointmentDate_6)!, worker: worker_6, duration: 30, fahrzeit: 0)
    let appointment_7 = Appointment(id: UUID(), userID: worker_7.id, clientID: client_2.id, client: client_2, date: appointmentDate_7.onlyDate!, startTime: appointmentDate_7, endTime: calendar.date(byAdding: .hour, value: 1, to: appointmentDate_7)!, worker: worker_7, duration: 30, fahrzeit: 0)
    let appointment_8 = Appointment(id: UUID(), userID: worker_8.id, clientID: client_2.id, client: client_2, date: appointmentDate_8.onlyDate!, startTime: appointmentDate_8, endTime: calendar.date(byAdding: .hour, value: 1, to: appointmentDate_8)!, worker: worker_8, duration: 30, fahrzeit: 0)

    let report1 = Report(id: UUID(), firmaID: firmaID, worker: worker_1, photos: "twinlake", appointment: appointment_1)
    let report2 = Report(id: UUID(), firmaID: firmaID, worker: worker_1, photos: "chilkoottrail", appointment: appointment_1)
//
    appointment_1.reports.append(report1)
    appointment_5.reports.append(report2)
    modelContext.insert(appointment_1)
    modelContext.insert(appointment_2)
    modelContext.insert(appointment_3)
    modelContext.insert(appointment_4)
    modelContext.insert(appointment_5)
    modelContext.insert(appointment_6)
    modelContext.insert(appointment_7)
    modelContext.insert(appointment_8)

    print("Inserted sample data by LoginView")

  }

  func call() async throws -> Result<TokenResponse,ResourceRequestError> {
    let path = "\(apiHostname)/api/users/login"
    guard let url = URL(string: path) else {
      fatalError("Failed to convert URL")
    }
    print("username:", viewModel.username)
    guard
      let loginString = "\(viewModel.username):\(viewModel.password)"
        .data(using: .utf8)?
        .base64EncodedString()
    else {
      fatalError("Failed to encode credentials")
    }
    
    var loginRequest = URLRequest(url: url)
    loginRequest.addValue("Basic \(loginString)", forHTTPHeaderField: "Authorization")
    loginRequest.httpMethod = "POST"
    
    let (data, response) = try await URLSession.shared.data(for: loginRequest)
    guard let httpResponse = response as? HTTPURLResponse, httpResponse.statusCode == 200 else {
      print("Bad response1: \(response)")
      
      return .failure(.noData)
    }
    if let JSONString = String(data: data, encoding: String.Encoding.utf8) {
      print("JSONString:",JSONString)
    }
    do {
      let token = try JSONDecoder().decode(TokenResponse.self, from: data)
      Auth.shared.loggedIn = true
      Auth.shared.user = token.user
      Auth.shared.isAdmin = token.isAdmin
      //            print("userID:", token.user)
      //            print("userID:", token.isAdmin)
      //            Auth.shared.userID = UUID(uuidString: userID)
      Auth().token = token.value
      return .success(token)
    } catch {
      print("Bad response2: \(response)")
      
      return .failure(.noData)
    }
    
  }
}

struct LoginScreen_Previews: PreviewProvider {
  static var previews: some View {
    LoginView(coordinator: DataCoordinator.shared)
  }
}

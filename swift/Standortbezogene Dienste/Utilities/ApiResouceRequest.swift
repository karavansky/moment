//
//  ApiResouceRequest.swift
//  Standortbezogene Dienste
//
//  Created by Serhii Karavanskyi on 16.11.24.
//

import Foundation

let apiHostname = "https://34.66.6.50"

struct ApiResourceRequest<ResourceType> where ResourceType: Codable {
  let baseURL = "\(apiHostname)/api/"
  let resourceURL: URL
  
  init(resourcePath: String) {
    guard let resourceURL = URL(string: baseURL) else {
      fatalError("Failed to convert baseURL to a URL")
    }
    self.resourceURL =
    resourceURL.appendingPathComponent(resourcePath)
  }
  
  func getAll() async throws ->  Result<[ResourceType], ResourceRequestError> {
    guard let token = Auth().token else {
      Auth().logout()
      return .failure(.decodingError)
    }
    var urlRequest = URLRequest(url: resourceURL)
    urlRequest.httpMethod = "GET"
    urlRequest.addValue("application/json", forHTTPHeaderField: "Content-Type")
    urlRequest.addValue("Bearer \(token)", forHTTPHeaderField: "Authorization")
    let (data, _) = try await URLSession.shared.data(for: urlRequest)
    do {
      let resources = try JSONDecoder().decode([ResourceType].self, from: data)
      return .success(resources)
    } catch {
      return .failure(.decodingError)
    }
  }
  
  func save<CreateType>(_ saveData: CreateType)  async throws -> Result<ResourceType, ResourceRequestError> where CreateType: Codable {
    guard let token = Auth().token else {
      Auth().logout()
      print("Keine Authorization !!!")
      return .failure(.noData)
    }
    
    var request = URLRequest(url: resourceURL)
    
    request.httpMethod = "POST"
    request.addValue("application/json", forHTTPHeaderField: "Content-Type")
    request.addValue("Bearer \(token)", forHTTPHeaderField: "Authorization")
    request.httpBody = try JSONEncoder().encode(saveData)
    let (data, response) = try await URLSession.shared.data(for: request)
    guard let httpResponse = response as? HTTPURLResponse else {
      return .failure(.noData)
    }
    if httpResponse.statusCode == 200 {
      do {
        let resource = try JSONDecoder().decode(ResourceType.self, from: data)
        return .success(resource)
      } catch {
        return .failure(.decodingError)
      }
    }
    else {
      if httpResponse.statusCode == 401 {
        Auth().logout()
      }
      return .failure(.noData)
    }
  }
  func update<CreateType>(_ saveData: CreateType, idCloud: String)  async throws -> Result<ResourceType, ResourceRequestError> where CreateType: Codable {
    guard let token = Auth().token else {
      Auth().logout()
      print("Keine Authorization !!!")
      return .failure(.noData)
    }
    let url = resourceURL
      .appendingPathComponent(idCloud)
    var request = URLRequest(url: url)
    
    request.httpMethod = "PUT"
    request.addValue("application/json", forHTTPHeaderField: "Content-Type")
    request.addValue("Bearer \(token)", forHTTPHeaderField: "Authorization")
    request.httpBody = try JSONEncoder().encode(saveData)
    let (data, response) = try await URLSession.shared.data(for: request)
    guard let httpResponse = response as? HTTPURLResponse else {
      return .failure(.noData)
    }
    if httpResponse.statusCode == 200 {
      do {
        let resource = try JSONDecoder().decode(ResourceType.self, from: data)
        return .success(resource)
      } catch {
        return .failure(.decodingError)
      }
    }
    else {
      if httpResponse.statusCode == 401 {
        Auth().logout()
      }
      return .failure(.noData)
    }
  }
}

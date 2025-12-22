import fetch from "node-fetch";
import {
  OuraApiResponse,
  DailyActivity,
  DailyReadiness,
  DailySleep,
  DailyStress,
  SleepSession,
  HeartRate,
  EnhancedTag,
} from "./interfaces";

// Oura service class
export class OuraService {
    private token: string;
    private baseUrl: string = "https://api.ouraring.com/v2/usercollection";
  
    constructor(token: string) {
      this.token = token;
    }
  
    private async fetchData<T>(
      endpoint: string,
      params: Record<string, string> = {}
    ): Promise<OuraApiResponse<T>> {
      const myHeaders = new Headers();
      myHeaders.append("Authorization", `Bearer ${this.token}`);
  
      // Build URL with query parameters
      const url = new URL(`${this.baseUrl}/${endpoint}`);
      Object.entries(params).forEach(([key, value]) => {
        url.searchParams.append(key, value);
      });
  
      const requestOptions = {
        method: "GET",
        headers: myHeaders,
      };
  
      try {
        const response = await fetch(url.toString(), requestOptions);
  
        if (!response.ok) {
          throw new Error(
            `API request failed with status ${
              response.status
            }: ${await response.text()}`
          );
        }
  
        return (await response.json()) as OuraApiResponse<T>;
      } catch (error) {
        console.error("Error fetching data from Oura API:", error);
        throw error;
      }
    }
  
    async getDailyActivity(
      startDate: string,
      endDate: string
    ): Promise<OuraApiResponse<DailyActivity>> {
      return this.fetchData<DailyActivity>("daily_activity", {
        start_date: startDate,
        end_date: endDate,
      });
    }
  
    async getDailyReadiness(
      startDate: string,
      endDate: string
    ): Promise<OuraApiResponse<DailyReadiness>> {
      return this.fetchData<DailyReadiness>("daily_readiness", {
        start_date: startDate,
        end_date: endDate,
      });
    }
  
    async getDailySleep(
      startDate: string,
      endDate: string
    ): Promise<OuraApiResponse<DailySleep>> {
      return this.fetchData<DailySleep>("daily_sleep", {
        start_date: startDate,
        end_date: endDate,
      });
    }
  
    async getDailyStress(
      startDate: string,
      endDate: string
    ): Promise<OuraApiResponse<DailyStress>> {
      return this.fetchData<DailyStress>("daily_stress", {
        start_date: startDate,
        end_date: endDate,
      });
    }
  
    async getHeartRate(
      startDateTime: string,
      endDateTime: string
    ): Promise<OuraApiResponse<HeartRate>> {
      return this.fetchData<HeartRate>("heartrate", {
        start_datetime: startDateTime,
        end_datetime: endDateTime,
      });
    }
  
    async getTags(
      startDate: string,
      endDate: string
    ): Promise<OuraApiResponse<EnhancedTag>> {
      return this.fetchData<EnhancedTag>("enhanced_tag", {
        start_date: startDate,
        end_date: endDate,
      });
    }
  
    async getSleep(
      startDate: string,
      endDate: string
    ): Promise<OuraApiResponse<SleepSession>> {
      return this.fetchData<SleepSession>("sleep", {
        start_date: startDate,
        end_date: endDate,
      });
    }
  }
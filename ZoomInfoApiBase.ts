import axios, { AxiosInstance, AxiosResponse } from 'axios';

export class ZoomInfoApiBase {
  private apiUrl: string = 'https://api.zoominfo.com';
  private token: string | null = null;
  private client: AxiosInstance;
  private tokenExpiry: number = 0; // To store the token expiration time
  private username: string;
  private password: string;
  private maxResults: number = 1000; // Default max results per request
  private fetchAllRecords: boolean = true; // Fetch all records

  constructor() {
    this.username = process.env.ZOOMINFO_USERNAME || '';
    this.password = process.env.ZOOMINFO_PASSWORD || '';
    this.client = axios.create({
      baseURL: this.apiUrl,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  // Authenticate and get JWT token
  private async authenticate(): Promise<void> {
    if (this.token && new Date().getTime() < this.tokenExpiry) {
      // If token exists and is not expired (with a 5-minute buffer), return it
      return;
    }

    try {
      //console.log('Authenticating with ZoomInfo API...');
      await new Promise((resolve) => setTimeout(resolve, 1000));
      const response: AxiosResponse = await this.client.post('/authenticate', {
        username: this.username,
        password: this.password,
      });

      this.token = response.data.jwt;

      // 55 mins from now
      const tokenExpiryDate = new Date();
      tokenExpiryDate.setMinutes(tokenExpiryDate.getMinutes() + 55);

      this.tokenExpiry = tokenExpiryDate.getTime();
    } catch (error: any) {
      console.error('Authentication failed:', error?.response?.data || error);
      throw new Error('Failed to authenticate with ZoomInfo API');
    }
  }

  // Method to make authenticated GET requests
  protected async get(endpoint: string, params: object = {}): Promise<any> {
    await this.authenticate();
    try {
      await new Promise((resolve) => setTimeout(resolve, 1000));

      const response: AxiosResponse = await this.client.get(endpoint, {
        headers: { Authorization: `Bearer ${this.token}` },
        params,
      });
      return response.data;
    } catch (error) {
      this.handleError(error);
    }
  }

  // Method to make authenticated POST requests with pagination
  protected async fetchPagedData(endpoint: string, payload: object = {}): Promise<any[]> {
    await this.authenticate();

    let allData: any[] = [];
    let currentPage = 1;
    let totalResults = 0;

    do {
      // Add pagination info to the payload
      const pagedPayload = { ...payload, page: currentPage };

      try {
        await new Promise((resolve) => setTimeout(resolve, 1000)); // Delay to avoid rate limiting

        // Make the POST request
        const response: AxiosResponse = await this.client.post(endpoint, pagedPayload, {
          headers: { Authorization: `Bearer ${this.token}` },
        });

        const responseObject = response.data;

        // If maxResults and totalResults exist, set them
        if (responseObject.maxResults) this.maxResults = responseObject.maxResults;
        if (responseObject.totalResults) totalResults = responseObject.totalResults;

        // Push data to allData array
        const responseData = responseObject.data || [];
        if (Array.isArray(responseData)) {
          allData.push(...responseData);
        } else {
          allData.push(responseData);
        }

        currentPage++;
      } catch (error) {
        this.handleError(error);
        break; // Exit loop on error
      }
    } while (this.fetchAllRecords && allData.length < this.maxResults);

    return allData;
  }

  // Method to make authenticated POST requests
  protected async post(endpoint: string, data: object = {}): Promise<any> {
    await this.authenticate();
    try {
      await new Promise((resolve) => setTimeout(resolve, 1000));

      const response: AxiosResponse = await this.client.post(endpoint, data, {
        headers: { Authorization: `Bearer ${this.token}` },
      });
      return response.data;
    } catch (error) {
      this.handleError(error);
    }
  }

  // Error handling method
  private handleError(error: any): void {
    const status = error?.response?.status;
    const message = error?.response?.data?.message || error.message;

    switch (status) {
      case 400:
        console.error(`Bad Request: ${message}`);
        break;
      case 401:
        console.error('Unauthorized: Invalid credentials or token expired.');
        this.token = null; // Reset token if unauthorized
        break;
      case 403:
        console.error('Forbidden: Access denied.');
        break;
      case 429:
        console.error('Rate limit exceeded. Please try again later.');
        break;
      case 500:
        console.error('Server error. Please contact ZoomInfo support.');
        break;
      default:
        console.error(`Error (${status}): ${message}`);
    }

    throw new Error(`Request failed with status ${status}`);
  }
}

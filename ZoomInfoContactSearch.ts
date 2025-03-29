import { ZoomInfoApiBase } from './ZoomInfoApiBase.js';
import type EnrichContactParams from '../types/EnrichContactParms.js';

export default class ZoomInfoContactSearch extends ZoomInfoApiBase {
  inputFields: object[];
  outputFields: string[];
  constructor() {
    super(); // Call parent constructor to initialize apiKey and apiUrl
    this.inputFields = [{}];
    this.outputFields = [];
  }

  async run() {
    try {
      /*
      // Validate input params
      if (!params.personId && !params.emailAddress && !params.hashedEmail && !params.phone) {
        if (!params.fullName && (!params.firstName || !params.lastName)) {
          throw new Error('At least one identifier (email, personId, phone, fullName) is required.');
        }
        if (!params.companyId && !params.companyName) {
          throw new Error('Either companyId or companyName must be provided.');
        }
      }
        */

      const params = {
        matchPersonInput: this.inputFields,
        outputFields: this.outputFields,
      } as EnrichContactParams;

      // Make the API request using the inherited post method
      const response = await this.post('/search/contact', params);

      return response?.data?.result[0]?.data[0];
    } catch (error: any) {
      console.error('Error during ZoomInfoContactSearch.run:', error.response?.data || error.message);
      //throw error;
    }
  }
}

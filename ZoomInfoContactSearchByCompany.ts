import { ZoomInfoApiBase } from './ZoomInfoApiBase.js';
import type EnrichContactParams from '../types/EnrichContactParms.js';
import ZoomInfoContactSearch from './ZoomInfoContactSearch.js';
import ZiApiContact from '../types/ZiApiContact.js';

export default class ZoomInfoContactSearchByCompany extends ZoomInfoContactSearch {
  companyName: string;
  jobTitleKeyword: string = '';
  constructor(companyName: string) {
    super(); // Call parent constructor to initialize apiKey and apiUrl
    this.companyName = companyName;
  }

  async run(): Promise<ZiApiContact[]> {
    if (this.jobTitleKeyword === '') {
      console.error('Job title not set. Please set the job title before running the search.');
      return [] as ZiApiContact[];
    }
    try {
      const params = {
        jobTitle: this.jobTitleKeyword,
        companyName: this.companyName,
        requiredFields: 'email',
        rpp: 100,
      } as any;

      // Make the API request using the inherited post method
      //const response = await this.post('/search/contact', params);
      const response = (await this.fetchPagedData('/search/contact', params)) as ZiApiContact[];

      return response;
    } catch (error: any) {
      console.error('Error during ZoomInfoContactSearchByCompany.run:', error.response?.data || error.message);
      return [] as ZiApiContact[];
      //throw error;
    }
  }
}

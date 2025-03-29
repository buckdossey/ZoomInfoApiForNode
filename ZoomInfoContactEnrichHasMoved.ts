import ZoomInfoContactEnrich from './ZoomInfoContactEnrich.js';

export default class ZoomInfoContactEnrichHasMoved extends ZoomInfoContactEnrich {
  ziContactId: string;
  constructor() {
    super();

    this.ziContactId = '-1';
    this.outputFields = ['email', 'companyId', 'companyWebsite', 'personHasMoved', 'jobTitle'];
  }

  setContactId(ziContactId: string) {
    this.ziContactId = ziContactId;
    this.inputFields = [
      {
        personId: ziContactId,
      },
    ];
  }
}
